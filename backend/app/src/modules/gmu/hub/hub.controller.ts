import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HubService, CreateHubDto, UpdateHubDto } from './hub.service';

@Controller('hubs')
export class HubController {
  constructor(private readonly hubService: HubService) {}

  @Get()
  async getAllHubs() {
    return this.hubService.getAllHubs();
  }

  @Get(':id')
  async getHubById(@Param('id') id: string) {
    return this.hubService.getHubById(id);
  }

  @Post()
  async createHub(@Body() body: CreateHubDto) {
    return this.hubService.createHub(body);
  }

  @Put(':id')
  async updateHub(@Param('id') id: string, @Body() body: UpdateHubDto) {
    return this.hubService.updateHub(id, body);
  }

  @Delete(':id')
  async deleteHub(@Param('id') id: string) {
    return this.hubService.deleteHub(id);
  }
}
