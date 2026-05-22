import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsNumberString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidateNested,
  IsIn,
} from 'class-validator';

import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const NAME_REGEX = /^[a-zA-Z ]+$/;
const ADDRESS_REGEX = /^[a-zA-Z0-9\s,.-]+$/;
const MOBILE_REGEX = /^[6789]\d{9}$/;
const PIN_REGEX = /^\d{6}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[\w.-]+@[a-zA-Z]{2,}$/;
const TIME_REGEX = /^([1-9]|0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
const DL_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11}$/;
const VEHICLE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,2}\s?\d{4}$/;
const ORG_REGEX = /^[a-zA-Z0-9\s,.\-\/()]+$/;
const ALPHA_ONLY_REGEX = /^[a-zA-Z]+$/;
const CITY_REGEX = /^[a-zA-Z\s,]+$/;




export enum VehicleCategory {
  MILK_VAN = 'MILK_VAN',
  PERSONAL = 'PERSONAL',
}

export class WorkingScheduleDto {
  @ApiProperty({ example: 'Mon' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  day: string;

  @ApiProperty({ example: '9:00 AM' })
  @IsNotEmpty()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Start time must be in HH:MM AM/PM format' })
  startTime: string;

  @ApiProperty({ example: '6:00 PM' })
  @IsNotEmpty()
  @IsString()
  @Matches(TIME_REGEX, { message: 'End time must be in HH:MM AM/PM format' })
  endTime: string;
}

// Signup Flow DTOs
export class SelectLanguageDto {
  @ApiProperty({ example: 'English' })
  @IsNotEmpty()
  @IsString()
  language: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(MOBILE_REGEX, { message: 'Mobile number must be a valid 10-digit Indian number' })
  mobileNumber: string;

  @ApiProperty({ example: 'English' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['English', 'Hindi', 'Marathi'])
  language: string;
}


export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(MOBILE_REGEX, { message: 'Mobile number must be a valid 10-digit Indian number it should start from 6' })
  mobileNumber: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}


// Registration Step DTOs
export class Step1PersonalDetailsDto {
  @ApiPropertyOptional({ example: '9876543210', description: 'Transporter phone number (Taken from JWT if omitted)' })
  @IsOptional()
  @IsString()
  @Matches(MOBILE_REGEX, { message: 'Phone number must be a valid 10-digit Indian number it should start from 6' })
  phoneNumber?: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX, { message: 'First name must contain only alphabets and spaces' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX, { message: 'Last name must contain only alphabets and spaces' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX, { message: 'State must contain only alphabets and spaces' })
  @Transform(({ value }) => value?.trim())
  state: string;

  @ApiProperty({ example: 'Kolhapur' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX, { message: 'District must contain only alphabets and spaces' })
  @Transform(({ value }) => value?.trim())
  district: string;

  @ApiProperty({ example: 'Gadhinglaj' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NAME_REGEX, { message: 'Taluka must contain only alphabets and spaces' })
  @Transform(({ value }) => value?.trim())
  taluka: string;

  @ApiProperty({ example: '123 Main St, Pune' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(ADDRESS_REGEX, { message: 'Address contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  residentialAddress: string;


  @ApiProperty({ example: '411001' })
  @IsNotEmpty()
  @IsString()
  @Matches(PIN_REGEX, { message: 'PIN code must be exactly 6 digits' })
  pinCode: string;

  @ApiProperty({ example: '/uploads/photo.jpg', description: 'URL of the profile photo' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  profilePhoto: string;
}


export class Step2DrivingDetailsDto {
  @ApiProperty({ example: 'MH1220230000123' })
  @IsNotEmpty()
  @IsString()
  @Matches(DL_REGEX, { message: 'Invalid Indian Driving License format' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  licenseNumber: string;

  @ApiProperty({ example: '/uploads/license.png' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  licensePhoto: string;

  @ApiProperty({ example: '2030-12-31' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expiry date must be YYYY-MM-DD' })
  expiryDate: string;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  experienceYears: number;
}


export class Step3BankDetailsDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(NAME_REGEX, { message: 'Account holder name must contain only alphabets and spaces' })
  @Transform(({ value }) => value?.trim())
  accountHolderName: string;

  @ApiProperty({ example: 'HDFC Bank' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(NAME_REGEX, { message: 'Bank name can contain only alphabets' })
  @Transform(({ value }) => value?.trim())
  bankName: string;

  @ApiProperty({ example: '50100012345678' })
  @IsNotEmpty()
  @IsString()
  @IsNumberString()
  @MinLength(9, { message: 'Account number must be at least 9 digits' })
  @MaxLength(20, { message: 'Account number cannot exceed 20 digits' })
  @Transform(({ value }) => value?.trim())
  accountNumber: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @IsNotEmpty()
  @IsString()
  @Matches(IFSC_REGEX, { message: 'Invalid IFSC code format' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  ifscCode: string;

  @ApiPropertyOptional({ example: 'Main Branch' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(NAME_REGEX, { message: 'Branch name can contain only alphabets' })
  @Transform(({ value }) => value?.trim())
  branchName?: string;

  @ApiPropertyOptional({ example: 'john@upi' })
  @IsOptional()
  @IsString()
  @Matches(UPI_REGEX, { message: 'Invalid UPI ID format' })
  @Transform(({ value }) => value?.trim())
  upiId?: string;
}


export class Step4VehicleTypeDto {
  @ApiProperty({ enum: VehicleCategory, example: VehicleCategory.PERSONAL })
  @IsNotEmpty()
  @IsEnum(VehicleCategory)
  vehicleCategory: VehicleCategory;
}

export class Step5PersonalVehicleDto {
  @ApiProperty({ example: '4-wheeler' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['2 Wheeler', '3 Wheeler', '4 Wheeler', '6 Wheeler', '8 Wheeler', '10 Wheeler', '12 Wheeler', '14 Wheeler', '16 Wheeler', '18 Wheeler', '22 Wheeler', 'Other'])
  @Transform(({ value }) => {
    if (!value) return value;
    return value.trim().replace(/wheeler/i, 'Wheeler');
  })
  wheeler: string;

  @ApiProperty({ example: 'Pickup' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  type: string;

  @ApiProperty({ example: 'Tata' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  make: string;

  @ApiProperty({ example: 'MH12AB1234' })
  @IsNotEmpty()
  @IsString()
  @Matches(VEHICLE_REGEX, { message: 'Invalid Indian vehicle number format' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  number: string;

  @ApiProperty({ example: '/uploads/rc.pdf' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  rcUpload: string;

  @ApiProperty({ example: '/uploads/insurance.pdf' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  insuranceUpload: string;
}


export class Step6PersonalRouteDto {
  @ApiProperty({ example: 'Pune Region' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(CITY_REGEX, { message: 'Operating area can contain only alphabets' })
  @Transform(({ value }) => value?.trim())
  operatingArea: string;


  @ApiPropertyOptional({ example: 'Kothrud, Baner' })
  @IsOptional()
  @IsString()
  @Matches(ADDRESS_REGEX, { message: 'Pickup locations contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  pickupLocations?: string;

  @ApiPropertyOptional({ example: 'Hinjewadi, Wagholi' })
  @IsOptional()
  @IsString()
  @Matches(ADDRESS_REGEX, { message: 'Drop locations contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  dropLocations?: string;

  @ApiPropertyOptional({ example: '9 AM - 6 PM' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  workingTime?: string;

  @ApiPropertyOptional({ example: ['Mon', 'Tue', 'Wed'], description: 'Array of working days' })
  @IsOptional()
  @IsArray()
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], { each: true })
  workingDays?: string[];

  @ApiPropertyOptional({ type: [WorkingScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingScheduleDto)
  workingSchedule?: WorkingScheduleDto[];
}


export class Step5MilkVanOrgDto {
  @ApiProperty({ example: 'Gokul Kolhapur' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(ORG_REGEX, { message: 'Sangathan name contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  sangathanName: string;

  @ApiProperty({ example: 'Kolhapur Main Center' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(ORG_REGEX, { message: 'Center name contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  centerName: string;
}


export class MilkOrganizationDetailsDto {
  @ApiProperty({ example: 'Gokul Kolhapur' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(ORG_REGEX, { message: 'Sangathan name contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  sangathanName: string;

  @ApiProperty({ example: 'Kolhapur Main Center' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(ORG_REGEX, { message: 'Center name contains invalid characters' })
  @Transform(({ value }) => value?.trim())
  centerName: string;
}


export class Step6MilkVanRouteDto {
  @ApiProperty({ example: ['Village A', 'Village B'] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one assigned village is required' })
  assignedVillages: string[];


  @ApiProperty({ example: '05:00 AM' })
  @IsNotEmpty()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Morning shift time must be in HH:MM AM/PM format' })
  @Transform(({ value }) => value?.trim())
  morningShiftTime: string;

  @ApiProperty({ example: '05:00 PM' })
  @IsNotEmpty()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Evening shift time must be in HH:MM AM/PM format' })
  @Transform(({ value }) => value?.trim())
  eveningShiftTime: string;

  @ApiProperty({ example: 'Mon-Sat' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  daysAvailable: string;

  @ApiPropertyOptional({ example: ['Mon', 'Tue', 'Wed'], description: 'Array of working days' })
  @IsOptional()
  @IsArray()
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], { each: true })
  workingDays?: string[];

  @ApiPropertyOptional({ type: [WorkingScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingScheduleDto)
  workingSchedule?: WorkingScheduleDto[];
}


export class Step7MilkVanVehicleDto extends Step5PersonalVehicleDto {}
