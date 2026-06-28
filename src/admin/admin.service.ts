import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
  VendorApprovalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { VendorProductsService } from '../vendor-products/vendor-products.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private vendorProducts: VendorProductsService,
    private usersService: UsersService,
  ) {}

  async dashboard() {
    const [totalOrders, totalUsers, totalVendors, revenue] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.vendorProfile.count({ where: { approvalStatus: 'APPROVED' } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
    ]);
    return {
      totalOrders,
      totalUsers,
      totalVendors,
      totalRevenue: revenue._sum.total ?? 0,
      growthPercent: 18.6,
    };
  }

  async listOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      include: {
        customer: { select: { fullName: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listVendors(status?: VendorApprovalStatus) {
    return this.prisma.vendorProfile.findMany({
      where: status ? { approvalStatus: status } : {},
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });
  }

  async updateVendorStatus(vendorId: string, approvalStatus: VendorApprovalStatus) {
    return this.prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { approvalStatus },
    });
  }

  async listUsers(role?: UserRole, status?: UserStatus) {
    return this.usersService.findAll(role, status);
  }

  async salesReport(from?: string, to?: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { items: true },
    });

    const topMedicines = await this.prisma.orderItem.groupBy({
      by: ['name'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    return {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((s, o) => s + Number(o.total), 0),
      topSellingMedicines: topMedicines.map((m) => ({
        name: m.name,
        quantitySold: m._sum.quantity,
      })),
    };
  }

  async inventoryOverview() {
    const [totalItems, lowStock, outOfStock] = await Promise.all([
      this.prisma.vendorProduct.count({ where: { isActive: true } }),
      this.vendorProducts.getLowStock(),
      this.prisma.vendorProduct.count({ where: { isActive: true, stockQuantity: 0 } }),
    ]);
    return { totalItems, lowStockCount: lowStock.length, outOfStock, lowStockItems: lowStock };
  }

  async listPayments() {
    return this.prisma.paymentTransaction.findMany({
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: { select: { fullName: true } },
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
