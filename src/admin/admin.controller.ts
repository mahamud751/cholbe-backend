import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  OrderStatus,
  UserRole,
  UserStatus,
  VendorApprovalStatus,
} from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin home metrics' })
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('orders')
  @ApiOperation({ summary: 'All platform orders' })
  orders(@Query('status') status?: OrderStatus) {
    return this.adminService.listOrders(status);
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Vendor list' })
  vendors(@Query('status') status?: VendorApprovalStatus) {
    return this.adminService.listVendors(status);
  }

  @Patch('vendors/:id/status')
  @ApiOperation({ summary: 'Approve or reject vendor' })
  vendorStatus(
    @Param('id') id: string,
    @Body('approvalStatus') approvalStatus: VendorApprovalStatus,
  ) {
    return this.adminService.updateVendorStatus(id, approvalStatus);
  }

  @Get('users')
  @ApiOperation({ summary: 'User directory' })
  users(@Query('role') role?: UserRole, @Query('status') status?: UserStatus) {
    return this.adminService.listUsers(role, status);
  }

  @Get('reports/sales')
  @ApiOperation({ summary: 'Sales report & top medicines' })
  salesReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.adminService.salesReport(from, to);
  }

  @Get('inventory/overview')
  @ApiOperation({ summary: 'Inventory analytics' })
  inventory() {
    return this.adminService.inventoryOverview();
  }

  @Get('payments')
  @ApiOperation({ summary: 'Payment transactions' })
  payments() {
    return this.adminService.listPayments();
  }
}
