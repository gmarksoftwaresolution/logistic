import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly uploadRootDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadRootDir)) {
      fs.mkdirSync(this.uploadRootDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'general',
    userId?: number | string,
  ): Promise<{ success: boolean; url: string; path: string }> {
    try {
      if (!file || !file.buffer) {
        throw new Error('No file buffer provided');
      }

      const userFolder = userId ? userId.toString() : 'public';
      const targetDir = path.join(this.uploadRootDir, userFolder, folder);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const fileExt = path.extname(file.originalname || '') || '.jpg';
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}${fileExt}`;
      const filePath = path.join(targetDir, fileName);

      fs.writeFileSync(filePath, file.buffer);
      const url = `/uploads/${userFolder}/${folder}/${fileName}`;

      return {
        success: true,
        url: url,
        path: filePath,
      };
    } catch (error: any) {
      console.error('File upload error:', error);
      throw new InternalServerErrorException(
        error.message || 'Local file storage failed. Please try again.',
      );
    }
  }

  async uploadBase64(
    base64Str: string,
    originalName = 'file.jpg',
    folder = 'general',
    userId?: number | string,
  ): Promise<{ success: boolean; url: string; path: string }> {
    try {
      if (!base64Str) {
        throw new Error('No base64 data provided');
      }

      const userFolder = userId ? userId.toString() : 'public';
      const targetDir = path.join(this.uploadRootDir, userFolder, folder);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const cleanBase64 = base64Str.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const fileExt = path.extname(originalName) || '.jpg';
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}${fileExt}`;
      const filePath = path.join(targetDir, fileName);

      fs.writeFileSync(filePath, buffer);
      const url = `/uploads/${userFolder}/${folder}/${fileName}`;

      return {
        success: true,
        url: url,
        path: filePath,
      };
    } catch (error: any) {
      console.error('Base64 upload error:', error);
      throw new InternalServerErrorException(
        error.message || 'Base64 file storage failed. Please try again.',
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete file at ${filePath}:`, error);
    }
  }
}
