import { Injectable, Logger } from '@nestjs/common';
import { VEHICLE_MASTER, VehicleConfig } from './vehicle.config';

export interface VehicleInfo {
  id: string | number;
  name: string;
  capacity: number;
  description: string;
  icon: string;
}

export interface VehicleSuggestion {
  recommendedVehicle: VehicleInfo | null;
  recommendedCapacity: number | null;
  otherSuitableVehicles: VehicleInfo[];
}

@Injectable()
export class VehicleSuggestionService {
  private readonly logger = new Logger(VehicleSuggestionService.name);

  getSuggestion(parcelWeight: number | null | undefined): VehicleSuggestion | null {
    try {
      if (
        parcelWeight === null ||
        parcelWeight === undefined ||
        Number.isNaN(parcelWeight) ||
        parcelWeight < 0
      ) {
        return {
          recommendedVehicle: null,
          recommendedCapacity: null,
          otherSuitableVehicles: [],
        };
      }

      // 1. Sort all vehicles by capacity ascending
      const sortedVehicles = [...VEHICLE_MASTER].sort((a, b) => a.capacity - b.capacity);

      // 2. Find recommended vehicle (lowest capacity >= parcelWeight)
      let recommendedVehicle: VehicleConfig | undefined;
      for (const v of sortedVehicles) {
        if (v.capacity >= parcelWeight) {
          recommendedVehicle = v;
          break;
        }
      }

      // 3. Fallback: If no vehicle can handle it (weight > max capacity), pick the largest one.
      if (!recommendedVehicle && sortedVehicles.length > 0) {
        recommendedVehicle = sortedVehicles[sortedVehicles.length - 1];
      }

      if (!recommendedVehicle) {
        return {
          recommendedVehicle: null,
          recommendedCapacity: null,
          otherSuitableVehicles: [],
        };
      }

      // 4. Find suitable vehicles (strictly ascending, excluding recommended vehicle)
      const suitableVehicles = sortedVehicles.filter(
        (v) => v.capacity >= parcelWeight && v.id !== recommendedVehicle!.id
      );

      return {
        recommendedVehicle: {
          id: recommendedVehicle.id,
          name: recommendedVehicle.name,
          capacity: recommendedVehicle.capacity,
          description: recommendedVehicle.description,
          icon: recommendedVehicle.icon,
        },
        recommendedCapacity: recommendedVehicle.capacity,
        otherSuitableVehicles: suitableVehicles.map(v => ({
          id: v.id,
          name: v.name,
          capacity: v.capacity,
          description: v.description,
          icon: v.icon,
        }))
      };
    } catch (error) {
      this.logger.error('Failed to generate vehicle suggestion', error);
      return {
        recommendedVehicle: null,
        recommendedCapacity: null,
        otherSuitableVehicles: [],
      };
    }
  }
}
