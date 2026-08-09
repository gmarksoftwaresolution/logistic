import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@Controller(['upload', 'uploads'])
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiOperation({ summary: 'Generic file upload (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGenericFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'general', userId);
  }

  @Post('base64')
  @ApiOperation({ summary: 'Generic base64 file upload' })
  async uploadBase64File(
    @Request() req: any,
    @Body() body: { base64: string; filename?: string; mimeType?: string; folder?: string },
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadBase64(
      body.base64,
      body.filename || 'file.jpg',
      body.folder || 'general',
      userId,
    );
  }

  @Post('profile-photo')
  @ApiOperation({ summary: 'Upload profile/selfie photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePhoto(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'profile_photos', userId);
  }

  @Post('aadhaar-front')
  @ApiOperation({ summary: 'Upload Aadhaar front image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAadhaarFront(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'aadhaar_front', userId);
  }

  @Post('aadhaar-back')
  @ApiOperation({ summary: 'Upload Aadhaar back image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAadhaarBack(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'aadhaar_back', userId);
  }

  @Post('pan-card')
  @ApiOperation({ summary: 'Upload PAN card image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPanCard(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'pan_card', userId);
  }

  @Post('driving-license')
  @ApiOperation({ summary: 'Upload driving license image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDrivingLicense(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'driving_license', userId);
  }

  @Post('vehicle')
  @ApiOperation({ summary: 'Upload vehicle image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVehicleImage(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id;
    return this.uploadsService.uploadFile(file, 'vehicle', userId);
  }
}
