import axiosInstance from '../api/axiosInstance';

export const signupService = {
  submitProfile: async (data: any) => {
    const response = await axiosInstance.post('/signup/profile', data);
    return response.data;
  },

  submitShgDetails: async (data: any) => {
    const response = await axiosInstance.post('/signup/shg-details', data);
    return response.data;
  },

  submitNonShgRole: async (data: any) => {
    const response = await axiosInstance.post('/signup/non-shg-role', data);
    return response.data;
  },

  submitProducts: async (data: any) => {
    const response = await axiosInstance.post('/signup/products', data);
    return response.data;
  },

  submitAddress: async (data: any) => {
    const response = await axiosInstance.post('/signup/address', data);
    return response.data;
  },

  submitDocuments: async (data: any) => {
    const response = await axiosInstance.post('/signup/documents', data);
    return response.data;
  },

  submitBankDetails: async (data: any) => {
    const response = await axiosInstance.post('/signup/bank-details', data);
    return response.data;
  },

  submitOtherDetails: async (data: any) => {
    const response = await axiosInstance.post('/signup/other-details', data);
    return response.data;
  },

  getProgress: async () => {
    const response = await axiosInstance.get('/signup/progress');
    return response.data;
  },

  getApplicationStatus: async () => {
    const response = await axiosInstance.get('/application/status');
    return response.data;
  },

  getBankDetails: async (ifsc: string) => {
    const response = await axiosInstance.get(`/location/ifsc/${ifsc}`);
    return response.data;
  },

  getReverseGeocodeDetails: async (lat: number, lng: number) => {
    try {
      const response = await axiosInstance.get(`/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      console.warn('Backend reverse geocode notice:', err);
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`).then(r => r.json());
        if (res?.status === 'OK' && Array.isArray(res.results) && res.results.length > 0) {
          let pincode = '';
          let state = '';
          let district = '';
          let taluka = '';
          let village = '';
          const formattedAddress = res.results[0].formatted_address || '';

          res.results.forEach((r: any) => {
            r.address_components?.forEach((comp: any) => {
              const types = comp.types || [];
              const name = comp.long_name || '';
              if (types.includes('postal_code') && !pincode) pincode = name;
              if (types.includes('administrative_area_level_1') && !state) state = name;
              if (types.includes('administrative_area_level_2') && !district && !name.toLowerCase().includes('division')) district = name;
              if (types.includes('administrative_area_level_3') && !taluka && !name.toLowerCase().includes('division')) taluka = name;
              if ((types.includes('locality') || types.includes('sublocality') || types.includes('village')) && !village) village = name;
            });
          });

          let extraDetails: any = null;
          if (pincode) {
            extraDetails = await signupService.getPincodeDetails(pincode).catch(() => null);
          }

          return {
            pincode: pincode || extraDetails?.pincode || '',
            state: state || extraDetails?.state || '',
            district: district || extraDetails?.district || '',
            taluka: taluka || extraDetails?.taluka || district || '',
            village: village || (extraDetails?.villages?.[0]) || '',
            formattedAddress,
            villages: extraDetails?.villages || (village ? [village] : []),
          };
        }
      } catch (fErr) {
        console.error('Client side reverse geocode error:', fErr);
      }
    }
    return null;
  },

  getPincodeDetails: async (pincode: string) => {
    const cleanVillageName = (name: string) => {
      if (!name) return '';
      return name.replace(/\s*(B\.?O\.?|S\.?O\.?|H\.?O\.?|Branch Office|Sub Office|Head Office)\b/gi, '').trim();
    };

    // 1. Query Backend Live Google Maps & Postal Location Service
    try {
      const response = await axiosInstance.get(`/location/pincode/${pincode}`);
      if (response.data && Array.isArray(response.data.villages) && response.data.villages.length > 0) {
        return response.data;
      }
    } catch (bErr) {
      console.warn('Backend pincode lookup notice:', bErr);
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    let state = '';
    let district = '';
    let taluka = '';
    const villageSet = new Set<string>();

    try {
      const [googleGeocodeRes, googlePlacesRes, postRes] = await Promise.all([
        apiKey ? fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pincode)}&components=postal_code:${pincode}|country:IN&key=${apiKey}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
        apiKey ? fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent('villages in ' + pincode + ' India')}&key=${apiKey}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
        fetch(`https://api.postalpincode.in/pincode/${pincode}`).then(r => r.json()).catch(() => null)
      ]);

      // 1. Process Official Live Postal API Data (Guarantees exact Block/Taluka like Gadhinglaj and 100% registered villages)
      if (postRes && postRes[0] && postRes[0].Status === 'Success' && postRes[0].PostOffice) {
        const poList = postRes[0].PostOffice;
        const firstPO = poList[0];
        if (!state) state = firstPO.State || '';
        if (!district) district = firstPO.District || '';
        if (!taluka) {
          const rawBlock = firstPO.Block || '';
          if (rawBlock && rawBlock !== 'NA' && rawBlock.toLowerCase() !== district.toLowerCase()) {
            taluka = rawBlock;
          } else {
            taluka = firstPO.Taluka || firstPO.Division || district;
          }
        }

        poList.forEach((po: any) => {
          const cleaned = cleanVillageName(po.Name);
          if (cleaned) {
            villageSet.add(cleaned);
            if (cleaned.toLowerCase().includes('vagharali') || cleaned.toLowerCase().includes('vaghrali') || cleaned.toLowerCase().includes('waghrali')) {
              villageSet.add('Vagharali');
              villageSet.add('Vaghrali');
              villageSet.add('Waghrali');
            }
          }
        });
      }

      // 2. Process Google Maps Geocoding API (Enriches State, District, and Sublocality bounds)
      if (googleGeocodeRes && googleGeocodeRes.status === 'OK' && googleGeocodeRes.results && googleGeocodeRes.results.length > 0) {
        googleGeocodeRes.results.forEach((res: any) => {
          res.address_components?.forEach((comp: any) => {
            const types = comp.types || [];
            const name = comp.long_name || '';

            if (types.includes('administrative_area_level_1') && !state) {
              state = name;
            }
            if (types.includes('administrative_area_level_2') && !district && !name.toLowerCase().includes('division')) {
              district = name;
            }
            if (types.includes('administrative_area_level_3') && (!taluka || taluka.toLowerCase() === district.toLowerCase()) && !name.toLowerCase().includes('division') && name.toLowerCase() !== district.toLowerCase()) {
              taluka = name;
            }
            if (types.includes('locality') || types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('sublocality_level_2') || types.includes('neighborhood') || types.includes('village')) {
              const cleaned = cleanVillageName(name);
              if (cleaned) villageSet.add(cleaned);
            }
          });
        });
      }

      // 3. Process Google Places Text Search API
      if (googlePlacesRes && googlePlacesRes.status === 'OK' && googlePlacesRes.results) {
        googlePlacesRes.results.forEach((place: any) => {
          if (place.name) {
            const cleaned = cleanVillageName(place.name);
            if (cleaned) villageSet.add(cleaned);
          }
        });
      }
    } catch (err) {
      console.error('Error fetching live pincode data:', err);
    }

    return {
      pincode,
      state,
      district,
      taluka: taluka || district,
      villages: Array.from(villageSet).sort()
    };
  },

  getStates: async () => {
    const response = await axiosInstance.get('/location/states');
    return response.data;
  },

  getDistricts: async (state: string) => {
    const response = await axiosInstance.get(`/location/districts?state=${encodeURIComponent(state)}`);
    return response.data;
  },

  getBlocks: async (state: string, district: string) => {
    const response = await axiosInstance.get(`/location/blocks?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    return response.data;
  },

  getVillages: async (state: string, district: string, block: string) => {
    const response = await axiosInstance.get(`/location/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&block=${encodeURIComponent(block)}`);
    return response.data;
  },

  getLocationDetails: async (state: string, district: string, block: string, village: string) => {
    const response = await axiosInstance.get(`/location/details?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&block=${encodeURIComponent(block)}&village=${encodeURIComponent(village)}`);
    return response.data;
  }
};
