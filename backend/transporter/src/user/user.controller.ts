import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get full user profile including all registration data' })
  @ApiResponse({ status: 200, description: 'Profile data retrieved successfully' })
  getProfile(@Request() req: any): Promise<any> {
    return this.userService.getProfile(req.user.sub);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary and completion status' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  getDashboard(@Request() req: any) {
    return this.userService.getDashboard(req.user.sub);
  }
}
