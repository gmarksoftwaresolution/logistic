import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { HistoryFilterDto } from './history-filter.dto';

export enum OrderHistoryStatus {
  ALL = 'All',
  COMPLETED = 'Completed',
  REJECTED = 'Rejected',
}

export class HistoryQueryDto extends HistoryFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(OrderHistoryStatus)
  status?: OrderHistoryStatus;
}
