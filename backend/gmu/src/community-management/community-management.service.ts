import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityManagementService {
  constructor(private prisma: PrismaService) {}

  // Common method to fetch community members from public schema
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
        doc."aadhaarNumber",
        doc."panNumber",
        doc."aadhaarFrontUrl" as "aadhaarFrontPhoto",
        doc."aadhaarBackUrl" as "aadhaarBackPhoto",
        doc."panCardUrl" as "panCardPhoto",
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

  async getMemberById(id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new NotFoundException(`Invalid member ID: ${id}`);
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
        doc."aadhaarNumber",
        doc."panNumber",
        doc."aadhaarFrontUrl" as "aadhaarFrontPhoto",
        doc."aadhaarBackUrl" as "aadhaarBackPhoto",
        doc."panCardUrl" as "panCardPhoto",
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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new NotFoundException(`Invalid member ID: ${id}`);
    }

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

    // Populate public."ShgDetail" upon approval
    const users = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT role::text, "fullName", "phoneNumber", "profilePhoto" FROM public."User" WHERE id = $1`,
      userId
    );
    if (users && users.length > 0) {
      const user = users[0];
      let shgName = null;
      let shgLeaderName = null;
      let shgLeaderContact = null;
      let fullName = null;
      let shgRole = null;
      let crpName = null;
      let crpMobile = null;
      let crpEmail = null;
      let groupSize = null;
      let imgUrl = user.profilePhoto || null;
      let age = null;

      // Get age from StepTracking step 1
      const stepTracking1 = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT data FROM public."StepTracking" WHERE "userId" = $1 AND step = 1`,
        userId
      );
      if (stepTracking1 && stepTracking1.length > 0 && stepTracking1[0].data) {
        const data = typeof stepTracking1[0].data === 'string' ? JSON.parse(stepTracking1[0].data) : stepTracking1[0].data;
        age = data.age ? parseInt(data.age, 10) : null;
      }

      if (user.role === 'SHG') {
        const stepTracking = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT data FROM public."StepTracking" WHERE "userId" = $1 AND step = 2`,
          userId
        );
        if (stepTracking && stepTracking.length > 0 && stepTracking[0].data) {
          const data = typeof stepTracking[0].data === 'string' ? JSON.parse(stepTracking[0].data) : stepTracking[0].data;
          shgName = data.shgName || null;
          shgRole = data.shgRole || null;
          crpName = data.crpName || null;
          crpMobile = data.crpMobile || null;
          crpEmail = data.crpEmail || null;
          groupSize = data.shgGroupSize ? parseInt(data.shgGroupSize, 10) : null;

          if (shgRole === 'LEADER') {
            shgLeaderName = user.fullName || null;
            shgLeaderContact = user.phoneNumber || null;
          } else if (shgRole === 'MEMBER') {
            shgLeaderName = data.shgLeaderName || null;
            shgLeaderContact = data.shgLeaderContact || null;
            fullName = user.fullName || null;
          } else if (shgRole === 'CRP') {
            shgLeaderName = data.shgLeaderName || null;
            shgLeaderContact = data.shgLeaderContact || null;
            fullName = user.fullName || null;
          }
        }
      } else {
        shgName = user.fullName || null;
        shgLeaderName = user.fullName || null;
        shgLeaderContact = user.phoneNumber || null;
        fullName = user.fullName || null;
      }

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO public."ShgDetail" (
          "userId", "shgName", "shgLeaderName", "shgLeaderContact", "shgRole", "crpName", "crpMobile", "crpEmail", "groupSize", "fullName", "imgUrl", "age", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5::public."ShgRole", $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        ) ON CONFLICT ("userId") DO UPDATE SET
          "shgName" = EXCLUDED."shgName",
          "shgLeaderName" = EXCLUDED."shgLeaderName",
          "shgLeaderContact" = EXCLUDED."shgLeaderContact",
          "shgRole" = EXCLUDED."shgRole",
          "crpName" = EXCLUDED."crpName",
          "crpMobile" = EXCLUDED."crpMobile",
          "crpEmail" = EXCLUDED."crpEmail",
          "groupSize" = EXCLUDED."groupSize",
          "fullName" = EXCLUDED."fullName",
          "imgUrl" = EXCLUDED."imgUrl",
          "age" = EXCLUDED."age",
          "updatedAt" = NOW()`,
        userId,
        shgName,
        shgLeaderName,
        shgLeaderContact,
        shgRole,
        crpName,
        crpMobile,
        crpEmail,
        groupSize,
        fullName,
        imgUrl,
        age
      );

      // Get address details
      const addressList = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT village, taluka, district, state, pincode, "deliveryAddress" FROM public."Address" WHERE "userId" = $1 LIMIT 1`,
        userId
      );
      const address = addressList?.[0] || null;

      const shgUuid = '00000000-0000-0000-0000-' + String(userId).padStart(12, '0');
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO gmu."CommunityMember" (
          id, "memberCode", type, status, "fullName", "mobileNumber", "shgName", 
          village, taluka, district, state, pincode, "deliveryAddress", "createdAt"
        ) VALUES ($1, $2, 'SHG', 'APPROVED', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET 
          "mobileNumber" = EXCLUDED."mobileNumber",
          "fullName" = EXCLUDED."fullName",
          "shgName" = EXCLUDED."shgName",
          village = EXCLUDED.village,
          taluka = EXCLUDED.taluka,
          district = EXCLUDED.district,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode,
          "deliveryAddress" = EXCLUDED."deliveryAddress",
          status = 'APPROVED';
      `, 
        shgUuid, 
        `CM-SHG-${userId}`, 
        user.fullName || 'SHG Member', 
        user.phoneNumber, 
        shgName || 'Local SHG',
        address?.village || '',
        address?.taluka || '',
        address?.district || '',
        address?.state || '',
        address?.pincode || '',
        address?.deliveryAddress || ''
      );
    }

    return { success: true };
  }

  async rejectMember(id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new NotFoundException(`Invalid member ID: ${id}`);
    }

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
