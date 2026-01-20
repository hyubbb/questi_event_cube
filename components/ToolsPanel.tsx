import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, PlusSquare, Eraser, Cuboid, RefreshCw, Eye, Hash, Palette, GripVertical } from 'lucide-react';
import { VOXEL_COLORS } from '../constants';

interface ToolsPanelProps {
  tool: 'build' | 'erase';
  setTool: (t: 'build' | 'erase') => void;
  onClear: () => void;
  mode: '3d-edit' | '2d-blueprint';
  setMode: (m: '3d-edit' | '2d-blueprint') => void;
  showXRay: boolean;
  setShowXRay: (x: boolean) => void;
  showNumbers: boolean;
  setShowNumbers: (x: boolean) => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  onGenerate?: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  tool,
  setTool,
  onClear,
  mode,
  setMode,
  showXRay,
  setShowXRay,
  showNumbers,
  setShowNumbers,
  selectedColor,
  setSelectedColor,
  onGenerate
}) => {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [size, setSize] = useState<Size | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;

    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();

    // Capture current size before switching to fixed position
    if (!hasBeenDragged) {
      setSize({ width: rect.width, height: rect.height });
      setPosition({ x: rect.left, y: rect.top });
    }

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    setHasBeenDragged(true);
  }, [hasBeenDragged]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!panelRef.current) return;

    const touch = e.touches[0];
    const rect = panelRef.current.getBoundingClientRect();

    // Capture current size before switching to fixed position
    if (!hasBeenDragged) {
      setSize({ width: rect.width, height: rect.height });
      setPosition({ x: rect.left, y: rect.top });
    }

    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
    setHasBeenDragged(true);
  }, [hasBeenDragged]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      setHasBeenDragged(true);

      // Calculate new position
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      // Boundary constraints
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 200);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 400);

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      const touch = e.touches[0];
      setHasBeenDragged(true);

      let newX = touch.clientX - dragOffset.x;
      let newY = touch.clientY - dragOffset.y;

      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 200);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 400);

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Reset position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (hasBeenDragged && panelRef.current) {
        const maxX = window.innerWidth - panelRef.current.offsetWidth;
        const maxY = window.innerHeight - panelRef.current.offsetHeight;

        setPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY))
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasBeenDragged]);

  const panelStyle: React.CSSProperties = hasBeenDragged
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50,
        width: size?.width,
        maxWidth: size?.width,
      }
    : {};

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className={`bg-white rounded-xl shadow-lg flex flex-col border border-gray-100 w-full md:w-64 lg:w-72 h-min md:h-auto overflow-hidden ${isDragging ? 'cursor-grabbing shadow-2xl scale-[1.02]' : ''} transition-shadow`}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`flex items-center justify-center gap-1 py-2 bg-gray-50 border-b border-gray-100 cursor-grab select-none ${isDragging ? 'cursor-grabbing bg-gray-100' : 'hover:bg-gray-100'} transition-colors`}
      >
        <GripVertical size={16} className="text-gray-400" />
        <span className="text-xs text-gray-400 font-medium hidden md:inline">드래그하여 이동</span>
      </div>

      {/* Panel Content */}
      <div className="p-4 flex flex-col gap-4 overflow-x-auto md:overflow-visible flex-row md:flex-col items-center md:items-stretch">
        {/* Mode Switcher */}
        <div className="flex flex-col gap-2 w-full">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:block">Mode</span>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('3d-edit')}
              className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${mode === '3d-edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Interactive 3D Manipulation"
            >
              <Cuboid size={18} className="md:mr-2" />
              <span className="hidden md:inline">3D Build</span>
            </button>
            <button
              onClick={() => setMode('2d-blueprint')}
              className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${mode === '2d-blueprint' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Create from 2D projections"
            >
              <RefreshCw size={18} className="md:mr-2" />
              <span className="hidden md:inline">2D Blueprint</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-200 w-full hidden md:block"></div>

        {mode === '3d-edit' ? (
          <>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:block">Tools</span>
            <div className="flex md:flex-col gap-2 w-full">
              <button
                onClick={() => setTool('build')}
                className={`flex items-center p-2 rounded-lg transition-colors ${tool === 'build' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <div className={`p-1.5 rounded-md mr-3 ${tool === 'build' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <PlusSquare size={16} />
                </div>
                <span className="font-medium hidden md:inline">Add Block</span>
              </button>
              <button
                onClick={() => setTool('erase')}
                className={`flex items-center p-2 rounded-lg transition-colors ${tool === 'erase' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <div className={`p-1.5 rounded-md mr-3 ${tool === 'erase' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Eraser size={16} />
                </div>
                <span className="font-medium hidden md:inline">Remove</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100 hidden md:block">
              Fill in the Top, Front, and Side grids to generate a 3D shape automatically.
            </p>
            <button
              onClick={onGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 animate-pulse"
            >
              <RefreshCw size={16} />
              Generate 3D
            </button>
          </div>
        )}

        <div className="h-px bg-gray-200 w-full hidden md:block"></div>

        {/* Color Selector */}
        <div className="flex items-center justify-between w-full hidden md:flex">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Color</span>
          <Palette size={14} className="text-gray-400" />
        </div>

        <div className="grid grid-cols-4 gap-2 w-full">
          {VOXEL_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor(color);
                if (mode === '3d-edit') setTool('build');
              }}
              className={`w-full aspect-square rounded-full shadow-sm transition-transform hover:scale-110 border border-gray-200 ${selectedColor === color ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : ''}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        <div className="h-px bg-gray-200 w-full hidden md:block"></div>

        <div className="flex md:flex-col gap-2 w-full">
          <button
            onClick={() => setShowXRay(!showXRay)}
            className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium w-full transition-colors ${showXRay ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            title="Toggle Transparent View"
          >
            <Eye size={16} className="md:mr-2" />
            <span className="hidden md:inline">{showXRay ? 'X-Ray On' : 'X-Ray Off'}</span>
          </button>

          <button
            onClick={() => setShowNumbers(!showNumbers)}
            className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium w-full transition-colors ${showNumbers ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            title="Toggle Numbers on 2D Grids"
          >
            <Hash size={16} className="md:mr-2" />
            <span className="hidden md:inline">{showNumbers ? 'Numbers On' : 'Numbers Off'}</span>
          </button>

          <button
            onClick={onClear}
            className="flex items-center justify-center p-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 w-full transition-colors mt-2"
          >
            <Trash2 size={16} className="md:mr-2" />
            <span className="hidden md:inline">Clear All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
