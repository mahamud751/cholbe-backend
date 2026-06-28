import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PrescriptionMedicineDto {
  @ApiProperty({ example: 'Thyrox 50mg' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '1 tablet' })
  @IsOptional()
  @IsString()
  dose?: string;

  @ApiPropertyOptional({ example: 'After meal' })
  @IsOptional()
  @IsString()
  instruction?: string;

  @ApiPropertyOptional({ example: 'Breakfast' })
  @IsOptional()
  @IsString()
  mealTiming?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ description: 'URL from POST /uploads/prescription' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 'camera' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ type: [PrescriptionMedicineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionMedicineDto)
  medicines?: PrescriptionMedicineDto[];
}
