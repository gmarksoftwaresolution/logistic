import { Controller, Get, Query, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('earnings')
@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get earnings for the logged-in SHG' })
  @ApiQuery({ name: 'filter', required: false, enum: ['today', 'week', 'month'], description: 'Filter by date range' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEarnings(
    @Request() req: any,
    @Query('filter') filter: string = 'today',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    const user = req.user;
    if (!user || user.role !== 'SHG') {
      throw new UnauthorizedException('Only SHG partners can access earnings');
    }

    return this.earningsService.getEarnings(
      user.id,
      filter,
      parseInt(page, 10),
      parseInt(limit, 10)
    );
  }
}
