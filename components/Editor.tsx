
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Car, Calibration, Point, UnitSystem } from '../types';
import { calculateSimulation, getHFOV, toRadians, toDegrees } from '../utils/geometry';

interface EditorProps {
  backgroundImage: string | null;
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  car: Car;
  setCar: React.Dispatch<React.SetStateAction<Car>>;
  calibration: Calibration;
  isCalibrating: boolean;
  onCanvasClick: (p: Point) => void;
  zoom: number;
  setZoom: (z: number) => void;
  unit: UnitSystem;
}

const Editor: React.FC<EditorProps> = ({ 
  backgroundImage, camera, setCamera, car, setCar, calibration, isCalibrating, onCanvasClick, zoom, setZoom, unit 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [offset, setOffset] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState<'camera' | 'car' | 'pan' | null>(null);
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);

  // Helper to get plate position in pixels
  const getPlatePosition = useCallback(() => {
    const carRad = toRadians(car.rotation);
    const plateOffset = (car.length / 2) * calibration.pixelsPerUnit;
    return {
      x: car.x + Math.cos(carRad) * plateOffset,
      y: car.y + Math.sin(carRad) * plateOffset
    };
  }, [car.x, car.y, car.rotation, car.length, calibration.pixelsPerUnit]);

  // Auto-track logic: Camera always faces the plate
  useEffect(() => {
    const plate = getPlatePosition();
    const dx = plate.x - camera.x;
    const dy = plate.y - camera.y;
    const angle = toDegrees(Math.atan2(dy, dx));
    setCamera(prev => ({ ...prev, rotation: angle }));
  }, [camera.x, camera.y, car.x, car.y, car.rotation, car.length, calibration.pixelsPerUnit, setCamera, getPlatePosition]);

  // Handle Mouse Wheel Zoom (Focal Point Zoom)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomIntensity = 0.0015;
    const delta = -e.deltaY;
    const factor = Math.exp(delta * zoomIntensity);
    
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 20);
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mapX = (mouseX - offset.x) / zoom;
    const mapY = (mouseY - offset.y) / zoom;

    const newOffsetX = mouseX - mapX * newZoom;
    const newOffsetY = mouseY - mapY * newZoom;

    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [zoom, offset, setZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const handleMouseDown = (target: 'camera' | 'car' | 'pan') => (e: React.MouseEvent) => {
    if (isCalibrating && target !== 'pan') return;
    
    if (e.button === 2 || e.button === 1) {
      setDragging('pan');
    } else {
      e.stopPropagation();
      setDragging(target);
    }
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const contentX = (e.clientX - rect.left - offset.x) / zoom;
    const contentY = (e.clientY - rect.top - offset.y) / zoom;
    
    setHoverPos({ x: contentX, y: contentY });

    if (!dragging) return;

    if (dragging === 'pan' && lastMousePos) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (dragging === 'camera') {
      setCamera(prev => ({ ...prev, x: contentX, y: contentY }));
    } else if (dragging === 'car') {
      setCar(prev => ({ ...prev, x: contentX, y: contentY }));
    }
  }, [dragging, lastMousePos, offset, zoom, setCamera, setCar]);

  const handleMouseUp = () => setDragging(null);

  const stats = calculateSimulation(camera, car, calibration.pixelsPerUnit, unit);
  const hfov = getHFOV(camera.focalLength);
  const platePos = getPlatePosition();
  const unitLabel = unit === 'ft' ? 'ft' : 'm';
  const ppThreshold = unit === 'ft' ? 100 : 328;

  const cameraPhysicalSizeInFeet = 3; 
  const cameraPhysicalSize = unit === 'ft' ? cameraPhysicalSizeInFeet : (cameraPhysicalSizeInFeet * 0.3048);
  
  const installRadiusInFeet = 12; 
  const installRadius = unit === 'ft' ? installRadiusInFeet : (installRadiusInFeet * 0.3048);
  
  const MIN_SCREEN_SIZE = 36; // Minimum pixels on screen to remain clickable for CAMERA
  
  // Calculate map-space size based on calibration for CAMERA
  const baseCamPxSize = cameraPhysicalSize * calibration.pixelsPerUnit;
  // Ensure the element is at least MIN_SCREEN_SIZE / zoom in the scaled coordinate system
  const effectiveCamSize = Math.max(baseCamPxSize, MIN_SCREEN_SIZE / zoom);

  // For the CAR, we strictly use the map-scale calibration
  const carMapWidth = car.length * calibration.pixelsPerUnit;
  const carMapHeight = car.width * calibration.pixelsPerUnit;

  const radiusPxSize = installRadius * calibration.pixelsPerUnit;

  // Max valid distance calculation (where PPF drops below threshold)
  // Distance = Resolution / (2 * tan(hfov/2) * Threshold)
  const maxValidDist = 3840 / (2 * Math.tan(toRadians(hfov / 2)) * ppThreshold);
  const coneLength = maxValidDist * calibration.pixelsPerUnit;

  const leftAngle = toRadians(camera.rotation - hfov / 2);
  const rightAngle = toRadians(camera.rotation + hfov / 2);
  
  const lx = Math.cos(leftAngle) * coneLength;
  const ly = Math.sin(leftAngle) * coneLength;
  const rx = Math.cos(rightAngle) * coneLength;
  const ry = Math.sin(rightAngle) * coneLength;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#0f172a] cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={(e) => {
        if (e.button === 2) handleMouseDown('pan')(e);
      }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (!containerRef.current || dragging === 'pan') return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - offset.x) / zoom;
        const y = (e.clientY - rect.top - offset.y) / zoom;
        onCanvasClick({ x, y });
      }}
    >
      <div 
        ref={contentRef}
        className="absolute origin-top-left"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          minWidth: '4000px',
          minHeight: '4000px',
          imageRendering: 'auto'
        }}
      >
        {backgroundImage && (
          <img 
            src={backgroundImage} 
            alt="Site Plan" 
            className="absolute top-0 left-0 block h-auto max-w-none opacity-100 pointer-events-none"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        )}
        
        {!backgroundImage && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center pointer-events-none">
              <span className="text-slate-700 text-2xl font-bold italic tracking-widest opacity-20 uppercase">LOAD SITE PLAN TO BEGIN</span>
          </div>
        )}

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {isCalibrating && calibration.p1 && !calibration.p2 && hoverPos && (
            <g>
              <line x1={calibration.p1.x} y1={calibration.p1.y} x2={hoverPos.x} y2={hoverPos.y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              <circle cx={calibration.p1.x} cy={calibration.p1.y} r={4} fill="#3b82f6" />
            </g>
          )}

          {calibration.p1 && calibration.p2 && (
            <g>
              <line x1={calibration.p1.x} y1={calibration.p1.y} x2={calibration.p2.x} y2={calibration.p2.y} stroke="#3b82f6" strokeWidth={2} />
              <text 
                x={(calibration.p1.x + calibration.p2.x) / 2} 
                y={(calibration.p1.y + calibration.p2.y) / 2 - 10} 
                fill="#3b82f6" 
                fontSize={12} 
                fontWeight="bold" 
                textAnchor="middle"
                style={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }}
              >
                {calibration.distanceInUnits.toFixed(1)} {unitLabel}
              </text>
            </g>
          )}

          <circle cx={camera.x} cy={camera.y} r={radiusPxSize} fill="transparent" stroke={stats.isValid ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'} strokeWidth={1.5} strokeDasharray="8 4" />

          <path 
            d={`M ${camera.x} ${camera.y} L ${camera.x + lx} ${camera.y + ly} A ${coneLength} ${coneLength} 0 0 1 ${camera.x + rx} ${camera.y + ry} Z`}
            fill={stats.isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
            stroke={stats.isValid ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
          />

          <line x1={camera.x} y1={camera.y} x2={platePos.x} y2={platePos.y} stroke={stats.isValid ? '#22c55e' : '#ef4444'} strokeWidth={1} strokeDasharray="4 4" opacity="0.6" />
        </svg>

        <div 
          className="absolute cursor-move z-20 transition-transform duration-75"
          style={{ 
            left: car.x, top: car.y, 
            width: carMapWidth, 
            height: carMapHeight,
            transform: `translate(-50%, -50%) rotate(${car.rotation}deg)`,
          }}
          onMouseDown={handleMouseDown('car')}
        >
          <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-2xl overflow-visible">
            <path d="M12,7 L88,7 L93,15 L93,25 L88,33 L12,33 L7,25 L7,15 Z" fill="rgba(0,0,0,0.4)" filter="blur(2px)"/>
            <path d="M10,5 L90,5 L95,15 L95,25 L90,35 L10,35 L5,25 L5,15 Z" fill="#b91c1c" />
            <path d="M12,7 L88,7 L92,15 L92,25 L88,33 L12,33 L8,25 L8,15 Z" fill="#dc2626" />
            <rect x="25" y="10" width="45" height="20" rx="3" fill="#1e293b" opacity="0.9" />
            <rect x="92" y="8" width="3" height="6" rx="1" fill="#fde047" opacity="0.8" />
            <rect x="92" y="26" width="3" height="6" rx="1" fill="#fde047" opacity="0.8" />
          </svg>
        </div>

        <div 
          className="absolute cursor-move group z-30 flex items-center justify-center transition-transform duration-75"
          style={{ 
            left: camera.x, top: camera.y,
            width: effectiveCamSize,
            height: effectiveCamSize,
            transform: `translate(-50%, -50%) rotate(${camera.rotation}deg)` 
          }}
          onMouseDown={handleMouseDown('camera')}
        >
          <div className={`w-full h-full rounded-full border-2 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all ${stats.isValid ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400'}`}>
             <i className="fas fa-video text-white" style={{ fontSize: `${effectiveCamSize * 0.4}px` }}></i>
          </div>
          
          <div 
            className="absolute bg-slate-900/95 border border-slate-700 px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 flex flex-col items-center pointer-events-none shadow-2xl transition-opacity"
            style={{ 
                transform: `rotate(${-camera.rotation}deg) translateY(-150%)`,
                fontSize: `11px`
            }}
          >
            <span className="font-bold text-white tracking-wider uppercase">MILESIGHT 4K ANPR</span>
            <span className="text-blue-400 font-mono font-bold">{camera.focalLength}mm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
