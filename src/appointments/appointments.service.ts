import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { AgoraService } from '../agora/agora.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private agora: AgoraService,
  ) {}

  async findMine(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async findOne(patientId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, patientId },
      include: {
        doctor: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async updateStatus(patientId: string, id: string, status: string) {
    await this.findOne(patientId, id);
    return this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
  }

  async getAgoraToken(patientId: string, id: string) {
    const appt = await this.findOne(patientId, id);
    if (!appt.agoraChannel) {
      throw new NotFoundException('Video channel not ready for this appointment');
    }
    return this.agora.buildRtcToken(appt.agoraChannel);
  }

  async book(
    patientId: string,
    body: {
      doctorId: string;
      scheduledDate: string;
      timeSlot: string;
      durationMin?: number;
      paymentMethod?: string;
    },
  ) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: body.doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

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
