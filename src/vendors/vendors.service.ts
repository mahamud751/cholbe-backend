import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');

    const [productCount, orderCount, pendingOrders, recentProducts, recentOrders, revenue] =
      await Promise.all([
      this.prisma.vendorProduct.count({ where: { ownerUserId: userId } }),
      this.prisma.order.count({ where: { vendorId: vendor.id } }),
      this.prisma.order.count({
        where: { vendorId: vendor.id, status: 'PENDING' },
      }),
      this.prisma.vendorProduct.findMany({
        where: { vendorId: vendor.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.order.findMany({
        where: { vendorId: vendor.id },
        include: {
          customer: { select: { fullName: true, phone: true } },
          items: { take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.order.aggregate({
        where: { vendorId: vendor.id, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
    ]);

    return {
      vendor,
      stats: {
        productCount,
        orderCount,
        pendingOrders,
        totalRevenue: revenue._sum.total ?? 0,
      },
      recentProducts,
      recentOrders,
    };
  }

  async listPayments(userId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');

    return this.prisma.paymentTransaction.findMany({
      where: { order: { vendorId: vendor.id } },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: { select: { fullName: true } },
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.prisma.vendorProfile.update({
      where: { userId },
      data: data as never,
    });
  }
}
