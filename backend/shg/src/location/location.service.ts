import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  // Centralized, reusable lookup methods
  async findByPincode(pincode: string) {
    return this.prisma.pincodeDirectory.findMany({
      where: { pincode: pincode.trim() },
      orderBy: { village: 'asc' },
    });
  }

  async findByVillage(village: string) {
    return this.prisma.pincodeDirectory.findMany({
      where: { village: { equals: village.trim(), mode: 'insensitive' } },
      orderBy: { pincode: 'asc' },
    });
  }

  async findVillageAndPincode(village: string, pincode: string) {
    return this.prisma.pincodeDirectory.findFirst({
      where: {
        village: { equals: village.trim(), mode: 'insensitive' },
        pincode: pincode.trim(),
      },
    });
  }

  async searchVillage(query: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.pincodeDirectory.findMany({
      where: {
        village: { contains: query.trim(), mode: 'insensitive' },
      },
      distinct: ['village'],
      take: limit,
      skip: skip,
      orderBy: { village: 'asc' },
    });
    const total = await this.prisma.pincodeDirectory.count({
      where: {
        village: { contains: query.trim(), mode: 'insensitive' },
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
            { village: { contains: trimmed, mode: 'insensitive' as const } },
            { district: { contains: trimmed, mode: 'insensitive' as const } },
            { taluka: { contains: trimmed, mode: 'insensitive' as const } },
            { state: { contains: trimmed, mode: 'insensitive' as const } },
          ],
        };

    const items = await this.prisma.pincodeDirectory.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: [{ pincode: 'asc' }, { village: 'asc' }],
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
      select: { taluka: true },
      distinct: ['taluka'],
      orderBy: { taluka: 'asc' },
    });
    return records.map(r => r.taluka).filter(Boolean);
  }

  async getVillages(state: string, district: string, block: string) {
    const records = await this.prisma.pincodeDirectory.findMany({
      where: {
        state: { equals: state.trim(), mode: 'insensitive' },
        district: { equals: district.trim(), mode: 'insensitive' },
        taluka: block ? { equals: block.trim(), mode: 'insensitive' } : undefined,
      },
      select: { village: true },
      distinct: ['village'],
      orderBy: { village: 'asc' },
    });
    return records.map(r => r.village);
  }

  async validateLocation(pincode: string, village: string, taluka: string, district: string, state: string) {
    const record = await this.prisma.pincodeDirectory.findFirst({
      where: {
        pincode: pincode.trim(),
        village: { equals: village.trim(), mode: 'insensitive' },
        taluka: taluka ? { equals: taluka.trim(), mode: 'insensitive' } : undefined,
        district: { equals: district.trim(), mode: 'insensitive' },
        state: { equals: state.trim(), mode: 'insensitive' },
      },
    });
    return !!record;
  }

  // Backward compatibility methods
  async getAddressFromPincode(pincode: string) {
    if (pincode.length !== 6) {
      throw new HttpException('Invalid pincode length', HttpStatus.BAD_REQUEST);
    }
    const records = await this.prisma.pincodeDirectory.findMany({
      where: { pincode: pincode.trim() },
    });

    if (records && records.length > 0) {
      const first = records[0];
      const villages = [...new Set(records.map((r: any) => r.village))].sort();
      return {
        state: first.state,
        district: first.district,
        taluka: first.taluka || first.district || 'N/A',
        villages: villages,
        postOffices: villages,
        source: 'local_db',
      };
    }
    throw new HttpException('Pincode details not found in directory', HttpStatus.NOT_FOUND);
  }

  async getBankFromIfsc(ifsc: string) {
    try {
      if (ifsc.length !== 11) {
        throw new HttpException('Invalid IFSC length', HttpStatus.BAD_REQUEST);
      }

      const response = await axios.get(`https://ifsc.razorpay.com/${ifsc}`, { timeout: 5000 });
      const data = response.data;

      return {
        bankName: data.BANK,
        branchName: data.BRANCH,
        city: data.CITY,
        state: data.STATE,
      };
    } catch (error) {
      console.error('IFSC Fetch Error:', error.message);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new HttpException('IFSC code not found', HttpStatus.NOT_FOUND);
      }
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Error fetching bank details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
