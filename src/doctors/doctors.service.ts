import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, category?: string) {
    return this.prisma.doctorProfile.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { user: { fullName: { contains: search, mode: 'insensitive' } } },
                { specialty: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(category ? { categories: { has: category } } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async bookAppointment(
    patientId: string,
    body: {
      doctorId: string;
      scheduledDate: string;
      timeSlot: string;
      durationMin?: number;
      paymentMethod?: string;
    },
  ) {
    const doctor = await this.findOne(body.doctorId);
    const { randomUUID } = await import('crypto');
    const channel = `cholbe_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: doctor.id,
        scheduledDate: new Date(body.scheduledDate),
        timeSlot: body.timeSlot,
        durationMin: body.durationMin ?? 15,
        fee: doctor.fee,
        paymentMethod: body.paymentMethod as never,
        agoraChannel: channel,
        status: 'scheduled',
      },
      include: {
        doctor: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
      },
    });
  }
}
