import { IsOptional, IsString } from 'class-validator';

export class HistoryFilterDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
