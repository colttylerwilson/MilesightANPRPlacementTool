
import React from 'react';
import { UnitSystem } from '../types';

interface HeaderProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetCalibration: () => void;
  isCalibrating: boolean;
  unit: UnitSystem;
  onToggleUnit: () => void;
}

const Header: React.FC<HeaderProps> = ({ onFileSelect, onResetCalibration, isCalibrating, unit, onToggleUnit }) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
          <i className="fas fa-video text-white text-xl"></i>
        </div>
        <h1 className="text-xl font-black tracking-tight text-white">
          ANPR <span className="text-blue-400 font-medium">Placement Tool</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Unit Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={unit === 'm' ? onToggleUnit : undefined}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${unit === 'ft' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            FT
          </button>
          <button 
            onClick={unit === 'ft' ? onToggleUnit : undefined}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${unit === 'm' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            M
          </button>
        </div>

        <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-md cursor-pointer transition-colors border border-slate-600">
          <i className="fas fa-map text-slate-400"></i>
          <span className="text-sm font-semibold">Load Site Plan</span>
          <input 
            type="file" 
            className="hidden" 
            accept=".png, .jpg, .jpeg" 
            onChange={onFileSelect} 
          />
        </label>

        <button 
          onClick={onResetCalibration}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all border ${
            isCalibrating 
              ? 'bg-blue-600 border-blue-400' 
              : 'bg-slate-800 hover:bg-slate-700 border-slate-600'
          }`}
        >
          <i className="fas fa-ruler"></i>
          <span className="text-sm font-semibold">Calibrate Scale</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
