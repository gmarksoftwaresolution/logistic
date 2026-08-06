import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CommunityManagementService {
  constructor(private prisma: PrismaService) {}

  async getCommunityMembers(role: 'SHG' | 'INDIVIDUAL', statusFilter: string | null) {
    let statusQuery = '';
    if (statusFilter === 'PENDING') {
      statusQuery = `AND COALESCE(app.status, u."applicationStatus")::text = 'PENDING'`;
    } else if (statusFilter === 'APPROVED') {
      statusQuery = `AND COALESCE(app.status, u."applicationStatus")::text = 'APPROVED'`;
    } else if (statusFilter === 'REJECTED') {
      statusQuery = `AND COALESCE(app.status, u."applicationStatus")::text = 'REJECTED'`;
    }

    const query = `
      SELECT 
        u.id,
        u."uniqueCode" as "memberCode",
        u.role,
        u."fullName",
        u."phoneNumber" as "mobileNumber",
        u."profilePhoto",
        u."createdAt",
        COALESCE(app.status, u."applicationStatus")::text as "status",
        COALESCE(sd."shgName", st2.data->>'shgName', CASE WHEN u.role = 'INDIVIDUAL' THEN u."fullName" ELSE null END) as "shgName",
        COALESCE(sd."shgRole"::text, st2.data->>'shgRole') as "roleInShg",
        COALESCE(sd."crpName", st2.data->>'crpName') as "crpName",
        COALESCE(sd."crpMobile", st2.data->>'crpMobile') as "crpMobile",
        COALESCE(sd."crpEmail", st2.data->>'crpEmail') as "crpEmail",
        COALESCE(sd."shgLeaderName", st2.data->>'shgLeaderName', CASE WHEN u.role = 'INDIVIDUAL' THEN u."fullName" ELSE null END) as "leaderName",
        COALESCE(sd."shgLeaderContact", st2.data->>'shgLeaderContact', CASE WHEN u.role = 'INDIVIDUAL' THEN u."phoneNumber" ELSE null END) as "leaderMobile",
        COALESCE(sd."fullName", st2.data->>'fullName', u."fullName") as "shgMemberName",
        null as "shgCrpName",
        COALESCE(sd."groupSize", (st2.data->>'shgGroupSize')::int, (st2.data->>'groupSize')::int) as "groupSize",
        COALESCE(sd."createdAt", st2."createdAt") as "activeSince",
        COALESCE(bd."producesProduct", (st3.data->>'producesProduct')::boolean, false) as "producesProducts",
        COALESCE(bd."businessTeamSize", (st3.data->>'businessTeamSize')::int) as "businessTeamSize",
        COALESCE(v."storageSpace", st7.data->>'storageSpace') as "storageSpace",
        addr."houseNo" as "houseNo",
        COALESCE(addr."deliveryAddress", addr.landmark) as "deliveryAddress",
        addr.village,
        addr.taluka,
        addr.district,
        addr.state,
        addr.pincode,
        addr."postOffice" as "postOffice",
        doc."aadhaarNumber",
        doc."panNumber",
        COALESCE(doc."aadhaarFrontUrl", st5.data->>'aadhaarFrontUrl', st5.data->>'aadhaarFront') as "aadhaarFrontPhoto",
        COALESCE(doc."aadhaarBackUrl", st5.data->>'aadhaarBackUrl', st5.data->>'aadhaarBack') as "aadhaarBackPhoto",
        COALESCE(doc."panCardUrl", st5.data->>'panCardUrl', st5.data->>'panImage') as "panCardPhoto",
        bank."accountHolderName",
        bank."accountNumber",
        bank."ifscCode",
        bank."bankName",
        bank."branchName",
        bank."upiId",
        COALESCE(v."vehicleType"::text, st7.data->'vehicle'->>'vehicleType') as "vehicleType",
        COALESCE(v."registrationNumber", st7.data->'vehicle'->>'vehicleRegistrationNo', st7.data->'vehicle'->>'registrationNumber') as "vehicleRegistrationNumber",
        COALESCE(v."licenseNumber", st7.data->'vehicle'->>'drivingLicenseNumber', st7.data->'vehicle'->>'licenseNumber') as "drivingLicenseNumber",
        COALESCE(v."DLurl", st7.data->'vehicle'->>'drivingLicenseImageUrl', st7.data->'vehicle'->>'drivingLicensePhoto') as "drivingLicensePhoto",
        COALESCE(v."vehicleImageUrl", st7.data->'vehicle'->>'vehicleImageUrl', st7.data->'vehicle'->>'vehiclePhoto') as "vehiclePhoto",
        CASE WHEN (v.id IS NOT NULL AND (v."registrationNumber" IS NOT NULL OR v."vehicleImageUrl" IS NOT NULL OR v."DLurl" IS NOT NULL)) OR (st7.id IS NOT NULL AND (st7.data->'vehicle'->>'vehicleRegistrationNo' IS NOT NULL OR st7.data->'vehicle'->>'vehicleImageUrl' IS NOT NULL OR st7.data->'vehicle'->>'drivingLicenseImageUrl' IS NOT NULL)) THEN true ELSE false END as "vehicleAvailable",
        COALESCE(v.width, (st7.data->>'storageWidth')::float) as "storageWidth",
        COALESCE(v.heihgt, (st7.data->>'storageLength')::float, (st7.data->>'storageHeight')::float) as "storageHeight",
        COALESCE(prod.name, st3.data->'products'->0->>'productName') as "productName",
        COALESCE(prod.category, st3.data->'products'->0->>'category') as "productCategory",
        COALESCE(prod.price, (st3.data->'products'->0->>'price')::float) as "pricePerUnit",
        COALESCE(prod."dailyProduction", (st3.data->'products'->0->>'dailyProductionQty')::float) as "dailyProduction",
        COALESCE(prod."weeklyProduction", (st3.data->'products'->0->>'weeklyProduction')::float) as "weeklyProduction",
        COALESCE(prod."Unit", st3.data->'products'->0->>'unit') as "productionUnit",
        COALESCE(sd.age, (st1.data->>'age')::int, 0) as "age"
      FROM public."User" u
      LEFT JOIN LATERAL (
        SELECT status, "createdAt"
        FROM public."Application"
        WHERE "userId" = u.id
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) app ON true
      LEFT JOIN public."ShgDetail" sd ON u.id = sd."userId"
      LEFT JOIN public."BusinessDetail" bd ON u.id = bd."userId"
      LEFT JOIN public."Address" addr ON u.id = addr."userId"
      LEFT JOIN public."Document" doc ON u.id = doc."userId"
      LEFT JOIN public."BankDetail" bank ON bank.id = (
        SELECT id FROM public."BankDetail" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN public."OtherDetails" v ON v.id = (
        SELECT id FROM public."OtherDetails" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN LATERAL (
        SELECT name, category, price, "dailyProduction", "Unit", "weeklyProduction"
        FROM public."products"
        WHERE "seller_id" = u.id
        ORDER BY "created_at" ASC
        LIMIT 1
      ) prod ON true
      LEFT JOIN public."StepTracking" st1 ON u.id = st1."userId" AND st1.step = 1
      LEFT JOIN public."StepTracking" st2 ON u.id = st2."userId" AND st2.step = 2
      LEFT JOIN public."StepTracking" st3 ON u.id = st3."userId" AND st3.step = 3
      LEFT JOIN public."StepTracking" st5 ON u.id = st5."userId" AND st5.step = 5
      LEFT JOIN public."StepTracking" st7 ON u.id = st7."userId" AND st7.step = 7
      WHERE u.role = '${role}'
      AND u."currentStep" = 7
      ${statusQuery}
      ORDER BY u."createdAt" DESC
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(query);
    return results.map(item => ({
      ...item,
      type: role === 'SHG' ? 'SHG' : 'INDIVIDUAL'
    }));
  }

  async getShgRequests() {
    return this.getCommunityMembers('SHG', 'PENDING');
  }

  async getShgMembers() {
    return this.getCommunityMembers('SHG', 'APPROVED');
  }

  async getShgRejected() {
    return this.getCommunityMembers('SHG', 'REJECTED');
  }

  async getIndividualRequests() {
    return this.getCommunityMembers('INDIVIDUAL', 'PENDING');
  }

  async getIndividualMembers() {
    return this.getCommunityMembers('INDIVIDUAL', 'APPROVED');
  }

  async getIndividualRejected() {
    return this.getCommunityMembers('INDIVIDUAL', 'REJECTED');
  }

  private async resolveUserId(id: string): Promise<number> {
    if (/^[0-9]+$/.test(id)) {
      const u = await this.prisma.user.findUnique({ where: { id: parseInt(id, 10) } });
      if (u) return u.id;
    }
    const userRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT u.id 
       FROM public."User" u
       LEFT JOIN public."ShgDetail" sd ON u.id = sd."userId"
       WHERE u."uniqueCode" = $1 OR sd."memberCode" = $1 OR u."phoneNumber" = $1
       LIMIT 1`,
      id
    );
    if (userRows && userRows.length > 0) {
      return userRows[0].id;
    }
    throw new NotFoundException(`Invalid member ID: ${id}`);
  }

  async getMemberById(id: string) {
    const userId = await this.resolveUserId(id);

    const query = `
      SELECT 
        u.id,
        u."uniqueCode" as "memberCode",
        u.role,
        u."fullName",
        u."phoneNumber" as "mobileNumber",
        u."profilePhoto",
        u."createdAt",
        COALESCE(app.status, u."applicationStatus")::text as "status",
        COALESCE(sd."shgName", st2.data->>'shgName', CASE WHEN u.role = 'INDIVIDUAL' THEN u."fullName" ELSE null END) as "shgName",
        COALESCE(sd."shgRole"::text, st2.data->>'shgRole') as "roleInShg",
        COALESCE(sd."crpName", st2.data->>'crpName') as "crpName",
        COALESCE(sd."crpMobile", st2.data->>'crpMobile') as "crpMobile",
        COALESCE(sd."crpEmail", st2.data->>'crpEmail') as "crpEmail",
        COALESCE(sd."shgLeaderName", st2.data->>'shgLeaderName', CASE WHEN u.role = 'INDIVIDUAL' THEN u."fullName" ELSE null END) as "leaderName",
        COALESCE(sd."shgLeaderContact", st2.data->>'shgLeaderContact', CASE WHEN u.role = 'INDIVIDUAL' THEN u."phoneNumber" ELSE null END) as "leaderMobile",
        COALESCE(sd."fullName", st2.data->>'fullName', u."fullName") as "shgMemberName",
        null as "shgCrpName",
        COALESCE(sd."groupSize", (st2.data->>'shgGroupSize')::int, (st2.data->>'groupSize')::int) as "groupSize",
        COALESCE(sd."createdAt", st2."createdAt") as "activeSince",
        COALESCE(bd."producesProduct", (st3.data->>'producesProduct')::boolean, false) as "producesProducts",
        COALESCE(bd."businessTeamSize", (st3.data->>'businessTeamSize')::int) as "businessTeamSize",
        COALESCE(v."storageSpace", st7.data->>'storageSpace') as "storageSpace",
        addr."houseNo" as "houseNo",
        COALESCE(addr."deliveryAddress", addr.landmark) as "deliveryAddress",
        addr.village,
        addr.taluka,
        addr.district,
        addr.state,
        addr.pincode,
        addr."postOffice" as "postOffice",
        doc."aadhaarNumber",
        doc."panNumber",
        COALESCE(doc."aadhaarFrontUrl", st5.data->>'aadhaarFrontUrl', st5.data->>'aadhaarFront') as "aadhaarFrontPhoto",
        COALESCE(doc."aadhaarBackUrl", st5.data->>'aadhaarBackUrl', st5.data->>'aadhaarBack') as "aadhaarBackPhoto",
        COALESCE(doc."panCardUrl", st5.data->>'panCardUrl', st5.data->>'panImage') as "panCardPhoto",
        bank."accountHolderName",
        bank."accountNumber",
        bank."ifscCode",
        bank."bankName",
        bank."branchName",
        bank."upiId",
        COALESCE(v."vehicleType"::text, st7.data->'vehicle'->>'vehicleType') as "vehicleType",
        COALESCE(v."registrationNumber", st7.data->'vehicle'->>'vehicleRegistrationNo', st7.data->'vehicle'->>'registrationNumber') as "vehicleRegistrationNumber",
        COALESCE(v."licenseNumber", st7.data->'vehicle'->>'drivingLicenseNumber', st7.data->'vehicle'->>'licenseNumber') as "drivingLicenseNumber",
        COALESCE(v."DLurl", st7.data->'vehicle'->>'drivingLicenseImageUrl', st7.data->'vehicle'->>'drivingLicensePhoto') as "drivingLicensePhoto",
        COALESCE(v."vehicleImageUrl", st7.data->'vehicle'->>'vehicleImageUrl', st7.data->'vehicle'->>'vehiclePhoto') as "vehiclePhoto",
        CASE WHEN (v.id IS NOT NULL AND (v."registrationNumber" IS NOT NULL OR v."vehicleImageUrl" IS NOT NULL OR v."DLurl" IS NOT NULL)) OR (st7.id IS NOT NULL AND (st7.data->'vehicle'->>'vehicleRegistrationNo' IS NOT NULL OR st7.data->'vehicle'->>'vehicleImageUrl' IS NOT NULL OR st7.data->'vehicle'->>'drivingLicenseImageUrl' IS NOT NULL)) THEN true ELSE false END as "vehicleAvailable",
        COALESCE(v.width, (st7.data->>'storageWidth')::float) as "storageWidth",
        COALESCE(v.heihgt, (st7.data->>'storageLength')::float, (st7.data->>'storageHeight')::float) as "storageHeight",
        COALESCE(prod.name, st3.data->'products'->0->>'productName') as "productName",
        COALESCE(prod.category, st3.data->'products'->0->>'category') as "productCategory",
        COALESCE(prod.price, (st3.data->'products'->0->>'price')::float) as "pricePerUnit",
        COALESCE(prod."dailyProduction", (st3.data->'products'->0->>'dailyProductionQty')::float) as "dailyProduction",
        COALESCE(prod."weeklyProduction", (st3.data->'products'->0->>'weeklyProduction')::float) as "weeklyProduction",
        COALESCE(prod."Unit", st3.data->'products'->0->>'unit') as "productionUnit",
        COALESCE(sd.age, (st1.data->>'age')::int, 0) as "age"
      FROM public."User" u
      LEFT JOIN LATERAL (
        SELECT status, "createdAt"
        FROM public."Application"
        WHERE "userId" = u.id
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) app ON true
      LEFT JOIN public."ShgDetail" sd ON u.id = sd."userId"
      LEFT JOIN public."BusinessDetail" bd ON u.id = bd."userId"
      LEFT JOIN public."Address" addr ON u.id = addr."userId"
      LEFT JOIN public."Document" doc ON u.id = doc."userId"
      LEFT JOIN public."BankDetail" bank ON bank.id = (
        SELECT id FROM public."BankDetail" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN public."OtherDetails" v ON v.id = (
        SELECT id FROM public."OtherDetails" WHERE "userId" = u.id ORDER BY "createdAt" DESC LIMIT 1
      )
      LEFT JOIN LATERAL (
        SELECT name, category, price, "dailyProduction", "Unit", "weeklyProduction"
        FROM public."products"
        WHERE "seller_id" = u.id
        ORDER BY "created_at" ASC
        LIMIT 1
      ) prod ON true
      LEFT JOIN public."StepTracking" st1 ON u.id = st1."userId" AND st1.step = 1
      LEFT JOIN public."StepTracking" st2 ON u.id = st2."userId" AND st2.step = 2
      LEFT JOIN public."StepTracking" st3 ON u.id = st3."userId" AND st3.step = 3
      LEFT JOIN public."StepTracking" st5 ON u.id = st5."userId" AND st5.step = 5
      LEFT JOIN public."StepTracking" st7 ON u.id = st7."userId" AND st7.step = 7
      WHERE u.id = ${userId}
      AND u."currentStep" = 7
      LIMIT 1
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(query);
    if (!results || results.length === 0) {
      throw new NotFoundException(`Community member with ID ${id} not found`);
    }
    const item = results[0];
    return {
      ...item,
      type: item.role === 'SHG' ? 'SHG' : 'INDIVIDUAL'
    };
  }

  async approveMember(id: string) {
    const userId = await this.resolveUserId(id);

    await this.prisma.$executeRaw`
      UPDATE public."User"
      SET "applicationStatus" = 'APPROVED'::public."ApplicationStatus",
          "approvedAt" = NOW(),
          "rejectedAt" = NULL
      WHERE id = ${userId}
    `;

    const updatedApp = await this.prisma.$executeRaw`
      UPDATE public."Application"
      SET status = 'APPROVED'::public."ApplicationStatus",
          "approvedAt" = NOW(),
          "rejectedAt" = NULL
      WHERE "userId" = ${userId}
    `;
    if (updatedApp === 0) {
      await this.prisma.$executeRaw`
        INSERT INTO public."Application" ("userId", status, "approvedAt", "createdAt", "updatedAt")
        VALUES (${userId}, 'APPROVED'::public."ApplicationStatus", NOW(), NOW(), NOW())
      `;
    }
    return { success: true };
  }

  async rejectMember(id: string) {
    const userId = await this.resolveUserId(id);

    await this.prisma.$executeRaw`
      UPDATE public."User"
      SET "applicationStatus" = 'REJECTED'::public."ApplicationStatus",
          "rejectedAt" = NOW(),
          "approvedAt" = NULL
      WHERE id = ${userId}
    `;

    const updatedApp = await this.prisma.$executeRaw`
      UPDATE public."Application"
      SET status = 'REJECTED'::public."ApplicationStatus",
          "rejectedAt" = NOW(),
          "approvedAt" = NULL
      WHERE "userId" = ${userId}
    `;
    if (updatedApp === 0) {
      await this.prisma.$executeRaw`
        INSERT INTO public."Application" ("userId", status, "rejectedAt", "createdAt", "updatedAt")
        VALUES (${userId}, 'REJECTED'::public."ApplicationStatus", NOW(), NOW(), NOW())
      `;
    }
    return { success: true };
  }
}
