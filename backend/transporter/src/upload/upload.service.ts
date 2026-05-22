import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';

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
}
