import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GenerateGeminiJsonDto } from './dto/gemini.dto';
import { GeminiService } from './gemini.service';

@ApiTags('Gemini')
@Controller('gemini')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class GeminiController {
  constructor(private geminiService: GeminiService) {}

  @Post('generate-json')
  @ApiOperation({
    summary: 'Run a Gemini JSON-mode request (server-side API key)',
  })
  generateJson(@Body() dto: GenerateGeminiJsonDto) {
    return this.geminiService.generateJson(dto);
  }
}
