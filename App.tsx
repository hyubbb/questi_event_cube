import React, { useState, useEffect, useMemo } from 'react';
import { Voxel, ViewMode, GridState, QuizState } from './types';
import { INITIAL_VOXELS, GRID_SIZE, COLORS, MAX_HEIGHT } from './constants';
import { CubeStage } from './components/CubeStage';
import { Grid2D } from './components/Grid2D';
import { ToolsPanel } from './components/ToolsPanel';
import { QuizMode } from './components/QuizMode';
import { QuizResult } from './components/QuizResult';
import { ResultModal, ShareModal } from './components/Modal';
import { calculateStats, project3DTo2D, intersect2DTo3D, generateTopViewNumbers, generateFrontViewNumbers, generateSideViewNumbers } from './utils/voxelEngine';
import { decodeVoxels, generateQuizUrl, clearQuizFromUrl, parseQuizFromUrl, parseTimerFromUrl } from './utils/shareUtils';
import { Box, Layers, Scaling, ArrowLeftRight, Share2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [voxels, setVoxels] = useState<Voxel[]>(INITIAL_VOXELS);
  const [mode, setMode] = useState<ViewMode>('3d-edit');
  const [tool, setTool] = useState<'build' | 'erase'>('build');
  const [showXRay, setShowXRay] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS.voxelDefault);
  
  // Controls the direction of the Side View (Right vs Left)
  const [sideViewDirection, setSideViewDirection] = useState<'right' | 'left'>('right');

  // Blueprint State (for 2D to 3D mode)
  const [blueprint, setBlueprint] = useState<GridState>({
    top: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
    front: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
    side: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
  });

  // Quiz Mode State
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizVoxels, setQuizVoxels] = useState<Voxel[]>([]);
  const [quizState, setQuizState] = useState<QuizState>('playing');
  const [userAnswer, setUserAnswer] = useState<number>(0);
  const [quizTimer, setQuizTimer] = useState<number>(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [baseShareUrl, setBaseShareUrl] = useState('');

  // --- Derived State ---
  const stats = useMemo(() => calculateStats(voxels), [voxels]);
  
  // Real-time projections from 3D model
  const currentProjections = useMemo(() => project3DTo2D(voxels), [voxels]);
  
  // View numbers (Top: Height, Front: Depth Z, Side: Depth X)
  const topViewNumbers = useMemo(() => generateTopViewNumbers(voxels), [voxels]);
  const frontViewNumbers = useMemo(() => generateFrontViewNumbers(voxels), [voxels]);
  const sideViewNumbers = useMemo(() => generateSideViewNumbers(voxels), [voxels]);

  // --- Handlers ---

  const handleAddVoxel = (x: number, y: number, z: number) => {
    if (mode === '2d-blueprint') return;
    if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE || y < 0 || y >= MAX_HEIGHT) return;

    // Check collision
    const exists = voxels.some(v => v.x === x && v.y === y && v.z === z);
    if (!exists) {
      setVoxels(prev => [...prev, { x, y, z, id: `${x},${y},${z}`, color: selectedColor }]);
    }
  };

  const handleRemoveVoxel = (id: string) => {
    if (mode === '2d-blueprint') return;
    setVoxels(prev => prev.filter(v => v.id !== id));
  };

  // Wrapper for 3D stage interaction that checks current tool
  const onStageInteractAdd = (x: number, y: number, z: number) => {
      if (tool === 'build') handleAddVoxel(x, y, z);
  };
  
  const onStageInteractRemove = (id: string) => {
      if (tool === 'erase') handleRemoveVoxel(id);
  };

  // 2D Grid Handlers
  const handleBlueprintToggle = (view: 'top' | 'front' | 'side', r: number, c: number) => {
    setBlueprint(prev => {
      const newGrid = prev[view].map((row, rIdx) => 
        row.map((val, cIdx) => (rIdx === r && cIdx === c ? !val : val))
      );
      return { ...prev, [view]: newGrid };
    });
  };

  const generateFromBlueprint = () => {
    const newVoxels = intersect2DTo3D(blueprint);
    // Apply selected color to generated voxels or use default
    const coloredVoxels = newVoxels.map(v => ({...v, color: selectedColor}));
    setVoxels(coloredVoxels);
    setMode('3d-edit'); // Switch back to 3D to show result
  };

  const clearAll = () => {
    setVoxels([]);
    setBlueprint({
        top: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
        front: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
        side: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
    });
  };

  // Sync blueprint with current 3D state when entering 2D mode
  useEffect(() => {
    if (mode === '2d-blueprint') {
       setBlueprint(currentProjections);
    }
  }, [mode]);

  // Check for quiz mode on initial load (URL parameter)
  useEffect(() => {
    const puzzleParam = parseQuizFromUrl();
    if (puzzleParam) {
      const decodedVoxels = decodeVoxels(puzzleParam);
      if (decodedVoxels && decodedVoxels.length > 0) {
        setQuizVoxels(decodedVoxels);
        setIsQuizMode(true);
        setQuizState('playing');
        // Parse timer from URL
        const timer = parseTimerFromUrl();
        setQuizTimer(timer);
      }
    }
  }, []);

  // Quiz Handlers
  const handleQuizSubmit = (answer: number) => {
    setUserAnswer(answer);
    const correctAnswer = quizVoxels.length;
    const isCorrect = answer === correctAnswer;
    setQuizState(isCorrect ? 'correct' : 'incorrect');
    setShowResultModal(true);
  };

  const handleRevealResult = () => {
    setShowResultModal(false);
    setQuizState('revealed');
  };

  const handleExitQuizMode = () => {
    setIsQuizMode(false);
    setQuizVoxels([]);
    setQuizState('playing');
    setUserAnswer(0);
    clearQuizFromUrl();
  };

  const handleShare = () => {
    if (voxels.length === 0) {
      alert('블록을 먼저 쌓아주세요!');
      return;
    }
    const url = generateQuizUrl(voxels);
    setBaseShareUrl(url);
    setShowShareModal(true);
  };

  const handleShareFromResult = () => {
    const url = generateQuizUrl(quizVoxels);
    setBaseShareUrl(url);
    setShowShareModal(true);
  }; 

  // --- Render Helpers ---

  // Prepare Side View Data (Handle Flipping for Left View)
  const rawSideData = mode === '3d-edit' ? currentProjections.side : blueprint.side;
  
  // If viewing from Left, we horizontally flip the grid (reverse columns)
  // Standard Right View: Z axis 0 -> MAX
  // Left View: Z axis MAX -> 0 (Mirrored)
  const displaySideData = sideViewDirection === 'left' 
      ? rawSideData.map(row => [...row].reverse()) 
      : rawSideData;

  const displaySideNumbers = sideViewDirection === 'left' && mode === '3d-edit'
      ? sideViewNumbers.map(row => [...row].reverse())
      : sideViewNumbers;

  const handleSideToggle = (r: number, c: number) => {
      // If we are in Left View, the clicked column 'c' corresponds to 'GRID_SIZE - 1 - c' in the data
      const actualCol = sideViewDirection === 'left' ? GRID_SIZE - 1 - c : c;
      handleBlueprintToggle('side', r, actualCol);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-sky-50 overflow-hidden">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Box size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Cube Master</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 hidden sm:block">
             Elementary Geometry Simulator
          </div>
          {!isQuizMode && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              title="퀴즈로 공유하기"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">퀴즈 공유</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">

        {/* Quiz Mode: Playing */}
        {isQuizMode && quizState === 'playing' && (
          <QuizMode voxels={quizVoxels} onSubmit={handleQuizSubmit} timeLimit={quizTimer} />
        )}

        {/* Quiz Mode: Revealed (Result Screen) */}
        {isQuizMode && quizState === 'revealed' && (
          <QuizResult
            voxels={quizVoxels}
            correctAnswer={quizVoxels.length}
            userAnswer={userAnswer}
            isCorrect={userAnswer === quizVoxels.length}
            onNewQuiz={handleExitQuizMode}
            onShare={handleShareFromResult}
          />
        )}

        {/* Normal Mode (Editor) */}
        {!isQuizMode && (
          <>
            {/* Left Sidebar (Tools) */}
            <div className="absolute top-4 left-4 z-20 md:static md:p-4 md:z-auto pointer-events-none md:pointer-events-auto">
               <div className="pointer-events-auto w-full max-w-[300px]">
                 <ToolsPanel
                    tool={tool}
                    setTool={setTool}
                    onClear={clearAll}
                    mode={mode}
                    setMode={setMode}
                    showXRay={showXRay}
                    setShowXRay={setShowXRay}
                    showNumbers={showNumbers}
                    setShowNumbers={setShowNumbers}
                    selectedColor={selectedColor}
                    setSelectedColor={setSelectedColor}
                    onGenerate={generateFromBlueprint}
                 />
               </div>
            </div>

        {/* Center (3D Canvas) */}
        <div className="flex-1 relative bg-gradient-to-br from-sky-50 to-indigo-50/50">
          <div className="absolute inset-0">
             <CubeStage 
               voxels={mode === '3d-edit' ? voxels : intersect2DTo3D(blueprint)} 
               mode={mode}
               onAddVoxel={onStageInteractAdd}
               onRemoveVoxel={(id) => {
                 if (tool === 'erase') handleRemoveVoxel(id);
               }}
               showXRay={showXRay}
               selectedColor={selectedColor}
             />
          </div>
          
          {/* Instructions Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-gray-600 shadow-sm pointer-events-none select-none">
             {mode === '3d-edit' 
               ? (tool === 'build' ? 'Click grid to place • Click block faces to stack • Drag to rotate' : 'Click blocks to remove • Drag to rotate')
               : 'Edit the grids on the right to shape the block'
             }
          </div>
        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden md:flex w-72 bg-white border-l border-gray-200 flex-col z-10 shadow-xl">

           {/* Stats Bar */}
           <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-around items-center">
              <div className="text-center">
                <div className="text-xs text-indigo-400 font-semibold uppercase">Count</div>
                <div className="text-lg font-bold text-indigo-700 flex items-center gap-1 justify-center">
                   <Layers size={14} /> {stats.count}
                </div>
              </div>
              <div className="w-px h-8 bg-indigo-200"></div>
              <div className="text-center group relative cursor-help">
                <div className="text-xs text-indigo-400 font-semibold uppercase border-b border-indigo-300 border-dashed inline-block">Area</div>
                <div className="text-lg font-bold text-indigo-700 flex items-center gap-1 justify-center">
                   <Scaling size={14} /> {stats.surfaceArea}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                   밑면을 포함한 겉면적
                   <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                </div>
              </div>
           </div>

           {/* 2D Projections */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {mode === '3d-edit' ? 'Real-time Projections' : 'Blueprint Editor'}
              </div>

              <Grid2D
                label="Top View (Above)"
                data={mode === '3d-edit' ? currentProjections.top : blueprint.top}
                editable={mode === '2d-blueprint'}
                onToggle={(r, c) => handleBlueprintToggle('top', r, c)}
                numbers={mode === '3d-edit' && showNumbers ? topViewNumbers : undefined}
                xAxisLabel="X (Right)"
                yAxisLabel="Z (Depth)"
              />

              <Grid2D
                label="Front View"
                data={mode === '3d-edit' ? currentProjections.front : blueprint.front}
                editable={mode === '2d-blueprint'}
                onToggle={(r, c) => handleBlueprintToggle('front', r, c)}
                numbers={mode === '3d-edit' && showNumbers ? frontViewNumbers : undefined}
                xAxisLabel="X (Right)"
                yAxisLabel="Y (Up)"
              />

              <Grid2D
                label={`Side View (${sideViewDirection === 'right' ? 'Right' : 'Left'})`}
                data={displaySideData}
                editable={mode === '2d-blueprint'}
                onToggle={handleSideToggle}
                numbers={mode === '3d-edit' && showNumbers ? displaySideNumbers : undefined}
                xAxisLabel={sideViewDirection === 'right' ? "Z (Depth)" : "Z (Reversed)"}
                yAxisLabel="Y (Up)"
                headerAction={
                  <button
                    onClick={() => setSideViewDirection(prev => prev === 'right' ? 'left' : 'right')}
                    className="p-1 hover:bg-gray-100 rounded text-indigo-600 transition-colors"
                    title="Switch Side View (Right/Left)"
                  >
                    <ArrowLeftRight size={14} />
                  </button>
                }
              />

              {mode === '2d-blueprint' && (
                  <p className="text-xs text-center text-gray-400 mt-2 italic">
                      Toggle cells to define the shape shadow.
                  </p>
              )}
           </div>
        </div>

        {/* Bottom Panel - Mobile Only */}
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg z-10">
          {/* Stats + Controls Row */}
          <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 border-b border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm font-bold text-indigo-700">
                <Layers size={14} /> {stats.count}
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-indigo-700">
                <Scaling size={14} /> {stats.surfaceArea}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {mode === '3d-edit' ? 'Projections' : 'Blueprint'}
              </span>
              <button
                onClick={() => setSideViewDirection(prev => prev === 'right' ? 'left' : 'right')}
                className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition-colors"
                title="Switch Side View"
              >
                <ArrowLeftRight size={14} />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Views */}
          <div className="overflow-x-auto">
            <div className="flex gap-3 p-3 min-w-max">
              <div className="flex-shrink-0">
                <Grid2D
                  label="Top (위)"
                  data={mode === '3d-edit' ? currentProjections.top : blueprint.top}
                  editable={mode === '2d-blueprint'}
                  onToggle={(r, c) => handleBlueprintToggle('top', r, c)}
                  numbers={mode === '3d-edit' && showNumbers ? topViewNumbers : undefined}
                />
              </div>

              <div className="flex-shrink-0">
                <Grid2D
                  label="Front (앞)"
                  data={mode === '3d-edit' ? currentProjections.front : blueprint.front}
                  editable={mode === '2d-blueprint'}
                  onToggle={(r, c) => handleBlueprintToggle('front', r, c)}
                  numbers={mode === '3d-edit' && showNumbers ? frontViewNumbers : undefined}
                />
              </div>

              <div className="flex-shrink-0">
                <Grid2D
                  label={`Side (${sideViewDirection === 'right' ? '오른쪽' : '왼쪽'})`}
                  data={displaySideData}
                  editable={mode === '2d-blueprint'}
                  onToggle={handleSideToggle}
                  numbers={mode === '3d-edit' && showNumbers ? displaySideNumbers : undefined}
                />
              </div>

              {mode === '2d-blueprint' && (
                <div className="flex-shrink-0 flex items-center px-4">
                  <button
                    onClick={generateFromBlueprint}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <RefreshCw size={16} />
                    Generate 3D
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}

        {/* Result Modal (for quiz answer) */}
        <ResultModal
          isOpen={showResultModal}
          isCorrect={userAnswer === quizVoxels.length}
          correctAnswer={quizVoxels.length}
          userAnswer={userAnswer}
          onReveal={handleRevealResult}
          onClose={() => setShowResultModal(false)}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          baseShareUrl={baseShareUrl}
        />
      </main>
    </div>
  );
};

export default App;