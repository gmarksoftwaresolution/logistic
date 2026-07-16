import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search locations by pincode or village name' })
  async search(
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 10;
    const p = page ? parseInt(page, 10) : 1;
    return this.locationService.searchLocation(query, l, p);
  }

  @Get('pincode')
  @ApiOperation({ summary: 'Find location directory rows by pincode query' })
  async findByPincodeQuery(
    @Query('pincode') pincode: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 10;
    const p = page ? parseInt(page, 10) : 1;
    return this.locationService.searchPincode(pincode, l, p);
  }

  @Get('village')
  @ApiOperation({ summary: 'Find location directory rows by village query' })
  async findByVillageQuery(
    @Query('village') village: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 10;
    const p = page ? parseInt(page, 10) : 1;
    return this.locationService.searchVillage(village, l, p);
  }

  @Get('details')
  @ApiOperation({ summary: 'Find exact pincode directory record' })
  async getDetails(
    @Query('village') village: string,
    @Query('pincode') pincode: string,
  ) {
    return this.locationService.findVillageAndPincode(village, pincode);
  }

  // Hierarchical dropdown APIs
  @Get('states')
  @ApiOperation({ summary: 'Get list of unique states' })
  async getStates() {
    return this.locationService.getStates();
  }

  @Get('districts')
  @ApiOperation({ summary: 'Get list of unique districts for a state' })
  async getDistricts(@Query('state') state: string) {
    return this.locationService.getDistricts(state);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get list of unique blocks for a state and district' })
  async getBlocks(
    @Query('state') state: string,
    @Query('district') district: string,
  ) {
    return this.locationService.getBlocks(state, district);
  }

  @Get('villages')
  @ApiOperation({ summary: 'Get list of unique villages for a state, district, and block' })
  async getVillages(
    @Query('state') state: string,
    @Query('district') district: string,
    @Query('block') block: string,
  ) {
    return this.locationService.getVillages(state, district, block);
  }

  // --- Backward Compatibility ---
  @Get('pincode/:pincode')
  @ApiOperation({ summary: 'Get address details from pincode (legacy)' })
  async getPincodeDetails(@Param('pincode') pincode: string) {
    return this.locationService.getAddressFromPincode(pincode);
  }

  @Get('ifsc/:ifsc')
  @ApiOperation({ summary: 'Get bank details from IFSC code (legacy)' })
  async getBankDetails(@Param('ifsc') ifsc: string) {
    return this.locationService.getBankFromIfsc(ifsc);
  }
}
