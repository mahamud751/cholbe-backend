import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreateMedicationScheduleDto } from './dto/medication-schedule.dto';

@Injectable()
export class MedicationSchedulesService {
  constructor(private prisma: PrismaService) {}

  create(patientId: string, dto: CreateMedicationScheduleDto) {
    return this.prisma.medicationSchedule.create({
      data: {
        patientId,
        medicineName: dto.medicineName,
        dose: dto.dose,
        instruction: dto.instruction,
        mealTiming: dto.mealTiming,
        times: dto.times ?? [],
      },
    });
  }

  findAll(patientId: string) {
    return this.prisma.medicationSchedule.findMany({
      where: { patientId, isActive: true },
      include: { logs: { orderBy: { loggedAt: 'desc' }, take: 10 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logDose(
    patientId: string,
    scheduleId: string,
    status: 'taken' | 'missed' | 'snoozed',
    snoozeMinutes = 10,
  ) {
    const schedule = await this.prisma.medicationSchedule.findFirst({
      where: { id: scheduleId, patientId },
    });
    if (!schedule) throw new NotFoundException('Medication schedule not found');

    const snoozeUntil =
      status === 'snoozed'
        ? new Date(Date.now() + snoozeMinutes * 60000)
        : undefined;

    return this.prisma.medicationLog.create({
      data: { scheduleId, status, snoozeUntil },
    });
  }

  async update(patientId: string, scheduleId: string, data: { isActive?: boolean }) {
    const schedule = await this.prisma.medicationSchedule.findFirst({
      where: { id: scheduleId, patientId },
    });
    if (!schedule) throw new NotFoundException('Medication schedule not found');
    return this.prisma.medicationSchedule.update({
      where: { id: scheduleId },
      data,
    });
  }
}
