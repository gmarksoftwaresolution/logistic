import { Injectable, BadRequestException } from '@nestjs/common';
import { extname, join } from 'path';
import { writeFileSync } from 'fs';

@Injectable()
export class UploadService {
  handleFileUpload(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // In a real production app, you might upload to S3.
    // Here we use local storage and return the URL.
    const fileUrl = `/uploads/${file.filename}`;
    return { url: fileUrl };
  }

  handleBase64Upload(base64: string, originalFilename: string, mimeType?: string) {
    if (!base64) {
      throw new BadRequestException('No base64 data provided');
    }

    // Clean base64 string if it contains the data:image/xxx;base64 prefix
    let cleanBase64 = base64;
    if (base64.includes(';base64,')) {
      cleanBase64 = base64.split(';base64,')[1];
    }

    // Extract file extension and sanitize filename
    const ext = extname(originalFilename) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `file-${uniqueSuffix}${ext}`;

    // Convert base64 to binary buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Define full path to uploads directory
    const filePath = join(process.cwd(), 'uploads', filename);

    try {
      writeFileSync(filePath, buffer);
      console.log(`[Base64 Upload] Successfully wrote file to disk: ${filePath} (Size: ${buffer.length} bytes)`);
      const fileUrl = `/uploads/${filename}`;
      return { url: fileUrl };
    } catch (error: any) {
      console.error('[Base64 Upload Error] Failed to write file to disk:', error);
      throw new BadRequestException(`Failed to save uploaded file: ${error.message}`);
    }
  }
}
