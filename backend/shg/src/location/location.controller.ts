import { Controller, Get, Param } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('pincode/:pincode')
  @ApiOperation({ summary: 'Get address details from pincode' })
  async getPincodeDetails(@Param('pincode') pincode: string) {
    return this.locationService.getAddressFromPincode(pincode);
  }

  @Get('ifsc/:ifsc')
  @ApiOperation({ summary: 'Get bank details from IFSC code' })
  async getBankDetails(@Param('ifsc') ifsc: string) {
    return this.locationService.getBankFromIfsc(ifsc);
  }
}
