import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
];

export function assertOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus,
  options: { allowForwardSkip?: boolean } = {},
) {
  if (current === next) {
    throw new BadRequestException(`Order is already ${next}`);
  }

  if (next === OrderStatus.CANCELLED) {
    if (current !== OrderStatus.PENDING && current !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(`Cannot cancel an order that is ${current}`);
    }
    return;
  }

  if (current === OrderStatus.CANCELLED || current === OrderStatus.DELIVERED) {
    throw new BadRequestException(`Cannot change status from ${current}`);
  }

  const fromIdx = ORDER_STATUS_FLOW.indexOf(current);
  const toIdx = ORDER_STATUS_FLOW.indexOf(next);
  if (fromIdx === -1 || toIdx === -1) {
    throw new BadRequestException('Invalid order status');
  }

  if (options.allowForwardSkip) {
    if (toIdx <= fromIdx) {
      throw new BadRequestException(`Cannot move order status backwards to ${next}`);
    }
    return;
  }

  if (toIdx !== fromIdx + 1) {
    throw new BadRequestException(
      `Invalid transition from ${current} to ${next}. Next step is ${ORDER_STATUS_FLOW[fromIdx + 1]}.`,
    );
  }
}

export function adminAllowedStatuses(current: OrderStatus): OrderStatus[] {
  if (current === OrderStatus.CANCELLED || current === OrderStatus.DELIVERED) {
    return [];
  }

  const idx = ORDER_STATUS_FLOW.indexOf(current);
  const forward = ORDER_STATUS_FLOW.slice(idx + 1);
  const cancel =
    current === OrderStatus.PENDING || current === OrderStatus.CONFIRMED
      ? [OrderStatus.CANCELLED]
      : [];

  return [...forward, ...cancel];
}
