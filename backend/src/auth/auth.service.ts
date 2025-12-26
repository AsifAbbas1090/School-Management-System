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
      // Find user by email
      console.log(`[AUTH] Attempting login for email: ${email}`);
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { School: true },
      });

      if (!user) {
        console.error(`[AUTH] Login failed: User not found for email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      
      console.log(`[AUTH] User found: ${user.email}, role: ${user.role}, status: ${user.status}`);

      // Verify password
      console.log(`[AUTH] Verifying password for user: ${user.email}`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.error(`[AUTH] Login failed: Invalid password for email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      console.log(`[AUTH] Password verified successfully for user: ${user.email}`);

      // Check user status
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      // If schoolId provided, verify user belongs to that school
      // Handle null/undefined explicitly
      if (schoolId && schoolId !== null && schoolId !== 'null') {
        if (user.role === UserRole.SUPER_ADMIN) {
          throw new BadRequestException('Super admin cannot login with school context');
        }
        if (!user.schoolId || user.schoolId !== schoolId) {
          throw new UnauthorizedException('User does not belong to this school');
        }
      } else {
        // If no schoolId provided, super_admin can login, but others must have schoolId
        if (user.role !== UserRole.SUPER_ADMIN && !user.schoolId) {
          throw new BadRequestException('School context required for this user');
        }
      }

      // Generate tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      };

      console.log('[AUTH] Generating tokens for user:', user.email);
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      console.log('[AUTH] Tokens generated successfully for user:', user.email);

      // Return user data (excluding password)
      const { password: _, ...userWithoutPassword } = user;

      const response = {
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

      console.log('[AUTH] Returning response for user:', user.email);
      return response;
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      // Log unexpected errors and throw generic message
      console.error('Login error:', error);
      throw new UnauthorizedException('Login failed. Please try again.');
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

