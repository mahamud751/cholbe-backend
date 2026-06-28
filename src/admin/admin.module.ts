import { Module } from '@nestjs/common';
import { VendorProductsModule } from '../vendor-products/vendor-products.module';
import { UsersModule } from '../users/users.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [VendorProductsModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
