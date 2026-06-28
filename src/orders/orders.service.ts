import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { generateOrderNumber } from '../common/utils/helpers';
import { CreateOrderDto } from './dto/order.dto';

const DELIVERY_CHARGE = 30;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async checkout(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { vendorProduct: true } } },
    });
    if (!cart?.items.length) throw new BadRequestException('Cart is empty');

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    const vendorProduct = cart.items[0].vendorProduct;
    const vendorId = vendorProduct?.vendorId;

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const total = subtotal + DELIVERY_CHARGE;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: userId,
          vendorId,
          addressSnapshot: address as unknown as Prisma.InputJsonValue,
          paymentMethod: dto.paymentMethod,
          paymentStatus:
            dto.paymentMethod === 'COD' ? PaymentStatus.PENDING : PaymentStatus.PENDING,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryCharge: new Prisma.Decimal(DELIVERY_CHARGE),
          total: new Prisma.Decimal(total),
          prescriptionUrl: dto.prescriptionUrl,
          notes: dto.notes,
          status: OrderStatus.PENDING,
          statusEvents: { create: { status: OrderStatus.PENDING, note: 'Order placed' } },
          items: {
            create: cart.items.map((item) => ({
              vendorProductId: item.vendorProductId,
              medicineId: item.medicineId,
              name: item.name,
              variant: item.variant,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: new Prisma.Decimal(Number(item.unitPrice) * item.quantity),
            })),
          },
          payment: {
            create: {
              method: dto.paymentMethod,
              amount: new Prisma.Decimal(total),
              status: PaymentStatus.PENDING,
            },
          },
        },
        include: { items: true, statusEvents: true, payment: true },
      });

      for (const item of cart.items) {
        if (item.vendorProductId) {
          await tx.vendorProduct.update({
            where: { id: item.vendorProductId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    return order;
  }

  async findMine(userId: string) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        items: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId: userId },
      include: {
        items: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async confirmPayment(orderId: string, userId: string) {
    const order = await this.findOne(userId, orderId);
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.PAID, status: OrderStatus.CONFIRMED },
      }),
      this.prisma.paymentTransaction.update({
        where: { orderId: order.id },
        data: { status: PaymentStatus.PAID },
      }),
      this.prisma.orderStatusEvent.create({
        data: { orderId: order.id, status: OrderStatus.CONFIRMED, note: 'Payment received' },
      }),
    ]);
    return this.findOne(userId, orderId);
  }

  async updateStatus(orderId: string, status: OrderStatus, note?: string) {
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status } }),
      this.prisma.orderStatusEvent.create({ data: { orderId, status, note } }),
    ]);
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { statusEvents: true },
    });
  }

  async findVendorOrders(vendorUserId: string, status?: OrderStatus) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');

    return this.prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        ...(status ? { status } : {}),
      },
      include: { items: true, customer: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
