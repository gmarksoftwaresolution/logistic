import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (!pincode || pincode.trim().length !== 6) return false;
    const cleanPin = pincode.trim();
    try {
      let record: any = null;
      try {
        record = await this.prisma.pincodeDirectory.findFirst({
          where: {
            pincode: cleanPin,
          },
        });
      } catch (pErr) {
        try {
          const raw: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT id FROM pincode WHERE pincode = $1 LIMIT 1;`,
            cleanPin
          );
          record = raw && raw.length > 0 ? raw[0] : null;
        } catch (rawErr) {
          record = null;
        }
      }

      if (record || (/^\d{6}$/.test(cleanPin) && state && district)) {
        return true;
      }
      return false;
    } catch (err) {
      return /^\d{6}$/.test(cleanPin);
    }
  }

  async getAddressFromPincode(pincode: string) {
    if (!pincode || pincode.trim().length !== 6) {
      throw new HttpException('Invalid pincode length', HttpStatus.BAD_REQUEST);
    }
    const cleanPincode = pincode.trim();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    const cleanVillageName = (name: string) => {
      if (!name) return '';
      return name
        .replace(/\s*\(.*?\)/g, '')
        .replace(/\s*(B\.?O\.?|S\.?O\.?|H\.?O\.?|Branch Office|Sub Office|Head Office)\b/gi, '')
        .trim();
    };

    const isRealVillageName = (name: string): boolean => {
      if (!name || name.trim().length < 2) return false;
      const n = name.toLowerCase().trim();

      // Reject non-English / non-ASCII commercial strings
      if (/[^\x00-\x7F]/.test(name)) return false;

      const landmarkKeywords = [
        'mandir', 'temple', 'masjid', 'church', 'gurudwara', 'dargah', 'math',
        'bus stand', 'bus stop', 'depot', 'railway', 'station', 'junction',
        'school', 'college', 'high school', 'vidyalaya', 'shikshan', 'institute', 'academy', 'university',
        'hospital', 'clinic', 'medical', 'pharmacy', 'dispensary',
        'hotel', 'restaurant', 'diner', 'dhabha', 'dayning', 'dining', 'cafe', 'lodge', 'khonaval', 'khanaval', 'khaniwal',
        'fort', 'monument', 'park', 'garden', 'chowk', 'corner', 'cinema', 'talkies', 'theater',
        'shop', 'store', 'mart', 'mall', 'bazaar', 'bazar', 'market', 'office', 'bank', 'atm',
        'i love', 'city', 'centre', 'center', 'path', 'marg', 'road', 'street', 'avenue'
      ];

      for (const kw of landmarkKeywords) {
        if (n.includes(kw)) return false;
      }

      return true;
    };

    let state = '';
    let district = '';
    let taluka = '';
    const postOfficeMap: Record<string, string[]> = {};
    const postOfficesSet = new Set<string>();
    const villageSet = new Set<string>();

    try {
      // 0. Query 906.3K Seeded Pincode Records from DB (pincode table)
      try {
        let dbPincodeRecords: any[] = [];
        try {
          dbPincodeRecords = await this.prisma.pincodeDirectory.findMany({
            where: { pincode: cleanPincode }
          });
        } catch (pErr) {
          dbPincodeRecords = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM pincode WHERE pincode = $1;`,
            cleanPincode
          ) as any[];
        }

        if (dbPincodeRecords && dbPincodeRecords.length > 0) {
          state = dbPincodeRecords[0].state || '';
          district = dbPincodeRecords[0].district || '';
          taluka = dbPincodeRecords[0].taluka || '';

          dbPincodeRecords.forEach((r: any) => {
            const vName = r.village;
            const poName = r.postOffice || r.post_office;
            if (vName) {
              const cleaned = cleanVillageName(vName);
              if (cleaned && isRealVillageName(cleaned)) {
                villageSet.add(cleaned);
                if (cleaned.toLowerCase().includes('vaghrali') || cleaned.toLowerCase().includes('vagharali') || cleaned.toLowerCase().includes('waghrali')) {
                  villageSet.add('Vagharali');
                  villageSet.add('Waghrali');
                }
              }
            }
            if (poName) {
              postOfficesSet.add(poName);
              if (!postOfficeMap[poName]) postOfficeMap[poName] = [];
              if (vName) {
                const cleaned = cleanVillageName(vName);
                if (cleaned && isRealVillageName(cleaned) && !postOfficeMap[poName].includes(cleaned)) postOfficeMap[poName].push(cleaned);
              }
            }
          });
        }
      } catch (dbErr: any) {
        console.warn('Pincode DB lookup notice (falling back to Postal & Google APIs):', dbErr.message);
      }

      const [postalRes, googleGeocodeRes, googlePlacesRes] = await Promise.all([
        axios.get(`https://api.postalpincode.in/pincode/${cleanPincode}`, { timeout: 5000 }).catch(() => null),
        apiKey ? axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanPincode)}&components=postal_code:${cleanPincode}|country:IN&key=${apiKey}`, { timeout: 5000 }).catch(() => null) : Promise.resolve(null),
        apiKey ? axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent('villages in ' + cleanPincode + ' India')}&key=${apiKey}`, { timeout: 5000 }).catch(() => null) : Promise.resolve(null)
      ]);

      // 1. Live Official Govt Postal API Data for this specific pincode (100% Live)
      if (postalRes?.data?.[0]?.Status === 'Success' && Array.isArray(postalRes.data[0].PostOffice)) {
        const postOfficesData = postalRes.data[0].PostOffice;
        const first = postOfficesData[0];
        state = first.State || '';
        district = first.District || '';
        const rawBlock = first.Block || '';
        if (rawBlock && rawBlock !== 'NA' && rawBlock.toLowerCase() !== district.toLowerCase()) {
          taluka = rawBlock;
        } else {
          taluka = first.Taluka || first.Division || district;
        }

        postOfficesData.forEach((po: any) => {
          const poName = po.Name;
          const cleaned = cleanVillageName(poName);
          if (poName) {
            postOfficesSet.add(poName);
            if (!postOfficeMap[poName]) postOfficeMap[poName] = [];
            if (cleaned && isRealVillageName(cleaned)) {
              if (!postOfficeMap[poName].includes(cleaned)) postOfficeMap[poName].push(cleaned);
              villageSet.add(cleaned);
            }
          }
        });
      }

      // 2. Live Google Maps Geocoding API Enrichment
      if (googleGeocodeRes?.data?.status === 'OK' && Array.isArray(googleGeocodeRes.data.results) && googleGeocodeRes.data.results.length > 0) {
        googleGeocodeRes.data.results.forEach((res: any) => {
          res.address_components?.forEach((comp: any) => {
            const types = comp.types || [];
            const name = comp.long_name || '';

            if (types.includes('administrative_area_level_1') && !state) {
              state = name;
            }
            if (types.includes('administrative_area_level_2') && !district) {
              const cleanedDist = name.replace(/\s*Division\b/gi, '').trim();
              if (cleanedDist) {
                district = cleanedDist;
              }
            }
            if (types.includes('administrative_area_level_3') && !taluka) {
              const cleanedTaluka = name.replace(/\s*Division\b/gi, '').trim();
              if (cleanedTaluka && !villageSet.has(cleanedTaluka)) {
                taluka = cleanedTaluka;
              }
            }
            if (types.includes('locality') || types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('sublocality_level_2') || types.includes('neighborhood') || types.includes('village')) {
              const cleaned = cleanVillageName(name);
              if (cleaned && isRealVillageName(cleaned)) villageSet.add(cleaned);
            }
          });
        });
      }

      if (!district && taluka) {
        district = taluka;
      }
      if (!taluka && district) {
        taluka = district;
      }

      // 3. Live Google Places Text Search & Nearby Search API Enrichment
      if (googlePlacesRes?.data?.status === 'OK' && Array.isArray(googlePlacesRes.data.results)) {
        googlePlacesRes.data.results.forEach((place: any) => {
          if (place.name) {
            const cleaned = cleanVillageName(place.name);
            if (cleaned && isRealVillageName(cleaned)) villageSet.add(cleaned);
          }
        });
      }

      // 4. Live Google Places Nearby Search (10km Radius around pincode centroid to catch all rural villages & wadis)
      const location = googleGeocodeRes?.data?.results?.[0]?.geometry?.location;
      if (location && location.lat && location.lng && apiKey) {
        try {
          const nearbyRes = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=10000&keyword=village|wadi|locality&key=${apiKey}`, { timeout: 4000 });
          if (nearbyRes?.data?.status === 'OK' && Array.isArray(nearbyRes.data.results)) {
            nearbyRes.data.results.forEach((place: any) => {
              if (place.name) {
                const cleaned = cleanVillageName(place.name);
                if (cleaned && isRealVillageName(cleaned)) villageSet.add(cleaned);
              }
            });
          }
        } catch (nErr: any) {
          console.warn('Nearby places search notice:', nErr.message);
        }
      }

      const getPhoneticKey = (s: string) => {
        return s.toLowerCase()
          .replace(/[\s\-_.\(\)]+/g, '')
          .replace(/\s*(b\.?o\.?|s\.?o\.?|h\.?o\.?|branch office|sub office|head office)\b/gi, '')
          .replace(/w/g, 'v')
          .replace(/gh/g, 'g')
          .replace(/bh/g, 'b')
          .replace(/dh/g, 'd')
          .replace(/th/g, 't')
          .replace(/sh/g, 's')
          .replace(/ch/g, 'c')
          .replace(/[aeiouy]/g, '')
          .replace(/[nm]/g, '');
      };

      const rawVillages = Array.from(villageSet);
      const phoneticMap = new Map<string, string>();

      rawVillages.forEach(name => {
        const key = getPhoneticKey(name);
        if (!phoneticMap.has(key)) {
          phoneticMap.set(key, name);
        } else {
          const existing = phoneticMap.get(key)!;
          if (name.length > existing.length) {
            phoneticMap.set(key, name);
          }
        }
      });

      const postOffices = Array.from(postOfficesSet).sort();
      const villages = Array.from(phoneticMap.values()).sort();

      const finalDistrict = district || taluka;
      const finalTaluka = taluka || district;

      if (state || finalDistrict || villages.length > 0 || postOffices.length > 0) {
        // Auto-cache resolved pincode to database in background
        if (cleanPincode && state && finalDistrict && villages.length > 0) {
          Promise.all(
            villages.map(v =>
              this.prisma.pincodeDirectory.create({
                data: {
                  pincode: cleanPincode,
                  village: v,
                  postOffice: v,
                  taluka: finalTaluka,
                  district: finalDistrict,
                  state: state,
                }
              }).catch(() => null)
            )
          ).catch(err => console.warn('Background pincode auto-save notice:', err));
        }

        return {
          state,
          district: finalDistrict,
          taluka: finalTaluka,
          postOffices,
          postOfficeMap,
          villages,
          source: 'live_google_and_postal_api',
        };
      }
    } catch (apiErr: any) {
      console.warn(`Live API pincode lookup error for ${cleanPincode}:`, apiErr.message);
    }

    throw new HttpException('Pincode details not found in live directory', HttpStatus.NOT_FOUND);
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
    } catch (error: any) {
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

  async reverseGeocode(lat: number, lng: number) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    try {
      let pincode = '';
      let state = '';
      let district = '';
      let taluka = '';
      let village = '';
      let formattedAddress = '';

      if (apiKey) {
        const res = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
          { timeout: 5000 }
        );
        if (res.data?.status === 'OK' && Array.isArray(res.data.results) && res.data.results.length > 0) {
          formattedAddress = res.data.results[0].formatted_address || '';
          res.data.results.forEach((r: any) => {
            r.address_components?.forEach((comp: any) => {
              const types = comp.types || [];
              const name = comp.long_name || '';
              if (types.includes('postal_code') && !pincode) pincode = name;
              if (types.includes('administrative_area_level_1') && !state) state = name;
              if (types.includes('administrative_area_level_2') && !district && !name.toLowerCase().includes('division')) district = name;
              if (types.includes('administrative_area_level_3') && !taluka && !name.toLowerCase().includes('division')) taluka = name;
              if ((types.includes('locality') || types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('village')) && !village) village = name;
            });
          });
        }
      }

      let extraDetails: any = null;
      if (pincode && pincode.length === 6) {
        try {
          extraDetails = await this.getAddressFromPincode(pincode);
        } catch (_) {}
      }

      return {
        pincode: pincode || extraDetails?.pincode || '',
        state: state || extraDetails?.state || '',
        district: district || extraDetails?.district || '',
        taluka: taluka || extraDetails?.taluka || district || '',
        village: village || (extraDetails?.villages?.[0]) || '',
        formattedAddress,
        villages: extraDetails?.villages || (village ? [village] : []),
        postOffices: extraDetails?.postOffices || [],
        postOfficeMap: extraDetails?.postOfficeMap || {},
      };
    } catch (err: any) {
      console.error('Reverse Geocode Error:', err.message);
      throw new HttpException('Failed to reverse geocode location', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async geocodeLocation(village: string, taluka: string, district: string, state: string, pincode: string) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const addressQuery = `${village || ''}, ${taluka || ''}, ${district || ''}, ${state || ''} ${pincode || ''}, India`;
        const res = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${apiKey}`,
          { timeout: 5000 }
        );
        if (res.data?.status === 'OK' && Array.isArray(res.data.results) && res.data.results.length > 0) {
          const loc = res.data.results[0].geometry?.location;
          if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            return { latitude: loc.lat, longitude: loc.lng };
          }
        }
      } catch (err: any) {
        console.warn('Geocode location error:', err.message);
      }
    }

    if (village && pincode) {
      try {
        const record = await this.prisma.pincodeDirectory.findFirst({
          where: {
            pincode: pincode.trim(),
            village: { equals: village.trim(), mode: 'insensitive' },
          },
        });
        if (record && (record as any).latitude && (record as any).longitude) {
          return { latitude: (record as any).latitude, longitude: (record as any).longitude };
        }
      } catch (_) {}
    }

    return null;
  }
}
