export type TrafficType = 'motorbike' | 'delivery_bike' | 'taxi' | 'delivery_truck';
export type ObstacleType = 'barricade' | 'boxes' | 'pothole' | 'street_cart';
export type HazardType = TrafficType | ObstacleType;

export interface HazardConfig {
  name: string;
  category: 'traffic' | 'obstacle';
  speedFactor: number;
  hitboxRoadXDist: number;
  hitboxRadiusX: number;
  hitboxRadiusY: number;
}

export const HAZARD_CONFIGS: Record<HazardType, HazardConfig> = {
  // --- Traffic Vehicles (dynamic moving hazards) ---
  motorbike: {
    name: 'Xe máy (Wave/Dream)',
    category: 'traffic',
    speedFactor: 0.70,
    hitboxRoadXDist: 0.22,
    hitboxRadiusX: 20,
    hitboxRadiusY: 26,
  },
  delivery_bike: {
    name: 'Xe shipper công nghệ',
    category: 'traffic',
    speedFactor: 0.68,
    hitboxRoadXDist: 0.22,
    hitboxRadiusX: 20,
    hitboxRadiusY: 28,
  },
  taxi: {
    name: 'Taxi đô thị',
    category: 'traffic',
    speedFactor: 0.62,
    hitboxRoadXDist: 0.28,
    hitboxRadiusX: 28,
    hitboxRadiusY: 26,
  },
  delivery_truck: {
    name: 'Xe tải chở hàng',
    category: 'traffic',
    speedFactor: 0.54,
    hitboxRoadXDist: 0.30,
    hitboxRadiusX: 34,
    hitboxRadiusY: 34,
  },

  // --- Static Road Hazards ---
  barricade: {
    name: 'Rào chắn thi công',
    category: 'obstacle',
    speedFactor: 1.0,
    hitboxRoadXDist: 0.25,
    hitboxRadiusX: 28,
    hitboxRadiusY: 22,
  },
  boxes: {
    name: 'Thùng hàng & két nhựa',
    category: 'obstacle',
    speedFactor: 1.0,
    hitboxRoadXDist: 0.24,
    hitboxRadiusX: 26,
    hitboxRadiusY: 22,
  },
  pothole: {
    name: 'Ổ gà đường phố',
    category: 'obstacle',
    speedFactor: 1.0,
    hitboxRoadXDist: 0.23,
    hitboxRadiusX: 25,
    hitboxRadiusY: 14,
  },
  street_cart: {
    name: 'Xe đẩy vỉa hè',
    category: 'obstacle',
    speedFactor: 1.0,
    hitboxRoadXDist: 0.26,
    hitboxRadiusX: 28,
    hitboxRadiusY: 26,
  },
};

