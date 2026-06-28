import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsultationType, PaymentMethod } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { AgoraService } from '../agora/agora.service';
import { DoctorAvailabilityService } from '../doctors/doctor-availability.service';
import { endOfDay, startOfDay } from '../common/utils/availability.util';

function normalizePaymentMethod(value?: string): PaymentMethod | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if ((Object.values(PaymentMethod) as string[]).includes(upper)) {
    return upper as PaymentMethod;
  }
  return undefined;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private agora: AgoraService,
    private availability: DoctorAvailabilityService,
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
      consultationType?: ConsultationType;
    },
  ) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: body.doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const dateOnly = body.scheduledDate.slice(0, 10);
    const { available, slots } = await this.availability.getSlotsForDate(body.doctorId, dateOnly);
    if (!available || !slots.includes(body.timeSlot)) {
      throw new BadRequestException('Selected time slot is not available');
    }

    const dayStart = startOfDay(new Date(dateOnly));
    const dayEnd = endOfDay(new Date(dateOnly));
    const duplicate = await this.prisma.appointment.findFirst({
      where: {
        doctorId: body.doctorId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        timeSlot: body.timeSlot,
        status: { notIn: ['cancelled', 'CANCELLED', 'no_show', 'NO_SHOW'] },
      },
    });
    if (duplicate) throw new ConflictException('Time slot already booked');

    const scheduledDate = new Date(`${dateOnly}T12:00:00.000Z`);
    const consultationType = body.consultationType ?? ConsultationType.VIDEO;
    const channel =
      consultationType === ConsultationType.CHAT
        ? null
        : `cholbe_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    return this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: doctor.id,
        scheduledDate,
        timeSlot: body.timeSlot,
        durationMin: body.durationMin ?? 15,
        fee: doctor.fee,
        paymentMethod: normalizePaymentMethod(body.paymentMethod),
        agoraChannel: channel,
        consultationType,
        status: 'scheduled',
      },
      include: {
        doctor: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
      },
    });
  }
}
