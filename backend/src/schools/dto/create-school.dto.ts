import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail, IsUrl, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Al-Abbas College' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Dr. John Principal' })
  @IsString()
  @IsOptional()
  principalName?: string;

  @ApiPropertyOptional({ example: 'School Owner Name' })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiProperty({ example: 50000, description: 'Monthly subscription amount in PKR' })
  @IsNumber()
  @Min(0)
  subscriptionAmount: number;

  @ApiPropertyOptional({ example: '123 Main Street, Lahore' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@school.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'https://www.school.com' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/logo.png', description: 'Logo URL (for future file upload)' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Subscription start date (optional, defaults to today)' })
  @IsDateString()
  @IsOptional()
  subscriptionStartDate?: string;

  @ApiPropertyOptional({ example: 'admin@school.com', description: 'Admin email for initial admin user (optional)' })
  @IsEmail()
  @IsOptional()
  adminEmail?: string;

  @ApiPropertyOptional({ example: 'admin123', description: 'Admin password for initial admin user (optional)' })
  @IsString()
  @IsOptional()
  adminPassword?: string;
}


