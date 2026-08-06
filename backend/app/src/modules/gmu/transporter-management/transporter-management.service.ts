import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TransporterManagementService {
  constructor(private prisma: PrismaService) {}

  async getTransporters(typeFilter: 'ROUTE_PARTNER' | 'PERSONAL', statusFilter: string | null) {
    const vehicleCategoryExpr = `COALESCE(td."vehicleCategory"::text, st4.data->>'vehicleCategory', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END)`;
    let condition = '';
    if (typeFilter === 'ROUTE_PARTNER') {
      condition = `AND ${vehicleCategoryExpr} = 'MILK_VAN'`;
    } else {
      condition = `AND (${vehicleCategoryExpr} IS NULL OR ${vehicleCategoryExpr} != 'MILK_VAN')`;
    }

    let statusQuery = '';
    if (statusFilter === 'PENDING') {
      statusQuery = `AND u."applicationStatus"::text IN ('COMPLETED', 'UNDER_REVIEW')`;
    } else if (statusFilter === 'APPROVED') {
      statusQuery = `AND u."applicationStatus"::text = 'APPROVED'`;
    } else if (statusFilter === 'REJECTED') {
      statusQuery = `AND u."applicationStatus"::text = 'REJECTED'`;
    }

    const query = `
      SELECT 
        u.id::text as "id",
        COALESCE(td."transporterCode", u."uniqueCode") as "transporterCode",
        u.role,
        u."fullName",
        u."phoneNumber" as "mobileNumber",
        u.email,
        COALESCE(u."profilePhoto", st1.data->>'profilePhoto') as "profilePhoto",
        u."createdAt",
        CASE 
          WHEN u."applicationStatus"::text IN ('PENDING', 'COMPLETED', 'UNDER_REVIEW') THEN 'PENDING'
          ELSE u."applicationStatus"::text
        END as "status",
        COALESCE(td."vehicleCategory"::text, st4.data->>'vehicleCategory', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END) as "vehicleCategory",
        COALESCE(td."experienceYears", (st2.data->>'experienceYears')::int, (st2.data->>'drivingExperience')::int) as "experienceYears",
        COALESCE(dd."licenseNumber", st2.data->>'licenseNumber') as "licenseNumber",
        COALESCE(dd."expiryDate", (st2.data->>'expiryDate')::timestamp) as "licenseExpiryDate",
        COALESCE(dd."drivingLicenseUrl", st2.data->>'licensePhoto', st2.data->>'drivingLicenseUrl') as "licensePhoto",
        bank."accountHolderName",
        bank."accountNumber",
        bank."ifscCode",
        bank."bankName",
        bank."branchName",
        bank."upiId",
        COALESCE(v."vehicleType"::text, st7.data->>'type', st5.data->>'type', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END) as "vehicleType",
        COALESCE(v."wheeler", st5.data->>'wheeler', st7.data->>'wheeler') as "wheeler",
        COALESCE(v."vehicleName", st5.data->>'make', st7.data->>'make') as "vehicleMake",
        COALESCE(v."registrationNumber", st5.data->>'number', st7.data->>'number') as "vehicleNumber",
        COALESCE(v."rcUrl", st5.data->>'rcUpload', st5.data->>'rcPhoto', st7.data->>'rcUpload', st7.data->>'rcPhoto') as "vehicleRcPhoto",
        COALESCE(v."insuranceUrl", st5.data->>'insuranceUpload', st5.data->>'insurancePhoto', st7.data->>'insuranceUpload', st7.data->>'insurancePhoto') as "vehicleInsurancePhoto",
        COALESCE(mv."sangathanName", st5.data->>'sangathanName') as "milkOrganizationName",
        COALESCE(mv."centerName", st5.data->>'centerName') as "milkCenterName",
        COALESCE(mv."assignedVillages", st6.data->'assignedVillages') as "assignedVillages",
        COALESCE(rd."pickupLocations", st6.data->'pickupLocations') as "assignedPincodes",
        null as "tmAssignedVillages",
        null as "tmAssignedPincodes",
        rd."operatingArea" as "operatingArea",
        rd."pickupLocations" as "pickupLocations",
        COALESCE(rd."workingDays", st6.data->'workingDays') as "workingDays",
        COALESCE(mv."morningShiftTime", st6.data->>'morningShiftTime') as "morningShift",
        COALESCE(mv."eveningShiftTime", st6.data->>'eveningShiftTime') as "eveningShift",
        concat(addr."houseNo", ' ', addr."deliveryAddress") as "residentialAddress",
        addr.village,
        addr.taluka,
        addr.district,
        addr.state,
        addr.pincode
      FROM public."User" u
      LEFT JOIN public."TransporterDetail" td ON u.id = td."userId"
      LEFT JOIN public."DrivingDetail" dd ON u.id = dd."userId"
      LEFT JOIN public."Document" doc ON u.id = doc."userId"
      LEFT JOIN public."Address" addr ON u.id = addr."userId"
      LEFT JOIN public."BankDetail" bank ON bank.id = (
        SELECT id FROM public."BankDetail" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN public."OtherDetails" v ON v.id = (
        SELECT id FROM public."OtherDetails" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
      LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
      LEFT JOIN public."StepTracking" st1 ON u.id = st1."userId" AND st1.step = 1
      LEFT JOIN public."StepTracking" st2 ON u.id = st2."userId" AND st2.step = 2
      LEFT JOIN public."StepTracking" st3 ON u.id = st3."userId" AND st3.step = 3
      LEFT JOIN public."StepTracking" st4 ON u.id = st4."userId" AND st4.step = 4
      LEFT JOIN public."StepTracking" st5 ON u.id = st5."userId" AND st5.step = 5
      LEFT JOIN public."StepTracking" st6 ON u.id = st6."userId" AND st6.step = 6
      LEFT JOIN public."StepTracking" st7 ON u.id = st7."userId" AND st7.step = 7
      WHERE u.role = 'TRANSPORTER'
      ${condition}
      ${statusQuery}
      ORDER BY u."createdAt" DESC
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(query);
    return results.map(item => this.formatTransporterItem(item, typeFilter));
  }

  private formatTransporterItem(item: any, typeFilter?: string) {
    const [firstName, ...rest] = (item.fullName || '').split(' ');
    
    const parseJsonArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
          return [parsed];
        } catch (e) {
          if (val.includes(',')) {
            return val.split(',').map(s => s.trim());
          }
          return [val];
        }
      }
      return [];
    };

    const rawVillages = item.tmAssignedVillages || item.assignedVillages;
    const rawPincodes = item.tmAssignedPincodes || item.assignedPincodes;

    let villages = parseJsonArray(rawVillages);
    let pincodes = parseJsonArray(rawPincodes);

    let pickupLocs: string[] = [];
    if (item.pickupLocations) {
      if (typeof item.pickupLocations === 'string') {
        pickupLocs = item.pickupLocations.split(',').map((v: string) => v.trim());
      } else if (Array.isArray(item.pickupLocations)) {
        pickupLocs = item.pickupLocations.map((v: any) => String(v).trim());
      }
    }

    if (villages.length === 0) {
      if (pickupLocs.length > 0) {
        villages = pickupLocs;
      } else if (item.operatingArea) {
        villages = item.operatingArea.split(',').map((v: string) => v.trim());
      } else if (item.village) {
        villages = [item.village];
      } else {
        villages = ['Nesari'];
      }
    }

    if (pincodes.length === 0) {
      if (pickupLocs.length > 0) {
        pincodes = pickupLocs.map((v: string) => {
          const match = v.match(/\d{6}/);
          return match ? match[0] : (item.pincode || '416504');
        });
      } else if (item.pincode) {
        pincodes = [item.pincode];
      } else {
        pincodes = ['416504'];
      }
    }

    if (pincodes.length < villages.length) {
      const lastPin = pincodes[pincodes.length - 1] || item.pincode || '416504';
      while (pincodes.length < villages.length) {
        pincodes.push(lastPin);
      }
    }

    return {
      ...item,
      type: typeFilter || (item.vehicleCategory === 'MILK_VAN' ? 'ROUTE_PARTNER' : 'PERSONAL'),
      firstName: firstName || '',
      lastName: rest.join(' ') || '',
      assignedVillages: villages,
      assignedPincodes: pincodes,
    };
  }

  async getRoutePartnerRequests() {
    return this.getTransporters('ROUTE_PARTNER', 'PENDING');
  }

  async getRoutePartnerMembers() {
    return this.getTransporters('ROUTE_PARTNER', 'APPROVED');
  }

  async getRoutePartnerRejected() {
    return this.getTransporters('ROUTE_PARTNER', 'REJECTED');
  }

  async getPersonalRequests() {
    return this.getTransporters('PERSONAL', 'PENDING');
  }

  async getPersonalMembers() {
    return this.getTransporters('PERSONAL', 'APPROVED');
  }

  async getPersonalRejected() {
    return this.getTransporters('PERSONAL', 'REJECTED');
  }

  private async getUserIdFromParamId(id: string): Promise<number> {
    if (/^[0-9]+$/.test(id)) {
      return parseInt(id, 10);
    }
    const userRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT u.id 
       FROM public."User" u
       LEFT JOIN public."TransporterDetail" td ON u.id = td."userId"
       WHERE u."uniqueCode" = $1 OR td."transporterCode" = $1 OR u."phoneNumber" = $1
       LIMIT 1`,
      id
    );
    if (userRows && userRows.length > 0) {
      return userRows[0].id;
    }
    throw new NotFoundException(`Transporter with ID ${id} not found`);
  }

  async getTransporterById(id: string) {
    const userId = await this.getUserIdFromParamId(id);

    const query = `
      SELECT 
        u.id::text as "id",
        COALESCE(td."transporterCode", u."uniqueCode") as "transporterCode",
        u.role,
        u."fullName",
        u."phoneNumber" as "mobileNumber",
        u.email,
        COALESCE(u."profilePhoto", st1.data->>'profilePhoto') as "profilePhoto",
        u."createdAt",
        CASE 
          WHEN u."applicationStatus"::text IN ('PENDING', 'COMPLETED', 'UNDER_REVIEW') THEN 'PENDING'
          ELSE u."applicationStatus"::text
        END as "status",
        COALESCE(td."vehicleCategory"::text, st4.data->>'vehicleCategory', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END) as "vehicleCategory",
        COALESCE(td."experienceYears", (st2.data->>'experienceYears')::int, (st2.data->>'drivingExperience')::int) as "experienceYears",
        COALESCE(dd."licenseNumber", st2.data->>'licenseNumber') as "licenseNumber",
        COALESCE(dd."expiryDate", (st2.data->>'expiryDate')::timestamp) as "licenseExpiryDate",
        COALESCE(dd."drivingLicenseUrl", st2.data->>'licensePhoto', st2.data->>'drivingLicenseUrl') as "licensePhoto",
        bank."accountHolderName",
        bank."accountNumber",
        bank."ifscCode",
        bank."bankName",
        bank."branchName",
        bank."upiId",
        COALESCE(v."vehicleType"::text, st7.data->>'type', st5.data->>'type', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END) as "vehicleType",
        COALESCE(v."wheeler", st5.data->>'wheeler', st7.data->>'wheeler') as "wheeler",
        COALESCE(v."vehicleName", st5.data->>'make', st7.data->>'make') as "vehicleMake",
        COALESCE(v."registrationNumber", st5.data->>'number', st7.data->>'number') as "vehicleNumber",
        COALESCE(v."rcUrl", st5.data->>'rcUpload', st5.data->>'rcPhoto', st7.data->>'rcUpload', st7.data->>'rcPhoto') as "vehicleRcPhoto",
        COALESCE(v."insuranceUrl", st5.data->>'insuranceUpload', st5.data->>'insurancePhoto', st7.data->>'insuranceUpload', st7.data->>'insurancePhoto') as "vehicleInsurancePhoto",
        COALESCE(mv."sangathanName", st5.data->>'sangathanName') as "milkOrganizationName",
        COALESCE(mv."centerName", st5.data->>'centerName') as "milkCenterName",
        COALESCE(mv."assignedVillages", st6.data->'assignedVillages') as "assignedVillages",
        COALESCE(rd."pickupLocations", st6.data->'pickupLocations') as "assignedPincodes",
        null as "tmAssignedVillages",
        null as "tmAssignedPincodes",
        rd."operatingArea" as "operatingArea",
        rd."pickupLocations" as "pickupLocations",
        COALESCE(rd."workingDays", st6.data->'workingDays') as "workingDays",
        COALESCE(mv."morningShiftTime", st6.data->>'morningShiftTime') as "morningShift",
        COALESCE(mv."eveningShiftTime", st6.data->>'eveningShiftTime') as "eveningShift",
        concat(addr."houseNo", ' ', addr."deliveryAddress") as "residentialAddress",
        addr.village,
        addr.taluka,
        addr.district,
        addr.state,
        addr.pincode
      FROM public."User" u
      LEFT JOIN public."TransporterDetail" td ON u.id = td."userId"
      LEFT JOIN public."DrivingDetail" dd ON u.id = dd."userId"
      LEFT JOIN public."Document" doc ON u.id = doc."userId"
      LEFT JOIN public."Address" addr ON u.id = addr."userId"
      LEFT JOIN public."BankDetail" bank ON bank.id = (
        SELECT id FROM public."BankDetail" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN public."OtherDetails" v ON v.id = (
        SELECT id FROM public."OtherDetails" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
      LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
      LEFT JOIN public."StepTracking" st1 ON u.id = st1."userId" AND st1.step = 1
      LEFT JOIN public."StepTracking" st2 ON u.id = st2."userId" AND st2.step = 2
      LEFT JOIN public."StepTracking" st3 ON u.id = st3."userId" AND st3.step = 3
      LEFT JOIN public."StepTracking" st4 ON u.id = st4."userId" AND st4.step = 4
      LEFT JOIN public."StepTracking" st5 ON u.id = st5."userId" AND st5.step = 5
      LEFT JOIN public."StepTracking" st6 ON u.id = st6."userId" AND st6.step = 6
      LEFT JOIN public."StepTracking" st7 ON u.id = st7."userId" AND st7.step = 7
      WHERE u.id = ${userId}
      LIMIT 1
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(query);
    if (!results || results.length === 0) {
      throw new NotFoundException(`Transporter member with ID ${id} not found`);
    }
    return this.formatTransporterItem(results[0]);
  }

  async approveTransporter(id: string) {
    const userId = await this.getUserIdFromParamId(id);

    await this.prisma.$executeRaw`
      UPDATE public."User"
      SET "applicationStatus" = 'APPROVED'::public."ApplicationStatus",
          "approvedAt" = NOW(),
          "rejectedAt" = NULL
      WHERE id = ${userId}
    `;
    return { success: true };
  }

  async rejectTransporter(id: string) {
    const userId = await this.getUserIdFromParamId(id);

    await this.prisma.$executeRaw`
      UPDATE public."User"
      SET "applicationStatus" = 'REJECTED'::public."ApplicationStatus",
          "rejectedAt" = NOW(),
          "approvedAt" = NULL
      WHERE id = ${userId}
    `;
    return { success: true };
  }
}
