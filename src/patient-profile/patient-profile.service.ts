import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import {
  EmergencyContactDto,
  FamilyMemberDto,
  UpdatePatientProfileDto,
} from './dto/patient-profile.dto';

@Injectable()
export class PatientProfileService {
  constructor(private prisma: PrismaService) {}

  private async getProfile(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Patient profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    return this.prisma.patientProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async listFamily(userId: string) {
    const profile = await this.getProfile(userId);
    return this.prisma.familyMember.findMany({
      where: { patientId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFamily(userId: string, dto: FamilyMemberDto) {
    const profile = await this.getProfile(userId);
    return this.prisma.familyMember.create({
      data: { patientId: profile.id, ...dto },
    });
  }

  async updateFamily(userId: string, id: string, dto: FamilyMemberDto) {
    const profile = await this.getProfile(userId);
    const member = await this.prisma.familyMember.findFirst({
      where: { id, patientId: profile.id },
    });
    if (!member) throw new NotFoundException('Family member not found');
    return this.prisma.familyMember.update({
      where: { id },
      data: dto,
    });
  }

  async removeFamily(userId: string, id: string) {
    const profile = await this.getProfile(userId);
    const member = await this.prisma.familyMember.findFirst({
      where: { id, patientId: profile.id },
    });
    if (!member) throw new NotFoundException('Family member not found');
    await this.prisma.familyMember.delete({ where: { id } });
    return { deleted: true };
  }

  async listEmergency(userId: string) {
    const profile = await this.getProfile(userId);
    return this.prisma.emergencyContact.findMany({
      where: { patientId: profile.id },
      orderBy: { name: 'asc' },
    });
  }

  async addEmergency(userId: string, dto: EmergencyContactDto) {
    const profile = await this.getProfile(userId);
    return this.prisma.emergencyContact.create({
      data: { patientId: profile.id, ...dto },
    });
  }

  async removeEmergency(userId: string, id: string) {
    const profile = await this.getProfile(userId);
    const contact = await this.prisma.emergencyContact.findFirst({
      where: { id, patientId: profile.id },
    });
    if (!contact) throw new NotFoundException('Emergency contact not found');
    await this.prisma.emergencyContact.delete({ where: { id } });
    return { deleted: true };
  }

  async getOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: { include: { familyMembers: true, emergencyContacts: true } },
        addresses: { where: { isDefault: true }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [medicationCount, nextAppointment, latestReport, latestDoctorAppointment] =
      await Promise.all([
      this.prisma.medicationSchedule.count({
        where: { patientId: userId, isActive: true },
      }),
      this.prisma.appointment.findFirst({
        where: {
          patientId: userId,
          status: { in: ['scheduled', 'confirmed', 'in_progress'] },
          scheduledDate: { gte: new Date() },
        },
        include: {
          doctor: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.healthReport.findFirst({
        where: { patientId: userId },
        orderBy: { reportDate: 'desc' },
      }),
      this.prisma.appointment.findFirst({
        where: { patientId: userId },
        orderBy: { scheduledDate: 'desc' },
        include: {
          doctor: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
        },
      }),
    ]);

    const assignedDoctor =
      nextAppointment?.doctor ?? latestDoctorAppointment?.doctor ?? null;

    const { passwordHash: _, ...safeUser } = user;
    return {
      user: safeUser,
      medicationCount,
      nextAppointment,
      assignedDoctor,
      latestReport,
      defaultAddress: user.addresses[0] ?? null,
    };
  }
}
