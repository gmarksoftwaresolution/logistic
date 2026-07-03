import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransporterManagementService {
  constructor(private prisma: PrismaService) { }

  // Common method to fetch transporters from public schema
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
        COALESCE(tm.id::text, u.id::text) as "id",
        COALESCE(td."transporterCode", u."uniqueCode") as "transporterCode",
        u.role,
        u."fullName",
        u."phoneNumber" as "mobileNumber",
        u.email,
        u."profilePhoto",
        u."createdAt",
        CASE 
          WHEN u."applicationStatus"::text IN ('PENDING', 'COMPLETED', 'UNDER_REVIEW') THEN 'PENDING'
          ELSE u."applicationStatus"::text
        END as "status",
        COALESCE(td."vehicleCategory"::text, st4.data->>'vehicleCategory', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END) as "vehicleCategory",
        COALESCE(td."experienceYears", (st2.data->>'experienceYears')::int, (st2.data->>'drivingExperience')::int) as "experienceYears",
        COALESCE(dd."licenseNumber", st2.data->>'licenseNumber') as "licenseNumber",
        COALESCE(dd."expiryDate", (st2.data->>'expiryDate')::timestamp) as "licenseExpiryDate",
        COALESCE(dd."drivingLicenseUrl", st2.data->>'licensePhoto') as "licensePhoto",
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
        COALESCE(v."rcUrl", st5.data->>'rcUpload', st7.data->>'rcUpload') as "vehicleRcPhoto",
        COALESCE(v."insuranceUrl", st5.data->>'insuranceUpload', st7.data->>'insuranceUpload') as "vehicleInsurancePhoto",
        COALESCE(mv."sangathanName", st5.data->>'sangathanName') as "milkOrganizationName",
        COALESCE(mv."centerName", st5.data->>'centerName') as "milkCenterName",
        COALESCE(mv."assignedVillages", st6.data->'assignedVillages') as "assignedVillages",
        COALESCE(rd."pickupLocations", st6.data->'pickupLocations') as "assignedPincodes",
        tm."assignedVillages" as "tmAssignedVillages",
        tm."assignedPincodes" as "tmAssignedPincodes",
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
      LEFT JOIN gmu."TransporterMember" tm ON tm."transporterCode" = COALESCE(td."transporterCode", u."uniqueCode")
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
    const member = await this.prisma.transporterMember.findUnique({
      where: { id }
    });
    if (member && member.transporterCode) {
      const userRows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT u.id 
         FROM public."User" u
         LEFT JOIN public."TransporterDetail" td ON u.id = td."userId"
         WHERE u."uniqueCode" = $1 OR td."transporterCode" = $1 
         LIMIT 1`,
        member.transporterCode
      );
      if (userRows && userRows.length > 0) {
        return userRows[0].id;
      }
    }
    throw new NotFoundException(`Transporter with ID ${id} not found`);
  }

  async getTransporterById(id: string) {
    const userId = await this.getUserIdFromParamId(id);

    const query = `
      SELECT 
        COALESCE(tm.id::text, u.id::text) as "id",
        COALESCE(td."transporterCode", u."uniqueCode") as "transporterCode",
        u.role,
        u."fullName",
        u."phoneNumber" as "mobileNumber",
        u.email,
        u."profilePhoto",
        u."createdAt",
        CASE 
          WHEN u."applicationStatus"::text IN ('PENDING', 'COMPLETED', 'UNDER_REVIEW') THEN 'PENDING'
          ELSE u."applicationStatus"::text
        END as "status",
        COALESCE(td."vehicleCategory"::text, st4.data->>'vehicleCategory', CASE WHEN st7.id IS NOT NULL THEN 'MILK_VAN' WHEN st5.id IS NOT NULL THEN 'OTHER' ELSE NULL END) as "vehicleCategory",
        COALESCE(td."experienceYears", (st2.data->>'experienceYears')::int, (st2.data->>'drivingExperience')::int) as "experienceYears",
        COALESCE(dd."licenseNumber", st2.data->>'licenseNumber') as "licenseNumber",
        COALESCE(dd."expiryDate", (st2.data->>'expiryDate')::timestamp) as "licenseExpiryDate",
        COALESCE(dd."drivingLicenseUrl", st2.data->>'licensePhoto') as "licensePhoto",
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
        COALESCE(v."rcUrl", st5.data->>'rcUpload', st7.data->>'rcUpload') as "vehicleRcPhoto",
        COALESCE(v."insuranceUrl", st5.data->>'insuranceUpload', st7.data->>'insuranceUpload') as "vehicleInsurancePhoto",
        COALESCE(mv."sangathanName", st5.data->>'sangathanName') as "milkOrganizationName",
        COALESCE(mv."centerName", st5.data->>'centerName') as "milkCenterName",
        COALESCE(mv."assignedVillages", st6.data->'assignedVillages') as "assignedVillages",
        COALESCE(rd."pickupLocations", st6.data->'pickupLocations') as "assignedPincodes",
        tm."assignedVillages" as "tmAssignedVillages",
        tm."assignedPincodes" as "tmAssignedPincodes",
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
      LEFT JOIN gmu."TransporterMember" tm ON tm."transporterCode" = COALESCE(td."transporterCode", u."uniqueCode")
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

    await this.populateTransporterDetails(userId);

    return { success: true };
  }

  private async populateTransporterDetails(userId: number) {
    const [userRows, steps] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          u.id, u."fullName", u."phoneNumber", u.email, u."profilePhoto", u."uniqueCode",
          addr.id as "addrId", addr."houseNo", addr.state, addr.district, addr.taluka, addr.village, addr.pincode,
          bank.id as "bankId", bank."accountHolderName", bank."accountNumber", bank."ifscCode", bank."bankName", bank."branchName", bank."upiId",
          dd.id as "ddId",
          td.id as "tdId", td."transporterCode" as "tdTransporterCode",
          mv.id as "mvId",
          rd.id as "rdId",
          v.id as "vId"
         FROM public."User" u
         LEFT JOIN public."Address" addr ON u.id = addr."userId"
         LEFT JOIN public."BankDetail" bank ON bank.id = (
           SELECT id FROM public."BankDetail" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
         )
         LEFT JOIN public."DrivingDetail" dd ON u.id = dd."userId"
         LEFT JOIN public."TransporterDetail" td ON u.id = td."userId"
         LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
         LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
         LEFT JOIN public."OtherDetails" v ON v.id = (
           SELECT id FROM public."OtherDetails" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
         )
         WHERE u.id = $1 LIMIT 1`,
        userId
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public."StepTracking" WHERE "userId" = $1`,
        userId
      )
    ]);

    if (!userRows || userRows.length === 0) return;
    const userRow = userRows[0];

    const user = {
      id: userRow.id,
      fullName: userRow.fullName,
      phoneNumber: userRow.phoneNumber,
      email: userRow.email,
      profilePhoto: userRow.profilePhoto,
      uniqueCode: userRow.uniqueCode,
    };

    const address = userRow.addrId ? {
      houseNo: userRow.houseNo,
      state: userRow.state,
      district: userRow.district,
      taluka: userRow.taluka,
      village: userRow.village,
      pincode: userRow.pincode,
    } : null;

    const bank = userRow.bankId ? {
      accountHolderName: userRow.accountHolderName,
      accountNumber: userRow.accountNumber,
      ifscCode: userRow.ifscCode,
      bankName: userRow.bankName,
      branchName: userRow.branchName,
      upiId: userRow.upiId,
    } : null;

    const existingDriving = userRow.ddId ? [{ id: userRow.ddId }] : [];
    const existingTransporter = userRow.tdId ? [{ id: userRow.tdId }] : [];
    const existingMilkVan = userRow.mvId ? [{ id: userRow.mvId }] : [];
    const existingRoute = userRow.rdId ? [{ id: userRow.rdId }] : [];
    const existingVehicles = userRow.vId ? [{ id: userRow.vId }] : [];

    const stepData: Record<number, any> = {};
    for (const step of steps) {
      stepData[step.step] = typeof step.data === 'string' ? JSON.parse(step.data) : step.data;
    }

    const writePromises: Promise<any>[] = [];

    // 1. Driving Detail (Step 2)
    const s2 = stepData[2];
    if (s2) {
      if (existingDriving.length > 0) {
        writePromises.push(
          this.prisma.$executeRawUnsafe(
            `UPDATE public."DrivingDetail"
             SET "licenseNumber" = $1,
                 "expiryDate" = $2::timestamp,
                 "drivingExperience" = $3,
                 "drivingLicenseNo" = $4,
                 "drivingLicenseUrl" = $5,
                 "updatedAt" = NOW()
             WHERE "userId" = $6`,
            s2.licenseNumber,
            new Date(s2.expiryDate).toISOString(),
            s2.experienceYears,
            s2.licenseNumber,
            s2.licensePhoto,
            userId
          )
        );
      } else {
        writePromises.push(
          this.prisma.$executeRawUnsafe(
            `INSERT INTO public."DrivingDetail" (
               "userId", "licenseNumber", "expiryDate", "drivingExperience", "drivingLicenseNo", "drivingLicenseUrl", "createdAt", "updatedAt"
             ) VALUES ($1, $2, $3::timestamp, $4, $5, $6, NOW(), NOW())`,
            userId,
            s2.licenseNumber,
            new Date(s2.expiryDate).toISOString(),
            s2.experienceYears,
            s2.licenseNumber,
            s2.licensePhoto
          )
        );
      }
    }

    // 2. Transporter Detail (Step 4 & Step 2 driving experience)
    const s4 = stepData[4];
    const vehicleCategory = (s4 && s4.vehicleCategory === 'MILK_VAN') ? 'MILK_VAN' : 'OTHER';

    if (existingTransporter.length > 0) {
      writePromises.push(
        this.prisma.$executeRawUnsafe(
          `UPDATE public."TransporterDetail"
           SET "transporterCode" = COALESCE("transporterCode", $1),
               "vehicleCategory" = $2::public."VehicleType",
               "experienceYears" = $3,
               "updatedAt" = NOW()
           WHERE "userId" = $4`,
          user.uniqueCode || null,
          vehicleCategory,
          s2?.experienceYears || null,
          userId
        )
      );
    } else {
      writePromises.push(
        this.prisma.$executeRawUnsafe(
          `INSERT INTO public."TransporterDetail" (
             "userId", "transporterCode", "vehicleCategory", "experienceYears", "createdAt", "updatedAt"
           ) VALUES ($1, $2, $3::public."VehicleType", $4, NOW(), NOW())`,
          userId,
          user.uniqueCode || null,
          vehicleCategory,
          s2?.experienceYears || null
        )
      );
    }

    // 3. Milk Van Detail (Step 5 Milk Van & Step 6 Milk Van)
    const s5mv = stepData[5];
    const s6mv = stepData[6];
    if (vehicleCategory === 'MILK_VAN') {
      if (s5mv || s6mv) {
        if (existingMilkVan.length > 0) {
          writePromises.push(
            this.prisma.$executeRawUnsafe(
              `UPDATE public."MilkVanDetail"
               SET "sangathanName" = $1,
                   "centerName" = $2,
                   "assignedVillages" = $3::json,
                   "morningShiftTime" = $4,
                   "eveningShiftTime" = $5,
                   "updatedAt" = NOW()
               WHERE "userId" = $6`,
              s5mv?.sangathanName || '',
              s5mv?.centerName || '',
              s6mv?.assignedVillages ? JSON.stringify(s6mv.assignedVillages) : null,
              s6mv?.morningShiftTime || null,
              s6mv?.eveningShiftTime || null,
              userId
            )
          );
        } else {
          writePromises.push(
            this.prisma.$executeRawUnsafe(
              `INSERT INTO public."MilkVanDetail" (
                 "userId", "sangathanName", "centerName", "assignedVillages", "morningShiftTime", "eveningShiftTime", "createdAt", "updatedAt"
               ) VALUES ($1, $2, $3, $4::json, $5, $6, NOW(), NOW())`,
              userId,
              s5mv?.sangathanName || '',
              s5mv?.centerName || '',
              s6mv?.assignedVillages ? JSON.stringify(s6mv.assignedVillages) : null,
              s6mv?.morningShiftTime || null,
              s6mv?.eveningShiftTime || null
            )
          );
        }
      }
    }

    // 4. Route Detail (Step 6 Personal or Step 6 Milk Van)
    const s6p = stepData[6];
    if (vehicleCategory === 'MILK_VAN') {
      if (s6mv) {
        const operatingAreaVal = Array.isArray(s6mv.assignedVillages)
          ? s6mv.assignedVillages.join(', ')
          : 'Milk Van Route';
        if (existingRoute.length > 0) {
          writePromises.push(
            this.prisma.$executeRawUnsafe(
              `UPDATE public."RouteDetail"
               SET "operatingArea" = $1,
                   "workingDays" = $2::json,
                   "workingSchedule" = $3::json,
                   "updatedAt" = NOW()
               WHERE "userId" = $4`,
              operatingAreaVal,
              s6mv.workingDays ? JSON.stringify(s6mv.workingDays) : null,
              s6mv.workingSchedule ? JSON.stringify(s6mv.workingSchedule) : null,
              userId
            )
          );
        } else {
          writePromises.push(
            this.prisma.$executeRawUnsafe(
              `INSERT INTO public."RouteDetail" (
                 "userId", "operatingArea", "workingDays", "workingSchedule", "createdAt", "updatedAt"
               ) VALUES ($1, $2, $3::json, $4::json, NOW(), NOW())`,
              userId,
              operatingAreaVal,
              s6mv.workingDays ? JSON.stringify(s6mv.workingDays) : null,
              s6mv.workingSchedule ? JSON.stringify(s6mv.workingSchedule) : null
            )
          );
        }
      }
    } else {
      if (s6p) {
        if (existingRoute.length > 0) {
          writePromises.push(
            this.prisma.$executeRawUnsafe(
              `UPDATE public."RouteDetail"
               SET "operatingArea" = $1,
                   "pickupLocations" = $2::json,
                   "dropLocations" = $3::json,
                   "workingDays" = $4::json,
                   "workingSchedule" = $5::json,
                   "updatedAt" = NOW()
               WHERE "userId" = $6`,
              s6p.operatingArea || '',
              s6p.pickupLocations ? JSON.stringify(s6p.pickupLocations) : null,
              s6p.dropLocations ? JSON.stringify(s6p.dropLocations) : null,
              s6p.workingDays ? JSON.stringify(s6p.workingDays) : null,
              s6p.workingSchedule ? JSON.stringify(s6p.workingSchedule) : null,
              userId
            )
          );
        } else {
          writePromises.push(
            this.prisma.$executeRawUnsafe(
              `INSERT INTO public."RouteDetail" (
                 "userId", "operatingArea", "pickupLocations", "dropLocations", "workingDays", "workingSchedule", "createdAt", "updatedAt"
               ) VALUES ($1, $2, $3::json, $4::json, $5::json, $6::json, NOW(), NOW())`,
              userId,
              s6p.operatingArea || '',
              s6p.pickupLocations ? JSON.stringify(s6p.pickupLocations) : null,
              s6p.dropLocations ? JSON.stringify(s6p.dropLocations) : null,
              s6p.workingDays ? JSON.stringify(s6p.workingDays) : null,
              s6p.workingSchedule ? JSON.stringify(s6p.workingSchedule) : null
            )
          );
        }
      }
    }

    // 5. Other Details (Step 5 Personal or Step 7 Milk Van)
    const s5p = stepData[5];
    const s7mv = stepData[7];
    const vehicleInfo = vehicleCategory === 'MILK_VAN' ? s7mv : s5p;
    if (vehicleInfo) {
      if (existingVehicles.length > 0) {
        writePromises.push(
          this.prisma.$executeRawUnsafe(
            `UPDATE public."OtherDetails"
             SET "vehicleType" = $1,
                 "vehicleName" = $2,
                 "registrationNumber" = $3,
                 "rcUrl" = $4,
                 "insuranceUrl" = $5,
                 "wheeler" = $6,
                 "updatedAt" = NOW()
             WHERE id = $7`,
            vehicleInfo.type || (vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER'),
            vehicleInfo.make || null,
            vehicleInfo.number || null,
            vehicleInfo.rcUpload || null,
            vehicleInfo.insuranceUpload || null,
            vehicleInfo.wheeler || null,
            existingVehicles[0].id
          )
        );
      } else {
        writePromises.push(
          this.prisma.$executeRawUnsafe(
            `INSERT INTO public."OtherDetails" (
               "userId", "vehicleType", "vehicleName", "registrationNumber", "rcUrl", "insuranceUrl", "wheeler", "createdAt", "updatedAt"
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            userId,
            vehicleInfo.type || (vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER'),
            vehicleInfo.make || null,
            vehicleInfo.number || null,
            vehicleInfo.rcUpload || null,
            vehicleInfo.insuranceUpload || null,
            vehicleInfo.wheeler || null
          )
        );
      }
    }

    // 6. Also populate the TransporterMember table in the gmu schema!
    const [firstName, ...lastNameParts] = (user.fullName || '').split(' ');
    const lastName = lastNameParts.join(' ');
    const transporterCode = userRow.tdTransporterCode || user.uniqueCode || `TR-${userId}`;

    writePromises.push(
      this.prisma.transporterMember.upsert({
        where: { transporterCode: transporterCode },
        update: {
          type: vehicleCategory === 'MILK_VAN' ? 'ROUTE_PARTNER' : 'PERSONAL',
          status: 'APPROVED',
          approvedAt: new Date(),
          profilePhoto: user.profilePhoto || null,
          firstName: firstName || '',
          lastName: lastName || '',
          mobileNumber: user.phoneNumber,
          email: user.email || null,
          residentialAddress: address?.houseNo || null,
          village: address?.village || null,
          taluka: address?.taluka || null,
          district: address?.district || null,
          state: address?.state || null,
          pincode: address?.pincode || null,
          licenseNumber: s2?.licenseNumber || null,
          licensePhoto: s2?.licensePhoto || null,
          licenseExpiryDate: s2?.expiryDate ? new Date(s2.expiryDate) : null,
          experienceYears: s2?.experienceYears || null,
          accountHolderName: bank?.accountHolderName || null,
          accountNumber: bank?.accountNumber || null,
          ifscCode: bank?.ifscCode || null,
          bankName: bank?.bankName || null,
          branchName: bank?.branchName || null,
          upiId: bank?.upiId || null,
          vehicleCategory: vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'PERSONAL',
          vehicleType: vehicleInfo?.type || (vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER'),
          vehicleMake: vehicleInfo?.make || null,
          vehicleNumber: vehicleInfo?.number || null,
          vehicleRcPhoto: vehicleInfo?.rcUpload || null,
          vehicleInsurancePhoto: vehicleInfo?.insuranceUpload || null,
          assignedPincodes: s6p?.pickupLocations || null,
          assignedVillages: s6mv?.assignedVillages || null,
          morningShift: s6mv?.morningShiftTime || null,
          eveningShift: s6mv?.eveningShiftTime || null,
          workingDays: vehicleCategory === 'MILK_VAN' ? (s6mv?.workingDays || null) : (s6p?.workingDays || null),
          milkOrganizationName: s5mv?.sangathanName || null,
          milkCenterName: s5mv?.centerName || null,
        },
        create: {
          transporterCode: transporterCode,
          type: vehicleCategory === 'MILK_VAN' ? 'ROUTE_PARTNER' : 'PERSONAL',
          status: 'APPROVED',
          approvedAt: new Date(),
          profilePhoto: user.profilePhoto || null,
          firstName: firstName || '',
          lastName: lastName || '',
          mobileNumber: user.phoneNumber,
          email: user.email || null,
          residentialAddress: address?.houseNo || null,
          village: address?.village || null,
          taluka: address?.taluka || null,
          district: address?.district || null,
          state: address?.state || null,
          pincode: address?.pincode || null,
          licenseNumber: s2?.licenseNumber || null,
          licensePhoto: s2?.licensePhoto || null,
          licenseExpiryDate: s2?.expiryDate ? new Date(s2.expiryDate) : null,
          experienceYears: s2?.experienceYears || null,
          accountHolderName: bank?.accountHolderName || null,
          accountNumber: bank?.accountNumber || null,
          ifscCode: bank?.ifscCode || null,
          bankName: bank?.bankName || null,
          branchName: bank?.branchName || null,
          upiId: bank?.upiId || null,
          vehicleCategory: vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'PERSONAL',
          vehicleType: vehicleInfo?.type || (vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER'),
          vehicleMake: vehicleInfo?.make || null,
          vehicleNumber: vehicleInfo?.number || null,
          vehicleRcPhoto: vehicleInfo?.rcUpload || null,
          vehicleInsurancePhoto: vehicleInfo?.insuranceUpload || null,
          assignedPincodes: s6p?.pickupLocations || null,
          assignedVillages: s6mv?.assignedVillages || null,
          morningShift: s6mv?.morningShiftTime || null,
          eveningShift: s6mv?.eveningShiftTime || null,
          workingDays: vehicleCategory === 'MILK_VAN' ? (s6mv?.workingDays || null) : (s6p?.workingDays || null),
          milkOrganizationName: s5mv?.sangathanName || null,
          milkCenterName: s5mv?.centerName || null,
        }
      })
    );

    await Promise.all(writePromises);
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
