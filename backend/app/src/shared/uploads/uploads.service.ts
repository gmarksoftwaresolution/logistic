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
    folder: string,
    userId: number,
  ): Promise<{ success: boolean; url: string; path: string }> {
    try {
      const targetDir = path.join(this.uploadRootDir, userId.toString(), folder);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}${fileExt}`;
      const filePath = path.join(targetDir, fileName);

      fs.writeFileSync(filePath, file.buffer);
      const url = `/uploads/${userId}/${folder}/${fileName}`;

      return {
        success: true,
        url: url,
        path: filePath,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new InternalServerErrorException(
        'Local file storage failed. Please try again.',
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
