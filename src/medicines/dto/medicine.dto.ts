import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MedicineSource, MedicineStatus } from '@prisma/client';

export class MedicineInfoBlockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bullet?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bold?: boolean;
}

export class MedicineInfoSectionDto {
  @ApiProperty({ example: 'Indications' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ type: [MedicineInfoBlockDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicineInfoBlockDto)
  blocks!: MedicineInfoBlockDto[];
}

export class CreateMedicineDto {
  @ApiProperty({ example: 'Aamdocal Plus 50' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Amlodipine' })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Square' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional()
  @IsString()
  medicineType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [MedicineInfoSectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicineInfoSectionDto)
  infoSections?: MedicineInfoSectionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;
}

export class UpdateMedicineDto extends CreateMedicineDto {
  @ApiPropertyOptional({ enum: MedicineStatus })
  @IsOptional()
  @IsEnum(MedicineStatus)
  status?: MedicineStatus;
}

export class MedicineQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MedicineSource })
  @IsOptional()
  @IsEnum(MedicineSource)
  source?: MedicineSource;

  @ApiPropertyOptional({ enum: MedicineStatus })
  @IsOptional()
  @IsEnum(MedicineStatus)
  status?: MedicineStatus;
}
