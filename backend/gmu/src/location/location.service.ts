import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  // Centralized lookup methods
  async findByPincode(pincode: string) {
    return this.prisma.pincodeDirectory.findMany({
      where: { pincode: pincode.trim() },
      orderBy: { name: 'asc' },
    });
  }

  async findByVillage(village: string) {
    return this.prisma.pincodeDirectory.findMany({
      where: { name: { equals: village.trim(), mode: 'insensitive' } },
      orderBy: { pincode: 'asc' },
    });
  }

  async findVillageAndPincode(village: string, pincode: string) {
    return this.prisma.pincodeDirectory.findFirst({
      where: {
        name: { equals: village.trim(), mode: 'insensitive' },
        pincode: pincode.trim(),
      },
    });
  }

  async searchVillage(query: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.pincodeDirectory.findMany({
      where: {
        name: { contains: query.trim(), mode: 'insensitive' },
      },
      distinct: ['name'],
      take: limit,
      skip: skip,
      orderBy: { name: 'asc' },
    });
    const total = await this.prisma.pincodeDirectory.count({
      where: {
        name: { contains: query.trim(), mode: 'insensitive' },
      },
    });
    return { items, total, page, limit };
  }

  async searchPincode(query: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.pincodeDirectory.findMany({
      where: {
        pincode: { startsWith: query.trim() },
      },
      distinct: ['pincode'],
      take: limit,
      skip: skip,
      orderBy: { pincode: 'asc' },
    });
    const total = await this.prisma.pincodeDirectory.count({
      where: {
        pincode: { startsWith: query.trim() },
      },
    });
    return { items, total, page, limit };
  }

  async searchLocation(query: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const trimmed = query.trim();
    const isPincode = /^\d+$/.test(trimmed);

    const where = isPincode
      ? { pincode: { startsWith: trimmed } }
      : {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' as const } },
            { district: { contains: trimmed, mode: 'insensitive' as const } },
            { block: { contains: trimmed, mode: 'insensitive' as const } },
            { state: { contains: trimmed, mode: 'insensitive' as const } },
          ],
        };

    const items = await this.prisma.pincodeDirectory.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: [{ pincode: 'asc' }, { name: 'asc' }],
    });

    const total = await this.prisma.pincodeDirectory.count({ where });
    return { items, total, page, limit };
  }

  // Hierarchical helper methods
  async getStates() {
    const records = await this.prisma.pincodeDirectory.findMany({
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    });
    return records.map(r => r.state);
  }

  async getDistricts(state: string) {
    const records = await this.prisma.pincodeDirectory.findMany({
      where: { state: { equals: state.trim(), mode: 'insensitive' } },
      select: { district: true },
      distinct: ['district'],
      orderBy: { district: 'asc' },
    });
    return records.map(r => r.district);
  }

  async getBlocks(state: string, district: string) {
    const records = await this.prisma.pincodeDirectory.findMany({
      where: {
        state: { equals: state.trim(), mode: 'insensitive' },
        district: { equals: district.trim(), mode: 'insensitive' },
      },
      select: { block: true },
      distinct: ['block'],
      orderBy: { block: 'asc' },
    });
    return records.map(r => r.block).filter(Boolean);
  }

  async getVillages(state: string, district: string, block: string) {
    const records = await this.prisma.pincodeDirectory.findMany({
      where: {
        state: { equals: state.trim(), mode: 'insensitive' },
        district: { equals: district.trim(), mode: 'insensitive' },
        block: block ? { equals: block.trim(), mode: 'insensitive' } : null,
      },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });
    return records.map(r => r.name);
  }

  async validateLocation(pincode: string, village: string, taluka: string, district: string, state: string) {
    const record = await this.prisma.pincodeDirectory.findFirst({
      where: {
        pincode: pincode.trim(),
        name: { equals: village.trim(), mode: 'insensitive' },
        block: taluka ? { equals: taluka.trim(), mode: 'insensitive' } : undefined,
        district: { equals: district.trim(), mode: 'insensitive' },
        state: { equals: state.trim(), mode: 'insensitive' },
      },
    });
    return !!record;
  }
}
