import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { Public, CurrentUser, JwtPayload } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List doctors' })
  findAll(@Query('search') search?: string, @Query('category') category?: string) {
    return this.doctorsService.findAll(search, category);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Doctor detail' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Book consultation' })
  book(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      doctorId: string;
      scheduledDate: string;
      timeSlot: string;
      durationMin?: number;
      paymentMethod?: string;
    },
  ) {
    return this.doctorsService.bookAppointment(user.sub, body);
  }
}
