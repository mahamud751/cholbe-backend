import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const DOCUMENT_MIMES = new Set(['application/pdf']);

const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
]);

const PRODUCT_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class UploadsService {
  constructor(private config: ConfigService) {}

  saveFile(
    file: Express.Multer.File,
    subdir:
      | 'reports'
      | 'prescriptions'
      | 'product-images'
      | 'avatars'
      | 'chat-attachments'
      | 'vendor-documents',
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const maxFileSizeMb = Number(this.config.get<string>('MAX_FILE_SIZE_MB') ?? 10);
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        `File is too large. Maximum size is ${maxFileSizeMb} MB`,
      );
    }

    const mimeType = (file.mimetype || '').toLowerCase();
    const allowed =
      subdir === 'product-images' || subdir === 'avatars'
        ? PRODUCT_IMAGE_MIMES
        : subdir === 'chat-attachments'
          ? new Set([...IMAGE_MIMES, ...DOCUMENT_MIMES, ...AUDIO_MIMES])
          : subdir === 'vendor-documents'
            ? new Set([...IMAGE_MIMES, ...DOCUMENT_MIMES])
            : new Set([...IMAGE_MIMES, ...DOCUMENT_MIMES]);

    if (!allowed.has(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type "${mimeType}". Allowed: images (JPEG, PNG, WEBP) or PDF`,
      );
    }

    const uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    const targetDir = join(uploadDir, subdir);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const ext = extname(file.originalname) || this.extFromMime(mimeType);
    const fileName = `${randomUUID()}${ext}`;
    const filePath = join(targetDir, fileName);
    writeFileSync(filePath, file.buffer);

    return {
      fileUrl: `/uploads/${subdir}/${fileName}`,
      fileName: file.originalname || fileName,
      mimeType,
      size: file.size,
    };
  }

  resolveUploadedPath(fileUrl: string) {
    if (!fileUrl.startsWith('/uploads/')) {
      throw new BadRequestException('Invalid uploaded file URL');
    }
    const uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    const relative = fileUrl.replace(/^\/uploads\//, '');
    const filePath = join(uploadDir, relative);
    if (!existsSync(filePath)) {
      throw new BadRequestException('Uploaded file was not found on the server');
    }
    return filePath;
  }

  readUploadedTextHint(fileUrl: string, fileName?: string) {
    const filePath = this.resolveUploadedPath(fileUrl);
    const ext = extname(filePath).toLowerCase();
    const parts = [fileName, fileUrl, filePath].filter(Boolean) as string[];

    if (ext === '.pdf') {
      try {
        const buffer = readFileSync(filePath);
        const ascii = buffer.toString('latin1');
        const printable = ascii.replace(/[^\x20-\x7E\n\r]+/g, ' ');
        parts.push(printable.slice(0, 4000));
      } catch {
        // Fall back to filename-only hints.
      }
    }

    return parts.join(' ');
  }

  private extFromMime(mime: string): string {
    if (mime.includes('png')) return '.png';
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('heic') || mime.includes('heif')) return '.heic';
    if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
    if (mime.includes('m4a') || mime.includes('mp4')) return '.m4a';
    if (mime.includes('wav')) return '.wav';
    if (mime.includes('ogg')) return '.ogg';
    if (mime.includes('webm')) return '.webm';
    return '.jpg';
  }
}
