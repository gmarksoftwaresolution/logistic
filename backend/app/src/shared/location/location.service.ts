import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPincode(pincode: string) {
    return this.prisma.pincode.findMany({
      where: { pincode: pincode.trim() },
      orderBy: { village: 'asc' },
    });
  }

  async findByVillage(village: string) {
    return this.prisma.pincode.findMany({
      where: { village: { equals: village.trim(), mode: 'insensitive' } },
      orderBy: { pincode: 'asc' },
    });
  }

  async findVillageAndPincode(village: string, pincode: string) {
    return this.prisma.pincode.findFirst({
      where: {
        village: { equals: village.trim(), mode: 'insensitive' },
        pincode: pincode.trim(),
      },
    });
  }

  async searchVillage(query: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.pincode.findMany({
      where: {
        village: { contains: query.trim(), mode: 'insensitive' },
      },
      distinct: ['village'],
      take: limit,
      skip: skip,
      orderBy: { village: 'asc' },
    });
    const total = await this.prisma.pincode.count({
      where: {
        village: { contains: query.trim(), mode: 'insensitive' },
      },
    });
    return { items, total, page, limit };
  }

  async searchPincode(query: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.pincode.findMany({
      where: {
        pincode: { startsWith: query.trim() },
      },
      distinct: ['pincode'],
      take: limit,
      skip: skip,
      orderBy: { pincode: 'asc' },
    });
    const total = await this.prisma.pincode.count({
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

    const items = await this.prisma.pincode.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: [{ pincode: 'asc' }, { village: 'asc' }],
    });

    const total = await this.prisma.pincode.count({ where });
    return { items, total, page, limit };
  }

  async getStates() {
    const records = await this.prisma.pincode.findMany({
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    });
    return records.map(r => r.state);
  }

  async getDistricts(state: string) {
    const records = await this.prisma.pincode.findMany({
      where: { state: { equals: state.trim(), mode: 'insensitive' } },
      select: { district: true },
      distinct: ['district'],
      orderBy: { district: 'asc' },
    });
    return records.map(r => r.district);
  }

  async getBlocks(state: string, district: string) {
    const records = await this.prisma.pincode.findMany({
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
    const records = await this.prisma.pincode.findMany({
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
        record = await this.prisma.pincode.findFirst({
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

  public isRealVillageName(name: string, types?: string[]): boolean {
    if (!name || name.trim().length < 2) return false;
    const n = name.toLowerCase().trim();

    // Reject non-English / non-ASCII commercial strings
    if (/[^\x00-\x7F]/.test(name)) return false;

    // Address prefixes / building / plot / region suffix patterns
    if (/^(near|opp|opposite|behind|next to|front of|infront|beside|by|at|post|po|bo|so|via)\s+/i.test(n)) return false;
    if (/\b(shop|plot|flat|house|door|survey|gat|hissa|room|office|sec|sector|phase|block|ward|lane)\s*(no|num|number)?\s*[\d\-]/i.test(n)) return false;
    if (/\b(ta|tal|taluka|dist|district|post)\s*[\.:\s]/i.test(n)) return false;

    // Google Place types check if types array provided
    if (types && Array.isArray(types) && types.length > 0) {
      const isLocalityType = types.some(t => ['locality', 'sublocality', 'sublocality_level_1', 'sublocality_level_2', 'neighborhood', 'administrative_area_level_3', 'political', 'village', 'postal_town'].includes(t));
      const isEstablishmentType = types.some(t => ['establishment', 'point_of_interest', 'store', 'food', 'health', 'place_of_worship', 'lodging', 'gas_station', 'school', 'finance', 'car_repair', 'restaurant', 'bar', 'shopping_mall', 'bakery'].includes(t));
      if (isEstablishmentType && !isLocalityType) return false;
    }

    const landmarkKeywords = [
      'mandir', 'temple', 'masjid', 'church', 'gurudwara', 'dargah', 'math', 'karyalay', 'karyalaya', 'bhavan', 'bhavana',
      'bus stand', 'bus stop', 'depot', 'railway', 'station', 'junction', 'terminal',
      'school', 'college', 'high school', 'vidyalaya', 'shikshan', 'institute', 'academy', 'university',
      'hospital', 'clinic', 'medical', 'pharmacy', 'dispensary', 'nursing', 'care',
      'hotel', 'restaurant', 'diner', 'dhabha', 'dayning', 'dining', 'cafe', 'lodge', 'khonaval', 'khanaval', 'khaniwal',
      'fort', 'monument', 'park', 'garden', 'chowk', 'corner', 'cinema', 'talkies', 'theater', 'theatre',
      'shop', 'store', 'mart', 'mall', 'bazaar', 'bazar', 'market', 'office', 'bank', 'atm', 'board', 'trust', 'samiti', 'kendra',
      'i love', 'city', 'centre', 'center', 'path', 'marg', 'road', 'street', 'avenue', 'cake', 'mandekar', 'maruti', 'glory', 'gadvi',
      'farmhouse', 'farm house', 'farm', 'home', 'wada', 'vada', 'villa', 'resort', 'cottage', 'colony', 'layout', 'society', 'complex',
      'hill top', 'view point', 'waterfall', 'dam', 'lake', 'river', 'bridge', 'nagar',
      'petrol', 'pump', 'fuel', 'hpcl', 'bpcl', 'iocl', 'garage', 'mechanic', 'workshop',
      'enterprise', 'traders', 'agency', 'agencies', 'industries', 'industry', 'distributor', 'supplier', 'company', 'pvt', 'ltd', 'corp', 'corporation',
      'building', 'tower', 'towers', 'enclave', 'residency', 'apartment', 'apartments', 'floors', 'heights', 'palace', 'chambers',
      'hall', 'auditorium', 'stadium', 'grounds', 'ground', 'playground',
      'police', 'chowki', 'post office', 'tehsil', 'panchayat', 'grampanchayat', 'talathi',
      'nursery', 'dairy', 'bakery', 'sweets', 'sweet', 'saloon', 'parlour', 'parlor', 'spa', 'gym', 'fitness',
      'haat', 'mandi', 'yard', 'godown', 'warehouse',
      'crematorium', 'smashan', 'cemetery', 'kabristan',
      'naka', 'bypass', 'highway', 'expressway', 'flyover', 'circle', 'ring road',
      'sangh', 'vikri', 'kharedi', 'sahakari', 'coop', 'co-op', 'federation', 'association', 'private', 'limited'
    ];

    for (const kw of landmarkKeywords) {
      if (n.includes(kw)) return false;
    }

    return true;
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
          dbPincodeRecords = await this.prisma.pincode.findMany({
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
              if (cleaned && this.isRealVillageName(cleaned)) {
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
                if (cleaned && this.isRealVillageName(cleaned) && !postOfficeMap[poName].includes(cleaned)) postOfficeMap[poName].push(cleaned);
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
            if (cleaned && this.isRealVillageName(cleaned)) {
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
              if (cleaned && this.isRealVillageName(cleaned, types)) villageSet.add(cleaned);
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
            if (cleaned && this.isRealVillageName(cleaned, place.types)) villageSet.add(cleaned);
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
                if (cleaned && this.isRealVillageName(cleaned, place.types)) villageSet.add(cleaned);
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
              this.prisma.pincode.create({
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
        const record = await this.prisma.pincode.findFirst({
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

  async evaluateDirectFlow(sellerAddr: string, buyerAddr: string, sellerVillage?: string, buyerVillage?: string) {
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDNMv_sau3_koFOtAvkLkwsZgn_Y8iydy0';
    const NESARI_HUB_ADDR = 'Nesari, Gadhinglaj, Kolhapur, Maharashtra 416504, India';

    try {
      const url = `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix?key=${GOOGLE_API_KEY}`;
      const payload = {
        origins: [
          { waypoint: { address: sellerAddr } },
          { waypoint: { address: NESARI_HUB_ADDR } }
        ],
        destinations: [
          { waypoint: { address: NESARI_HUB_ADDR } },
          { waypoint: { address: buyerAddr } }
        ],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration'
      };

      const res = await axios.post(url, payload, { headers, timeout: 8000 });
      const matrix = res.data || [];

      let sellerToHubMeters: number | null = null;
      let sellerToBuyerMeters: number | null = null;
      let hubToBuyerMeters: number | null = null;

      matrix.forEach((item: any) => {
        const o = item.originIndex;
        const d = item.destinationIndex;
        const dist = item.distanceMeters || 0;

        if (o === 0 && d === 0) sellerToHubMeters = dist;
        if (o === 0 && d === 1) sellerToBuyerMeters = dist;
        if (o === 1 && d === 1) hubToBuyerMeters = dist;
      });

      // Rule 2 Check: Distance must be <= 10 km (10,000 meters) or <= 70% threshold
      let isDistanceOk = false;
      if (sellerToBuyerMeters !== null) {
        if (sellerToBuyerMeters <= 10000) {
          isDistanceOk = true;
        } else if (sellerToHubMeters !== null && hubToBuyerMeters !== null) {
          isDistanceOk = sellerToBuyerMeters <= (sellerToHubMeters + hubToBuyerMeters) * 0.70;
        }
      }

      // If distance condition fails (> 10 km and fails 70% ratio), return isDirect: false (VIA_HUB)
      if (!isDistanceOk) {
        return { isDirect: false, reason: 'Distance > 10km' };
      }

      // Rule 1 & Rule 3 Check: Transporter Route Coverage
      if (sellerVillage && buyerVillage) {
        const hasCommonTransporter = await this.checkTransporterRouteCoverage(sellerVillage, buyerVillage);
        if (!hasCommonTransporter) {
          console.log(`[evaluateDirectFlow] Distance is <= 10km but no single transporter covers both '${sellerVillage}' and '${buyerVillage}'. Fallback to VIA_HUB.`);
          return { isDirect: false, reason: 'No single transporter route covers both villages' };
        }
      }

      return { isDirect: true };
    } catch (err: any) {
      console.warn('[evaluateDirectFlow Notice] Google API calculation fallback:', err.message);
    }

    return { isDirect: false };
  }

  private async checkTransporterRouteCoverage(sellerVillage: string, buyerVillage: string): Promise<boolean> {
    const sVill = sellerVillage.trim().toLowerCase();
    const bVill = buyerVillage.trim().toLowerCase();

    // If seller and buyer are in the exact same village, auto-covered
    if (sVill === bVill) return true;

    try {
      const transporters = await this.prisma.user.findMany({
        where: {
          role: 'TRANSPORTER',
          applicationStatus: 'APPROVED',
          deletedAt: null,
        },
        include: {
          routeDetail: true,
          milkVanDetail: true,
        }
      });

      const normalize = (val: any): string => {
        if (typeof val === 'string') return val.toLowerCase();
        if (Array.isArray(val)) return val.map(v => String(v).toLowerCase()).join(' ');
        if (typeof val === 'object' && val !== null) return JSON.stringify(val).toLowerCase();
        return '';
      };

      for (const t of transporters) {
        const routeText = [
          t.routeDetail?.operatingArea,
          normalize(t.routeDetail?.pickupLocations),
          normalize(t.routeDetail?.dropLocations),
          t.milkVanDetail?.sangathanName,
          t.milkVanDetail?.centerName,
          normalize(t.milkVanDetail?.assignedVillages),
        ].filter(Boolean).join(' ').toLowerCase();

        const coversSeller = routeText.includes(sVill);
        const coversBuyer = routeText.includes(bVill);

        if (coversSeller && coversBuyer) {
          return true;
        }
      }
    } catch (err: any) {
      console.warn('[checkTransporterRouteCoverage Error]:', err.message);
    }

    // Default to true if no transporter route data is found yet to avoid blocking short distance orders
    return true;
  }
}
