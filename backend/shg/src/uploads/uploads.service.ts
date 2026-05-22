import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly uploadRootDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure root uploads directory exists
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
      // Create user-specific directory: uploads/{userId}/{folder}
      const targetDir = path.join(this.uploadRootDir, userId.toString(), folder);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Generate a unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}${fileExt}`;
      const filePath = path.join(targetDir, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Construct the accessible URL (Assuming static files are served at /uploads)
      // In production, this should use a config variable for the base URL
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
