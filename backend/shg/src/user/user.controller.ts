import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { GetUser } from '../common/decorators/user.decorator';
import { User } from '@prisma/client';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get full user profile with all related data' })
  @ApiResponse({ status: 200, description: 'User profile with masked sensitive data' })
  async getProfile(@GetUser() user: User) {
    return this.userService.getProfile(user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard data with application status' })
  async getDashboard(@GetUser() user: User) {
    return this.userService.getDashboard(user.id);
  }
}
