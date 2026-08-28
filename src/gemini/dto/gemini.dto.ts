import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class GenerateGeminiJsonDto {
  @ApiProperty({ description: 'System instruction for the model' })
  @IsString()
  @IsNotEmpty()
  systemInstruction!: string;

  @ApiProperty({
    description: 'User parts — text and/or inline image data',
    type: 'array',
  })
  @IsArray()
  parts!: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;

  @ApiProperty({ description: 'Gemini response schema object' })
  @IsObject()
  responseSchema!: Record<string, unknown>;
}
