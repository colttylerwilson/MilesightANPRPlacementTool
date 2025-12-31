
export interface Point {
  x: number;
  y: number;
}

export type UnitSystem = 'ft' | 'm';

export interface Camera {
  id: string;
  x: number;
  y: number;
  rotation: number; // degrees
  focalLength: number; // 8 - 32 mm
  model: string;
}

export interface Car {
  id: string;
  x: number;
  y: number;
  rotation: number; // degrees
  length: number; // units (ft or m)
  width: number; // units (ft or m)
}

export interface Calibration {
  p1: Point | null;
  p2: Point | null;
  distanceInUnits: number;
  pixelsPerUnit: number;
}

export interface SimulationResult {
  ppf: number; // This acts as "Pixels Per Unit" (PPF or PPM)
  angleToPlate: number; // degrees
  isValid: boolean;
  distance: number; // units
}
