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
    id: 'car',
    name: 'Car',
    capacity: 150,
    description: 'Best for small to medium deliveries',
    icon: 'car'
  },
  {
    id: 'auto',
    name: 'Auto Rickshaw (Cargo)',
    capacity: 250,
    description: 'Suitable for medium deliveries',
    icon: 'auto'
  },
  {
    id: 'pickup',
    name: 'Pickup (Tata Ace / Bolero Pickup)',
    capacity: 750,
    description: 'Good for heavy & bulk deliveries',
    icon: 'pickup'
  },
  {
    id: 'minivan',
    name: 'Mini Van',
    capacity: 1000,
    description: 'Great for bulkier deliveries',
    icon: 'minivan'
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
