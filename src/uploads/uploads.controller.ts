import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);
const uploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
});

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('report')
  @ApiOperation({ summary: 'Upload health report file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(uploadInterceptor)
  uploadReport(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file, 'reports');
  }

  @Post('prescription')
  @ApiOperation({ summary: 'Upload prescription file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(uploadInterceptor)
  uploadPrescription(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file, 'prescriptions');
  }

  @Post('product-image')
  @ApiOperation({ summary: 'Upload vendor product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(uploadInterceptor)
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file, 'product-images');
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload profile or family member avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(uploadInterceptor)
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file, 'avatars');
  }

  @Post('chat-attachment')
  @ApiOperation({ summary: 'Upload consultation chat attachment (image, PDF, audio)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(uploadInterceptor)
  uploadChatAttachment(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file, 'chat-attachments');
  }

  @Post('vendor-document')
  @ApiOperation({ summary: 'Upload vendor pharmacy document (image or PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(uploadInterceptor)
  uploadVendorDocument(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file, 'vendor-documents');
  }
}
