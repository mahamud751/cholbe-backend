import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreatePrescriptionDto } from './dto/prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, dto: CreatePrescriptionDto) {
    return this.prisma.prescription.create({
      data: {
        patientId,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        source: dto.source,
        medicines: dto.medicines?.length
          ? { create: dto.medicines }
          : undefined,
      },
      include: { medicines: true },
    });
  }

  async findAll(patientId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId },
      include: { medicines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(patientId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, patientId },
      include: { medicines: true },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }
}
