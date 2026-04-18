import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';
import { IsNumber, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  // Explicitly redeclare monthlyFee to ensure validation decorators are properly applied
  @ApiPropertyOptional({ example: 5000, description: 'Monthly fee amount for this student' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyFee?: number;

  @ApiPropertyOptional({ example: 0, description: 'Opening pending dues carried from before enrollment' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pendingDues?: number;
}
