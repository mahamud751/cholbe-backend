import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VendorsService } from './vendors.service';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Vendors')
@Controller('vendor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiBearerAuth('access-token')
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Vendor home dashboard stats' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.vendorsService.getDashboard(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update vendor pharmacy profile' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.vendorsService.updateProfile(user.sub, body);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Vendor payment transactions' })
  payments(@CurrentUser() user: JwtPayload) {
    return this.vendorsService.listPayments(user.sub);
  }
}
