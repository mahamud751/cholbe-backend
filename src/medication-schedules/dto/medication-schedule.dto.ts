import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMedicationScheduleDto {
  @ApiProperty({ example: 'Amlodipine' })
  @IsString()
  @IsNotEmpty()
  medicineName!: string;

  @ApiPropertyOptional({ example: '1 tablet' })
  @IsOptional()
  @IsString()
  dose?: string;

  @ApiPropertyOptional({ example: 'After meal' })
  @IsOptional()
  @IsString()
  instruction?: string;

  @ApiPropertyOptional({ example: 'after' })
  @IsOptional()
  @IsString()
  mealTiming?: string;

  @ApiPropertyOptional({ type: [String], example: ['08:30 AM'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  times?: string[];
}
