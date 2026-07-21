export interface VehicleConfig {
  id: string;
  name: string;
  capacity: number;
  description: string;
  icon: string;
}

export const VEHICLE_MASTER: VehicleConfig[] = [
  {
    id: 'bike',
    name: 'Bike / Scooty',
    capacity: 30,
    description: 'Suitable for small deliveries',
    icon: 'bike'
  },
  {
    id: 'auto',
    name: 'Auto Rickshaw',
    capacity: 250,
    description: 'Suitable for medium deliveries',
    icon: 'auto'
  },
  {
    id: 'car',
    name: 'Car',
    capacity: 150,
    description: 'Best for small to medium deliveries',
    icon: 'car'
  },
  {
    id: 'minivan',
    name: 'Mini Van',
    capacity: 1000,
    description: 'Great for bulkier deliveries',
    icon: 'minivan'
  },
  {
    id: 'pickup',
    name: 'Pickup',
    capacity: 750,
    description: 'Good for heavy & bulk deliveries',
    icon: 'pickup'
  },
  {
    id: 'small_truck',
    name: 'Small Truck',
    capacity: 2500,
    description: 'Suitable for large & heavy shipments',
    icon: 'truck'
  },
  {
    id: 'tractor',
    name: 'Tractor / Trolley',
    capacity: 5000,
    description: 'Ideal for extremely heavy cargo',
    icon: 'tractor'
  }
];
