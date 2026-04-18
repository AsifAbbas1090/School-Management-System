/**
 * Token lifecycle (JWT)
 * ----------------------
 * Access token:
 *   - TTL: JWT_ACCESS_EXPIRES_IN (default: 15m) — see JwtModule + login/refresh sign options.
 *   - Payload: sub, email, role, schoolId (SUPER_ADMIN → schoolId null in token).
 * Refresh token:
 *   - TTL: JWT_REFRESH_EXPIRES_IN (default: 7d) — set only on login (and optional rotation elsewhere).
 *   - Same payload shape as access; verified with JWT_SECRET to issue a new access token.
 *
 * Frontend storage (SPA):
 *   - localStorage key: "auth-storage" (Zustand persist).
 *   - Paths: state.user.accessToken, state.user.refreshToken (legacy: root user.* may exist).
 *
 * Auth & school context:
 * SUPER_ADMIN has schoolId=null in the JWT. For @SchoolContext(), callers must pass schoolId in
 * query/body when acting on a specific school. Missing schoolId → 400 from SchoolContext decorator.
 */
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password, schoolId } = loginDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { School: true },
      });

      if (!user) {
        console.error(`[AUTH] Login failed: User not found for email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.error(`[AUTH] Login failed: Invalid password for email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      if (schoolId && schoolId !== null && schoolId !== 'null') {
        if (user.role === UserRole.SUPER_ADMIN) {
          throw new BadRequestException('Super admin cannot login with school context');
        }
        if (!user.schoolId || user.schoolId !== schoolId) {
          throw new UnauthorizedException('User does not belong to this school');
        }
      } else {
        if (user.role !== UserRole.SUPER_ADMIN && !user.schoolId) {
          throw new BadRequestException('School context required for this user');
        }
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      const { password: _, ...userWithoutPassword } = user;

      return {
        accessToken,
        refreshToken,
        user: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          name: userWithoutPassword.name,
          role: userWithoutPassword.role,
          status: userWithoutPassword.status,
          phone: userWithoutPassword.phone,
          avatarUrl: userWithoutPassword.avatarUrl,
          schoolId: userWithoutPassword.schoolId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Login error:', error);
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  /**
   * Exchange a valid refresh token for a new access token (same user, re-validated in DB).
   */
  async refresh(refreshToken: string) {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token required');
    }

    try {
      const decoded = this.jwtService.verify<{ sub: string; email: string; role: UserRole; schoolId: string | null }>(
        refreshToken,
      );
      const user = await this.validateUser(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('User no longer valid');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      return { accessToken };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      console.error('[AUTH] Refresh error:', err);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { School: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
