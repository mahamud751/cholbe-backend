import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { DoctorAvailabilityService } from './doctor-availability.service';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorAvailabilityService],
  exports: [DoctorsService, DoctorAvailabilityService],
})
export class DoctorsModule {}
