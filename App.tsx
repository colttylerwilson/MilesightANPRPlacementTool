
import React, { useState } from 'react';
import { Camera, Car, Calibration, Point, UnitSystem } from './types';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const INITIAL_PIXELS_PER_FOOT = 10;
const FT_TO_M = 0.3048;

const App: React.FC = () => {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [unit, setUnit] = useState<UnitSystem>('ft');
  
  const [calibration, setCalibration] = useState<Calibration>({
    p1: null,
    p2: null,
    distanceInUnits: 30,
    pixelsPerUnit: INITIAL_PIXELS_PER_FOOT
  });

  const [camera, setCamera] = useState<Camera>({
    id: 'cam-1',
    x: 150,
    y: 150,
    rotation: 0,
    focalLength: 8,
    model: 'TS8266-X4PE'
  });

  const [car, setCar] = useState<Car>({
    id: 'car-1',
    x: 500,
    y: 500,
    rotation: 180,
    length: 15,
    width: 6
  });

  const toggleUnit = () => {
    const nextUnit = unit === 'ft' ? 'm' : 'ft';
    const factor = nextUnit === 'm' ? FT_TO_M : (1 / FT_TO_M);

    // Convert Calibration
    setCalibration(prev => ({
      ...prev,
      distanceInUnits: prev.distanceInUnits * factor,
      pixelsPerUnit: prev.pixelsPerUnit / factor
    }));

    // Convert Car dimensions
    setCar(prev => ({
      ...prev,
      length: prev.length * factor,
      width: prev.width * factor
    }));

    setUnit(nextUnit);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCalibration = () => {
    setCalibration(prev => ({ ...prev, p1: null, p2: null }));
    setIsCalibrating(true);
  };

  const handleCalibrationPoint = (p: Point) => {
    if (!isCalibrating) return;
    
    if (!calibration.p1) {
      setCalibration(prev => ({ ...prev, p1: p }));
    } else if (!calibration.p2) {
      const dist = Math.sqrt(Math.pow(p.x - calibration.p1.x, 2) + Math.pow(p.y - calibration.p1.y, 2));
      const ppu = dist / calibration.distanceInUnits;
      setCalibration(prev => ({ ...prev, p2: p, pixelsPerUnit: ppu }));
      setIsCalibrating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 select-none overflow-hidden text-slate-100">
      <Header 
        onFileSelect={handleFileChange} 
        onResetCalibration={resetCalibration}
        isCalibrating={isCalibrating}
        unit={unit}
        onToggleUnit={toggleUnit}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          camera={camera} 
          setCamera={setCamera} 
          car={car} 
          setCar={setCar} 
          calibration={calibration}
          setCalibration={setCalibration}
          zoom={zoom}
          setZoom={setZoom}
          unit={unit}
        />
        
        <main className="flex-1 relative bg-slate-950 border-l border-slate-800 overflow-hidden">
          <Editor 
            backgroundImage={backgroundImage}
            camera={camera}
            setCamera={setCamera}
            car={car}
            setCar={setCar}
            calibration={calibration}
            isCalibrating={isCalibrating}
            onCanvasClick={handleCalibrationPoint}
            zoom={zoom}
            setZoom={setZoom}
            unit={unit}
          />
          
          {isCalibrating && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 px-6 py-3 rounded-full shadow-2xl animate-bounce flex items-center gap-3 z-50">
              <i className="fas fa-ruler-combined"></i>
              <span className="font-bold">
                {!calibration.p1 ? "Click to set start point" : "Click to set end point"}
              </span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
