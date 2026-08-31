import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface CreateHubDto {
  hubCode: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface UpdateHubDto {
  hubCode?: string;
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

@Injectable()
export class HubService {
  constructor(private prisma: PrismaService) {}

  async getAllHubs() {
    return this.prisma.hub.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHubById(id: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id },
    });
    if (!hub || hub.deletedAt) {
      throw new NotFoundException(`Hub with ID ${id} not found`);
    }
    return hub;
  }

  async createHub(data: CreateHubDto) {
    const hubCode = data.hubCode || `HUB-${Date.now().toString().slice(-4)}`;
    return this.prisma.hub.create({
      data: {
        ...data,
        hubCode,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async updateHub(id: string, data: UpdateHubDto) {
    await this.getHubById(id);
    return this.prisma.hub.update({
      where: { id },
      data,
    });
  }

  async deleteHub(id: string) {
    await this.getHubById(id);
    return this.prisma.hub.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
