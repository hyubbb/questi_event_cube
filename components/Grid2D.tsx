import React from 'react';
import { GRID_SIZE } from '../constants';

interface Grid2DProps {
  label: string;
  data: boolean[][];
  onToggle?: (row: number, col: number) => void;
  editable: boolean;
  numbers?: (number | null)[][]; // For top view height numbers
  xAxisLabel?: string;
  yAxisLabel?: string;
  headerAction?: React.ReactNode;
}

export const Grid2D: React.FC<Grid2DProps> = ({ 
  label, 
  data, 
  onToggle, 
  editable, 
  numbers,
  xAxisLabel,
  yAxisLabel,
  headerAction
}) => {
  return (
    <div className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center w-full mb-2">
        <h3 className="text-sm font-bold text-gray-700">{label}</h3>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div 
        className="grid gap-1 bg-gray-200 p-1 rounded"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {data.map((row, rIndex) => (
          row.map((active, cIndex) => {
            const num = numbers ? numbers[rIndex][cIndex] : null;
            return (
              <div
                key={`${rIndex}-${cIndex}`}
                onClick={() => editable && onToggle && onToggle(rIndex, cIndex)}
                className={`
                  w-8 h-8 flex items-center justify-center text-xs font-bold rounded-sm transition-all duration-200 select-none
                  ${editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                  ${active || (num && num > 0) ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-gray-300'}
                `}
              >
                {numbers ? (num && num > 0 ? num : '') : ''}
              </div>
            );
          })
        ))}
      </div>
      {(xAxisLabel || yAxisLabel) && (
        <div className="flex justify-between w-full text-[10px] text-gray-400 mt-1 px-1">
           <span>{xAxisLabel}</span>
           <span>{yAxisLabel}</span>
        </div>
      )}
    </div>
  );
};
