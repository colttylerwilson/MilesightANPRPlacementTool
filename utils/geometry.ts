
import { Point, Camera, Car, SimulationResult, UnitSystem } from '../types';

/**
 * Calculates the Horizontal Field of View (HFOV) in degrees 
 * for the Milesight TS8266-X4PE based on focal length (8mm - 32mm).
 * Range: 44° (wide) to 13° (tele).
 */
export const getHFOV = (focalLength: number): number => {
  const x1 = 8, y1 = 44;
  const x2 = 32, y2 = 13;
  return ((focalLength - x1) * (y2 - y1)) / (x2 - x1) + y1;
};

export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export const calculateSimulation = (
  camera: Camera,
  car: Car,
  pixelsPerUnit: number,
  unit: UnitSystem
): SimulationResult => {
  const carRad = toRadians(car.rotation);
  const plateX = car.x + Math.cos(carRad) * (car.length / 2 * pixelsPerUnit);
  const plateY = car.y + Math.sin(carRad) * (car.length / 2 * pixelsPerUnit);
  
  const platePos: Point = { x: plateX, y: plateY };
  const camPos: Point = { x: camera.x, y: camera.y };
  
  const distPixels = getDistance(camPos, platePos);
  const distUnits = distPixels / pixelsPerUnit;
  
  const plateNormalRad = carRad;
  const plateToCamX = camera.x - plateX;
  const plateToCamY = camera.y - plateY;
  const plateToCamRad = Math.atan2(plateToCamY, plateToCamX);
  
  let angleDiff = Math.abs(toDegrees(plateToCamRad - plateNormalRad));
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  
  const hfov = getHFOV(camera.focalLength);
  const widthAtDist = 2 * distUnits * Math.tan(toRadians(hfov / 2));
  const ppf = 3840 / widthAtDist;
  
  // Validation targets:
  // Imperial: 100 Pixels Per Foot
  // Metric: ~328 Pixels Per Meter (which is 100 PPF converted)
  const threshold = unit === 'ft' ? 100 : 328.084;
  
  const isValid = angleDiff <= 30 && ppf >= threshold;
  
  return {
    ppf,
    angleToPlate: angleDiff,
    isValid,
    distance: distUnits
  };
};
