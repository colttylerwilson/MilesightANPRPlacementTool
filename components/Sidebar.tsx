
import React from 'react';
import { Camera, Car, Calibration, UnitSystem } from '../types';
import { calculateSimulation, getHFOV } from '../utils/geometry';

interface SidebarProps {
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  car: Car;
  setCar: React.Dispatch<React.SetStateAction<Car>>;
  calibration: Calibration;
  setCalibration: React.Dispatch<React.SetStateAction<Calibration>>;
  zoom: number;
  setZoom: (z: number) => void;
  unit: UnitSystem;
}

const Sidebar: React.FC<SidebarProps> = ({ camera, setCamera, car, setCar, calibration, setCalibration, zoom, setZoom, unit }) => {
  const stats = calculateSimulation(camera, car, calibration.pixelsPerUnit, unit);
  const hfov = getHFOV(camera.focalLength);

  const handleCalibrationDistanceChange = (newDist: number) => {
    setCalibration(prev => {
      let newPpu = prev.pixelsPerUnit;
      if (prev.p1 && prev.p2) {
        const pxDist = Math.sqrt(Math.pow(prev.p2.x - prev.p1.x, 2) + Math.pow(prev.p2.y - prev.p1.y, 2));
        newPpu = pxDist / (newDist || 1);
      }
      return { ...prev, distanceInUnits: newDist, pixelsPerUnit: newPpu };
    });
  };

  const ppLabel = unit === 'ft' ? 'PPF' : 'PPM';
  const unitLabel = unit === 'ft' ? 'ft' : 'm';
  const ppThreshold = unit === 'ft' ? 100 : 328;

  return (
    <aside className="w-80 bg-slate-900 p-6 flex flex-col gap-6 overflow-y-auto border-r border-slate-700 shadow-2xl z-40">
      {/* 1. ANPR Validation */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">ANPR Validation</h3>
        <div className={`p-4 rounded-xl border-2 transition-all duration-500 ${stats.isValid ? 'bg-green-950/30 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-red-950/30 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-black tracking-tighter ${stats.isValid ? 'text-green-400' : 'text-red-400'}`}>
              {stats.isValid ? 'OPTIMAL CAPTURE' : 'INSUFFICIENT DATA'}
            </span>
            <i className={`fas ${stats.isValid ? 'fa-check-double text-green-400' : 'fa-exclamation-triangle text-red-400'} text-xl`}></i>
          </div>
          
          <div className="space-y-4">
            <Metric label={`Pixels Per ${unit === 'ft' ? 'Foot' : 'Meter'} (${ppLabel})`} value={`${Math.round(stats.ppf)}`} target={`${ppThreshold}+`} isWarning={stats.ppf < ppThreshold} />
            <Metric label="Angle to Plate" value={`${Math.round(stats.angleToPlate)}°`} target="< 30°" isWarning={stats.angleToPlate > 30} />
            <Metric label={`Distance to Plate`} value={`${stats.distance.toFixed(1)} ${unitLabel}`} />
          </div>
        </div>
      </section>

      {/* 2. Live Capture Preview */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Live Capture Preview</h3>
        <div className="bg-[#1a202c] rounded-xl border border-slate-700 overflow-hidden relative shadow-inner">
           <div className="flex flex-col items-center justify-center min-h-[160px] bg-gradient-to-b from-[#2d3748] to-[#1a202c] p-4">
              <PlateCaptureView ppf={stats.ppf} angle={stats.angleToPlate} unit={unit} />
           </div>
           <div className="bg-slate-950/80 backdrop-blur-sm py-2 px-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter uppercase">ANPR SENSOR VIEW</span>
              <span className={`text-[10px] font-mono font-bold ${stats.ppf >= ppThreshold ? 'text-green-400' : 'text-yellow-500'}`}>{Math.round(stats.ppf)} {ppLabel}</span>
           </div>
        </div>
      </section>

      {/* 3. Milesight 4K Config */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Milesight 4K Config</h3>
        <div className="space-y-6">
          <Slider label="Focal Length" value={camera.focalLength} min={8} max={32} suffix="mm" onChange={(v) => setCamera(prev => ({ ...prev, focalLength: v }))} />
          <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-800/50 p-3 rounded-lg border border-slate-800">
            <div><span className="block text-slate-500 mb-1 uppercase">HFOV</span><span className="font-mono text-blue-400 font-bold">{hfov.toFixed(1)}°</span></div>
            <div><span className="block text-slate-500 mb-1 uppercase">Resolution</span><span className="font-mono text-blue-400 font-bold">3840 x 2160</span></div>
          </div>
        </div>
      </section>

      {/* 4. Target Vehicle */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Target Vehicle</h3>
        <div className="space-y-6">
          <Slider 
            label="Vehicle Orientation" 
            value={car.rotation} 
            min={0} 
            max={359} 
            suffix="°" 
            onChange={(v) => setCar(prev => ({ ...prev, rotation: v }))} 
          />
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 flex justify-between">
            <div className="text-[10px] text-slate-500 uppercase font-bold">L: {car.length.toFixed(1)}{unitLabel}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">W: {car.width.toFixed(1)}{unitLabel}</div>
          </div>
        </div>
      </section>

      {/* 5. Map Controls */}
      <section className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Map Controls</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-blue-400">
              <i className="fas fa-mouse"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 uppercase">Zoom</span>
              <span className="text-[10px] text-slate-500 italic">Scroll wheel to zoom in/out</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-blue-400">
              <i className="fas fa-mouse-pointer"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 uppercase">Pan</span>
              <span className="text-[10px] text-slate-500 italic">Right-click + drag to move map</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Site Calibration */}
      <section className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 mb-8">
         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Site Calibration</h3>
         <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Ref Distance ({unit === 'ft' ? 'Feet' : 'Meters'})</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.1"
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full outline-none focus:border-blue-500 transition-colors" 
                  value={Number(calibration.distanceInUnits.toFixed(2))} 
                  onChange={(e) => handleCalibrationDistanceChange(Number(e.target.value))} 
                />
              </div>
            </div>
            <div className="text-[9px] font-mono text-slate-500 flex justify-between uppercase tracking-wider">
              <span>Map Scale Factor</span>
              <span className="text-blue-500 font-bold">{calibration.pixelsPerUnit.toFixed(2)} px/{unitLabel}</span>
            </div>
         </div>
      </section>
    </aside>
  );
};

const PlateCaptureView = ({ ppf, angle, unit }: { ppf: number; angle: number; unit: UnitSystem }) => {
  const displayWidth = 200;
  const displayHeight = 100;
  const horizontalScale = Math.cos((angle * Math.PI) / 180);
  
  const ppThreshold = unit === 'ft' ? 100 : 328;
  const ppLabel = unit === 'ft' ? 'PPF' : 'PPM';
  
  const blurAmount = ppf < ppThreshold ? (ppThreshold - ppf) / (ppThreshold / 10) : 0;
  const isLowRes = ppf < (ppThreshold * 0.6);

  return (
    <div className="flex flex-col items-center justify-center transition-all duration-300">
      <div 
        className="relative bg-white rounded-md shadow-2xl overflow-hidden border border-slate-300 flex items-center justify-center transition-all duration-300"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          transform: `scaleX(${horizontalScale})`,
          filter: `blur(${blurAmount}px)`,
          imageRendering: isLowRes ? 'pixelated' : 'auto'
        }}
      >
        <div 
          className="flex items-center justify-center w-full h-full px-4 overflow-hidden"
          style={{
             fontSize: `${displayHeight * 0.35}px`,
             fontFamily: '"Roboto Mono", "Courier New", monospace',
             letterSpacing: '-0.02em'
          }}
        >
          <span className="font-bold text-[#1e3a8a] whitespace-nowrap leading-none select-none">
            ABC 123
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
         <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tight ${ppf >= ppThreshold ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {ppf >= ppThreshold ? `${ppLabel} PASSED` : `LOW ${ppLabel}`}
         </span>
         <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tight ${angle <= 30 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {Math.round(angle)}° ANGLE {angle <= 30 ? 'OK' : 'FAIL'}
         </span>
      </div>
    </div>
  );
};

const Metric = ({ label, value, target, isWarning }: { label: string, value: string, target?: string, isWarning?: boolean }) => (
  <div className="flex justify-between items-end border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
    <div>
      <span className="text-[9px] text-slate-500 uppercase font-black block tracking-widest mb-0.5">{label}</span>
      <span className={`text-xl font-mono font-bold ${isWarning ? 'text-red-400' : 'text-slate-100'}`}>{value}</span>
    </div>
    {target && (
      <div className="text-right">
        <span className="text-[9px] text-slate-600 block font-bold uppercase tracking-tighter">SPEC</span>
        <span className="text-xs text-slate-400 font-mono font-bold">{target}</span>
      </div>
    )}
  </div>
);

const Slider = ({ label, value, min, max, suffix, onChange }: { label: string, value: number, min: number, max: number, suffix: string, onChange: (v: number) => void }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-xs font-bold">
      <span className="text-slate-400 uppercase tracking-tighter">{label}</span>
      <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} value={value} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" onChange={(e) => onChange(Number(e.target.value))} />
  </div>
);

export default Sidebar;
