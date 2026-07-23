import React from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, min, max, error }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm outline-none transition-all ${
            error ? 'border-red-400' : 'border-stone-200 focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10'
          }`}
        />
        <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default DatePicker;
