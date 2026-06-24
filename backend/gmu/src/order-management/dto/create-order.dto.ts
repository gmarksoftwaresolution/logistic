import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'ORD-PICK-1001', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ example: 'Anisha Dilip Kamble' })
  @IsString()
  @IsNotEmpty()
  sellerName: string;

  @ApiProperty({ example: '9876543204' })
  @IsString()
  @IsNotEmpty()
  sellerMobile: string;

  @ApiProperty({ example: 'Indapur' })
  @IsString()
  @IsNotEmpty()
  sellerVillage: string;

  @ApiProperty({ example: 'Indapur' })
  @IsString()
  @IsNotEmpty()
  sellerTaluka: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @IsNotEmpty()
  sellerDistrict: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  sellerState: string;

  @ApiProperty({ example: '413106' })
  @IsString()
  @IsNotEmpty()
  sellerPincode: string;

  @ApiProperty({ example: 'Buyer Name' })
  @IsString()
  @IsNotEmpty()
  buyerName: string;

  @ApiProperty({ example: '9999988888' })
  @IsString()
  @IsNotEmpty()
  buyerMobile: string;

  @ApiProperty({ example: 'Nesari' })
  @IsString()
  @IsNotEmpty()
  buyerVillage: string;

  @ApiProperty({ example: 'Gadhinglaj' })
  @IsString()
  @IsNotEmpty()
  buyerTaluka: string;

  @ApiProperty({ example: 'Kolhapur' })
  @IsString()
  @IsNotEmpty()
  buyerDistrict: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  buyerState: string;

  @ApiProperty({ example: '416504' })
  @IsString()
  @IsNotEmpty()
  buyerPincode: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  productCount: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsNotEmpty()
  totalQty: number;

  @ApiProperty({ example: 10.5 })
  @IsNumber()
  @IsNotEmpty()
  totalWeight: number;
}
