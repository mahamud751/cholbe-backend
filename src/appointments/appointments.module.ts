import { Module } from '@nestjs/common';
import { AgoraModule } from '../agora/agora.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [AgoraModule, DoctorsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
