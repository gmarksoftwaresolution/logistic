import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Matches,
  MinLength,
  IsArray,
  ValidateNested,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ShgRole, ProductCategory, VehicleType } from '@prisma/client';

export enum UserType {
  SHG = 'SHG',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum ShgExperience {
  LESS_THAN_1_YEAR = 'LESS_THAN_1_YEAR',
  ONE_TO_TWO_YEARS = 'ONE_TO_TWO_YEARS',
  THREE_TO_FIVE_YEARS = 'THREE_TO_FIVE_YEARS',
  FIVE_PLUS_YEARS = 'FIVE_PLUS_YEARS',
}

export enum NonShgRole {
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
  DRIVER = 'DRIVER',
  SHOPKEEPER = 'SHOPKEEPER',
  STUDENT = 'STUDENT',
  FARMER = 'FARMER',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  OTHER = 'OTHER',
}

export enum ProductUnit {
  BAG = 'BAG',
  BAL = 'BAL',
  BDL = 'BDL',
  BKL = 'BKL',
  BOU = 'BOU',
  BOX = 'BOX',
  BTL = 'BTL',
  BUN = 'BUN',
  CAN = 'CAN',
  CBM = 'CBM',
  CCM = 'CCM',
  CMS = 'CMS',
  CTN = 'CTN',
  DOZ = 'DOZ',
  DRM = 'DRM',
  GGR = 'GGR',
  GMS = 'GMS',
  GRS = 'GRS',
  GYD = 'GYD',
  KGS = 'KGS',
  KLR = 'KLR',
  KME = 'KME',
  MLT = 'MLT',
  MTR = 'MTR',
  MTS = 'MTS',
  NOS = 'NOS',
  PAC = 'PAC',
  PCS = 'PCS',
  PRS = 'PRS',
  QTL = 'QTL',
  ROL = 'ROL',
  SET = 'SET',
  TBS = 'TBS',
  TGM = 'TGM',
  THD = 'THD',
  TON = 'TON',
  TUB = 'TUB',
  UGS = 'UGS',
  UNT = 'UNT',
  YDS = 'YDS',
  MMT = 'MMT',
  INH = 'INH',
  FT = 'FT',
  MIL = 'MIL',
  MGM = 'MGM',
  LBS = 'LBS',
  LTR = 'LTR',
  SQMM = 'SQMM',
  SQCM = 'SQCM',
  ACR = 'ACR',
  HTR = 'HTR',
  OTH = 'OTH',
}

// ─── REGEX CONSTANTS ─────────────────────────────────────────────────────────
const NAME_REGEX = /^[a-zA-Z\s.]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const VEHICLE_REG_REGEX = /^(?:(?:[A-Z]{2}[0-9A-Z]{2}[A-Z]{0,3}[0-9]{4})|(?:[0-9]{2}BH[0-9]{4}[A-Z]{2}))$/;
const DRIVING_LICENSE_REGEX = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;
const UPI_ID_REGEX = /^[\w.-]+@[\w.-]+$/;

// ─── SCREEN 1: Profile + SHG Details + Role ──────────────────────────────────

export class ProfileDto {
  @ApiProperty({ enum: UserType, description: 'User type: SHG or INDIVIDUAL' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(UserType, { message: `userType must be one of: ${Object.values(UserType).join(', ')}` })
  userType: UserType;

  @ApiProperty({ example: 'Ramesh Kumar', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(50, { message: 'Full name is too long' })
  @Matches(NAME_REGEX, { message: 'Full name can only contain letters, spaces, and dots' })
  fullName: string;

  @ApiProperty({ example: 25, description: 'Age of the user', minimum: 18, maximum: 100 })
  @IsInt()
  @Min(18, { message: 'Age must be at least 18' })
  @Max(100, { message: 'Age must be at most 100' })
  age: number;

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/1/profile/selfie.jpg', description: 'Profile photo URL' })
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'Invalid photo URL format' })
  @IsOptional()
  photoUrl?: string;
}

// SHG-specific details (Screen 1 continuation for SHG users)
export class ShgDetailsDto {
  @ApiProperty({ example: 'Sakhi SHG', description: 'Name of the SHG group' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  shgName?: string;

  @ApiProperty({ example: 'Sita Devi', description: 'Name of SHG leader' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @Matches(NAME_REGEX, { message: 'Leader name can only contain letters, spaces, and dots' })
  shgLeaderName?: string;

  @ApiProperty({ example: '9876543210', description: 'SHG leader contact number' })
  @IsString()
  @IsOptional()
  @Matches(MOBILE_REGEX, { message: 'Leader contact must be a valid 10-digit number starting from 6' })
  shgLeaderContact?: string;

  @IsString()
  @IsOptional()
  @IsEnum(ShgExperience)
  shgExperience?: ShgExperience;

  @ApiProperty({ enum: ShgRole, description: 'Role in SHG' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(ShgRole, { message: `SHG role must be one of: ${Object.values(ShgRole).join(', ')}` })
  shgRole: ShgRole;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  crpName?: string;

  @IsString()
  @IsOptional()
  @Matches(MOBILE_REGEX, { message: 'CRP contact must be a valid 10-digit number starting from 6' })
  crpMobile?: string;

  @ApiPropertyOptional({ example: 'crp@example.com', description: 'CRP email' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  crpEmail?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  shgGroupSize?: number;
}

// Non-SHG role selection (Screen 1 continuation for Non-SHG users)
export class NonShgRoleDto {
  @ApiProperty({
    enum: NonShgRole,
    description: 'Role for Non-SHG user',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(NonShgRole, { message: `Invalid Non-SHG role. Must be one of: ${Object.values(NonShgRole).join(', ')}` })
  nonShgRole: NonShgRole;

  @ApiPropertyOptional({ example: 'Photographer', description: 'Custom occupation if OTHER is selected' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  nonShgRoleOther?: string;
}

// ─── SCREEN 2 (SHG only): Product Section ────────────────────────────────────

export class ProductItemDto {
  @ApiProperty({ example: 'Papad', description: 'Name of the product' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(50)
  productName: string;

  @ApiProperty({
    enum: ProductCategory,
    description: 'Product category',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ example: 50, description: 'Daily production quantity' })
  @IsNumber()
  @Min(0)
  dailyProductionQty: number;

  @ApiProperty({ enum: ProductUnit, description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiPropertyOptional({ example: 300, description: 'Weekly production (optional)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  weeklyProduction?: number;

  @ApiPropertyOptional({ example: 150.5, description: 'Price per unit (optional)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;
}

export class ProductsDto {
  @ApiProperty({ description: 'Does the user produce any product?' })
  @IsBoolean()
  @IsNotEmpty()
  producesProduct: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Business team size' })
  @IsInt()
  @IsOptional()
  @Min(0)
  businessTeamSize?: number;

  @ApiPropertyOptional({ type: [ProductItemDto], description: 'Array of products (if producesProduct is true)' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  products?: ProductItemDto[];
}

// ─── SCREEN 3 (SHG) / SCREEN 2 (Non-SHG): Address ───────────────────────────

export class AddressDto {
  @ApiProperty({ example: '12A', description: 'House number or flat' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  houseNo: string;



  @ApiProperty({ example: 'Rampur', description: 'Village or City' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  village: string;

  @ApiProperty({ example: 'Latur', description: 'Taluka' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  taluka: string;

  @ApiProperty({ example: 'Latur', description: 'District' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  district: string;

  @ApiProperty({ example: 'Maharashtra', description: 'State' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '413512', description: 'Pincode (6 digits)' })
  @IsString()
  @IsNotEmpty()
  @Matches(PINCODE_REGEX, { message: 'Pincode must be exactly 6 digits and not start with 0' })
  pincode: string;



  @ApiProperty({ example: 'Near Post Office', description: 'Delivery Address' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(200)
  landmark: string;
}

// ─── SCREEN 4 (SHG) / SCREEN 3 (Non-SHG): Documents ─────────────────────────

export class DocumentsDto {
  @ApiProperty({ example: '123456789012', description: 'Aadhaar number (12 digits)' })
  @IsString()
  @IsNotEmpty()
  @Matches(AADHAAR_REGEX, { message: 'Aadhaar number must be exactly 12 digits' })
  aadhaarNumber: string;

  @ApiProperty({ example: 'ABCDE1234F', description: 'PAN number (10 chars, alphanumeric)' })
  @IsString()
  @IsNotEmpty()
  @Matches(PAN_REGEX, { message: 'PAN number must be in format ABCDE1234F' })
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  panNumber: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/1/aadhaar_front/aadhaar.jpg', description: 'Aadhaar front image URL' })
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'Invalid Aadhaar front image URL format' })
  @IsOptional()
  aadhaarFrontUrl?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/1/aadhaar_back/aadhaar.jpg', description: 'Aadhaar back image URL' })
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'Invalid Aadhaar back image URL format' })
  @IsOptional()
  aadhaarBackUrl?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/1/pan_card/pan.jpg', description: 'PAN card image URL' })
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'Invalid PAN card image URL format' })
  @IsOptional()
  panCardUrl?: string;
}

// ─── SCREEN 5 (SHG) / SCREEN 4 (Non-SHG): Bank Details ──────────────────────

export class BankDetailsDto {
  @ApiProperty({ example: 'Ramesh Kumar', description: 'Account holder name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @Matches(NAME_REGEX, { message: 'Account holder name can only contain letters, spaces, and dots' })
  @MaxLength(100)
  accountHolderName: string;

  @ApiProperty({ example: 'State Bank of India', description: 'Bank name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  bankName: string;

  @ApiProperty({ example: '1234567890123', description: 'Bank account number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{9,18}$/, { message: 'Account number must be between 9 and 18 digits' })
  accountNumber: string;

  @ApiProperty({ example: 'SBIN0001234', description: 'IFSC code' })
  @IsString()
  @IsNotEmpty()
  @Matches(IFSC_REGEX, { message: 'IFSC code must be in format XXXX0XXXXXX' })
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  ifscCode: string;

  @ApiPropertyOptional({ example: 'ramesh@upi', description: 'UPI ID (optional)' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @Matches(UPI_ID_REGEX, { message: 'Invalid UPI ID format' })
  upiId?: string;
}

// ─── SCREEN 6 (SHG) / SCREEN 5 (Non-SHG): Other Details + Vehicle ───────────

export class VehicleDto {
  @ApiPropertyOptional({
    enum: VehicleType,
    description: 'Type of vehicle (optional)',
  })
  @IsString()
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ example: 'DL1234567890', description: 'License number (if applicable)' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(50)
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'MH12AB1234', description: 'Vehicle registration number' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @Matches(VEHICLE_REG_REGEX, { message: 'Invalid vehicle registration format (e.g., MH12AB1234)' })
  vehicleRegistrationNo?: string;

  @ApiPropertyOptional({ example: 'MH1220190012345', description: 'Driving license number' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @Matches(DRIVING_LICENSE_REGEX, { message: 'Invalid driving license format. Must follow State Code + RTO Code + Year + Unique Number (e.g., MH0920150123456)' })
  drivingLicenseNumber?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/1/driving_license/dl.jpg', description: 'Driving license image URL' })
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'Invalid driving license image URL format' })
  @IsOptional()
  drivingLicenseImageUrl?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/uploads/1/vehicle/vehicle.jpg', description: 'Vehicle image URL' })
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'Invalid vehicle image URL format' })
  @IsOptional()
  vehicleImageUrl?: string;

  @ApiPropertyOptional({ example: 'Bike / Scooty', description: 'Selected vehicle name' })
  @IsString()
  @IsOptional()
  vehicleName?: string;

  @ApiPropertyOptional({ example: '30', description: 'Vehicle carrying capacity' })
  @IsString()
  @IsOptional()
  carryingCapacity?: string;
}

export class OtherDetailsDto {
  @ApiProperty({ example: '10x10 sqft', description: 'Available storage space' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  storageSpace: string;

  @ApiPropertyOptional({ example: 10, description: 'Storage width in feet' })
  @IsNumber()
  @IsOptional()
  storageWidth?: number;

  @ApiPropertyOptional({ example: 10, description: 'Storage length/height in feet' })
  @IsNumber()
  @IsOptional()
  storageLength?: number;

  @ApiProperty({ description: 'Does the user have a vehicle for delivery?' })
  @IsBoolean()
  hasVehicle: boolean;

  @ApiPropertyOptional({ type: VehicleDto, description: 'Vehicle details (required if hasVehicle is true)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle?: VehicleDto;
}
