import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

function parseTimeToday(timeStr: string): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function minutesUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 60000));
}

@Injectable()
export class PatientHomeService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: { include: { familyMembers: true } },
        addresses: { where: { isDefault: true }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      schedules,
      todayLogs,
      vitals,
      unreadNotifications,
      relatedProducts,
      nextAppointment,
    ] = await Promise.all([
      this.prisma.medicationSchedule.findMany({
        where: { patientId: userId, isActive: true },
        include: { logs: { where: { loggedAt: { gte: startOfDay, lte: endOfDay } } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.medicationLog.findMany({
        where: {
          loggedAt: { gte: startOfDay, lte: endOfDay },
          schedule: { patientId: userId },
        },
      }),
      this.prisma.healthVital.findMany({
        where: { patientId: userId },
        orderBy: { recordedAt: 'desc' },
        take: 5,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.vendorProduct.findMany({
        where: { isActive: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.findFirst({
        where: {
          patientId: userId,
          status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        },
        include: {
          doctor: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
    ]);

    const taken = todayLogs.filter((l) => l.status === 'taken').length;
    const missed = todayLogs.filter((l) => l.status === 'missed').length;
    const totalDosesToday = schedules.reduce((sum, s) => sum + (s.times.length || 1), 0);
    const remaining = Math.max(0, totalDosesToday - taken);

    const nextMed = this.computeNextMedication(schedules);
    const bp = vitals.find((v) => v.vitalType === 'blood_pressure');
    const oxygen = vitals.find((v) => v.vitalType === 'oxygen');

    const address = user.addresses[0];
    const locationLabel = address?.region ?? address?.formattedAddress?.split(',')[0] ?? 'Add address';

    return {
      user: {
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        location: locationLabel,
        lastActiveLabel: this.formatLastActive(user.updatedAt),
      },
      nextMedication: nextMed,
      medicationStats: { taken, missed, remaining, total: totalDosesToday },
      healthVitals: {
        bloodPressure: bp
          ? { value: bp.value, checkedAgo: this.formatAgo(bp.recordedAt) }
          : null,
        oxygen: oxygen ? { value: oxygen.value } : null,
      },
      refill: {
        daysUntil: 5,
        familyMonitoring: (user.patientProfile?.familyMembers.length ?? 0) > 0,
      },
      schedules: schedules.map((s) => ({
        id: s.id,
        medicineName: s.medicineName,
        dose: s.dose,
        times: s.times,
        mealTiming: s.mealTiming,
        instruction: s.instruction,
        todayLogs: s.logs,
      })),
      relatedProducts: relatedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        genericName: p.genericName,
        unitPrice: p.unitPrice,
        discountPrice: p.discountPrice,
        imageUrl: p.imageUrl,
        category: p.category,
      })),
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            doctorName: nextAppointment.doctor.user.fullName,
            specialty: nextAppointment.doctor.specialty,
            scheduledDate: nextAppointment.scheduledDate,
            timeSlot: nextAppointment.timeSlot,
          }
        : null,
      unreadNotifications,
    };
  }

  private computeNextMedication(
    schedules: Array<{
      id: string;
      medicineName: string;
      dose: string | null;
      times: string[];
      logs: Array<{ status: string; loggedAt: Date }>;
    }>,
  ) {
    if (!schedules.length) return null;

    let best: {
      scheduleId: string;
      medicineName: string;
      dose: string | null;
      dueAt: Date;
      minutesUntil: number;
    } | null = null;

    for (const schedule of schedules) {
      const times = schedule.times.length ? schedule.times : ['08:00 AM'];
      for (const t of times) {
        const dueAt = parseTimeToday(t);
        if (!dueAt) continue;
        const alreadyTaken = schedule.logs.some(
          (l) => l.status === 'taken' && Math.abs(l.loggedAt.getTime() - dueAt.getTime()) < 3600000,
        );
        if (alreadyTaken) continue;
        const mins = minutesUntil(dueAt);
        if (!best || dueAt.getTime() < best.dueAt.getTime()) {
          best = {
            scheduleId: schedule.id,
            medicineName: schedule.medicineName,
            dose: schedule.dose,
            dueAt,
            minutesUntil: mins,
          };
        }
      }
    }

    if (!best) {
      const first = schedules[0];
      return {
        scheduleId: first.id,
        medicineName: first.medicineName,
        dose: first.dose,
        minutesUntilLabel: 'Due now',
        minutesUntil: 0,
      };
    }

    return {
      scheduleId: best.scheduleId,
      medicineName: best.medicineName,
      dose: best.dose,
      minutesUntil: best.minutesUntil,
      minutesUntilLabel:
        best.minutesUntil <= 0
          ? 'Due now'
          : best.minutesUntil < 60
            ? `In ${best.minutesUntil} Minutes`
            : `In ${Math.floor(best.minutesUntil / 60)}h ${best.minutesUntil % 60}m`,
    };
  }

  private formatAgo(date: Date): string {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  private formatLastActive(date: Date): string {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days < 7) return `${days || 1} days ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
}
