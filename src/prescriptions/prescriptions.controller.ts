import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { CurrentUser, JwtPayload } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Prescriptions')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload prescription with optional extracted medicines' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List saved prescriptions' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription with medicines' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prescriptionsService.findOne(user.sub, id);
  }
}
