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
import { Box, Layers, Scaling, ArrowLeftRight, Share2, RefreshCw, ArrowLeft, Play } from 'lucide-react';

const App: React.FC = () => {
   // --- State ---
  const [voxels, setVoxels] = useState<Voxel[]>(INITIAL_VOXELS);
  const [mode, setMode] = useState<ViewMode>('3d-edit');
  const [tool, setTool] = useState<'build' | 'erase'>('build');
  const [showXRay, setShowXRay] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>(
    COLORS.voxelDefault
  );

  // Controls the direction of the Side View (Right vs Left)
  const [sideViewDirection, setSideViewDirection] = useState<'right' | 'left'>(
    'right'
  );

  // Blueprint State (for 2D to 3D mode)
  const [blueprint, setBlueprint] = useState<GridState>({
    top: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
    front: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
    side: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false))
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
  const topViewNumbers = useMemo(
    () => generateTopViewNumbers(voxels),
    [voxels]
  );
  const frontViewNumbers = useMemo(
    () => generateFrontViewNumbers(voxels),
    [voxels]
  );
  const sideViewNumbers = useMemo(
    () => generateSideViewNumbers(voxels),
    [voxels]
  );

  // --- Handlers ---

  const handleAddVoxel = (x: number, y: number, z: number) => {
    if (mode === '2d-blueprint') return;
    if (
      x < 0 ||
      x >= GRID_SIZE ||
      z < 0 ||
      z >= GRID_SIZE ||
      y < 0 ||
      y >= MAX_HEIGHT
    )
      return;

    // Check collision
    const exists = voxels.some((v) => v.x === x && v.y === y && v.z === z);
    if (!exists) {
      setVoxels((prev) => [
        ...prev,
        { x, y, z, id: `${x},${y},${z}`, color: selectedColor }
      ]);
    }
  };

  const handleRemoveVoxel = (id: string) => {
    if (mode === '2d-blueprint') return;
    setVoxels((prev) => prev.filter((v) => v.id !== id));
  };

  // Wrapper for 3D stage interaction that checks current tool
  const onStageInteractAdd = (x: number, y: number, z: number) => {
    if (tool === 'build') handleAddVoxel(x, y, z);
  };

  const onStageInteractRemove = (id: string) => {
    if (tool === 'erase') handleRemoveVoxel(id);
  };

  // 2D Grid Handlers
  const handleBlueprintToggle = (
    view: 'top' | 'front' | 'side',
    r: number,
    c: number
  ) => {
    setBlueprint((prev) => {
      const newGrid = prev[view].map((row, rIdx) =>
        row.map((val, cIdx) => (rIdx === r && cIdx === c ? !val : val))
      );
      return { ...prev, [view]: newGrid };
    });
  };

  const generateFromBlueprint = () => {
    const newVoxels = intersect2DTo3D(blueprint);
    // Apply selected color to generated voxels or use default
    const coloredVoxels = newVoxels.map((v) => ({
      ...v,
      color: selectedColor
    }));
    setVoxels(coloredVoxels);
    setMode('3d-edit'); // Switch back to 3D to show result
  };

  const clearAll = () => {
    setVoxels([]);
    setBlueprint({
      top: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
      front: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)),
      side: Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false))
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

  const handleStartQuiz = () => {
    if (voxels.length === 0) {
      alert('블록을 먼저 쌓아주세요!');
      return;
    }
    setQuizVoxels([...voxels]);
    setIsQuizMode(true);
    setQuizState('playing');
    setQuizTimer(0);
    setUserAnswer(0);
  };

  // --- Render Helpers ---

  const getInstructionText = (): string => {
    if (mode === '3d-edit') {
      return tool === 'build'
        ? '클릭하여 도형을 쌓습니다.\n• 드래그하여 회전합니다.'
        : '블록을 클릭하여 제거합니다.\n• 드래그하여 회전합니다.';
    }
    return '오른쪽 그리드를 편집하여 도형을 만듭니다.';
  };

  // Prepare Side View Data (Handle Flipping for Left View)
  const rawSideData =
    mode === '3d-edit' ? currentProjections.side : blueprint.side;

  // If viewing from Left, we horizontally flip the grid (reverse columns)
  // Standard Right View: Z axis 0 -> MAX
  // Left View: Z axis MAX -> 0 (Mirrored)
  const displaySideData =
    sideViewDirection === 'left'
      ? rawSideData.map((row) => [...row].reverse())
      : rawSideData;

  const displaySideNumbers =
    sideViewDirection === 'left' && mode === '3d-edit'
      ? sideViewNumbers.map((row) => [...row].reverse())
      : sideViewNumbers;

  const handleSideToggle = (r: number, c: number) => {
    // If we are in Left View, the clicked column 'c' corresponds to 'GRID_SIZE - 1 - c' in the data
    const actualCol = sideViewDirection === 'left' ? GRID_SIZE - 1 - c : c;
    handleBlueprintToggle('side', r, actualCol);
  };


  return (
   <div className="flex h-screen w-screen flex-col overflow-hidden bg-sky-50">
      {/* Header */}
      <header className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-600 p-2 text-white">
            <Box size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">
            도형 쌓기
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isQuizMode && (
            <button
              type="button"
              onClick={handleExitQuizMode}
              className="flex items-center gap-2 rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
              title="에디터로 돌아가기"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">돌아가기</span>
            </button>
          )}
          {!isQuizMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartQuiz}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                title="바로 퀴즈 시작하기"
              >
                <Play size={16} />
                <span className="hidden sm:inline">시작하기</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                title="퀴즈로 공유하기"
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">퀴즈 공유</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Quiz Mode: Playing */}
        {isQuizMode && quizState === 'playing' && (
          <QuizMode
            voxels={quizVoxels}
            onSubmit={handleQuizSubmit}
            timeLimit={quizTimer}
          />
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
            <div className="pointer-events-none absolute left-4 top-4 z-20 md:pointer-events-auto md:static md:z-auto md:p-4">
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
            <div className="relative flex-1 bg-gradient-to-br from-sky-50 to-indigo-50/50">
              <div className="absolute inset-0">
                <CubeStage
                  voxels={
                    mode === '3d-edit' ? voxels : intersect2DTo3D(blueprint)
                  }
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
              <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 select-none rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm backdrop-blur">
                {getInstructionText()}
              </div>
            </div>

            {/* Right Sidebar - Desktop Only */}
            <div className="z-10 hidden w-72 flex-col border-l border-gray-200 bg-white shadow-xl md:flex">
              {/* Stats Bar */}
              <div className="flex items-center justify-around border-b border-indigo-100 bg-indigo-50 p-4">
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase text-indigo-400">
                    개수
                  </div>
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-indigo-700">
                    <Layers size={14} /> {stats.count}
                  </div>
                </div>
                <div className="h-8 w-px bg-indigo-200" />
                <div className="group relative cursor-help text-center">
                  <div className="inline-block border-b border-dashed border-indigo-300 text-xs font-semibold uppercase text-indigo-400">
                    겉면적
                  </div>
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-indigo-700">
                    <Scaling size={14} /> {stats.surfaceArea}
                  </div>

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-700 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    밑면을 포함한 겉면적
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                  </div>
                </div>
              </div>

              {/* 2D Projections */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {mode === '3d-edit' ? '실시간 투영' : '블루프린트 편집기'}
                </div>

                <Grid2D
                  label="Top View (Above)"
                  data={
                    mode === '3d-edit' ? currentProjections.top : blueprint.top
                  }
                  editable={mode === '2d-blueprint'}
                  onToggle={(r, c) => handleBlueprintToggle('top', r, c)}
                  numbers={
                    mode === '3d-edit' && showNumbers
                      ? topViewNumbers
                      : undefined
                  }
                  xAxisLabel="X (Right)"
                  yAxisLabel="Z (Depth)"
                />

                <Grid2D
                  label="Front View"
                  data={
                    mode === '3d-edit'
                      ? currentProjections.front
                      : blueprint.front
                  }
                  editable={mode === '2d-blueprint'}
                  onToggle={(r, c) => handleBlueprintToggle('front', r, c)}
                  numbers={
                    mode === '3d-edit' && showNumbers
                      ? frontViewNumbers
                      : undefined
                  }
                  xAxisLabel="X (Right)"
                  yAxisLabel="Y (Up)"
                />

                <Grid2D
                  label={`Side View (${sideViewDirection === 'right' ? 'Right' : 'Left'})`}
                  data={displaySideData}
                  editable={mode === '2d-blueprint'}
                  onToggle={handleSideToggle}
                  numbers={
                    mode === '3d-edit' && showNumbers
                      ? displaySideNumbers
                      : undefined
                  }
                  xAxisLabel={
                    sideViewDirection === 'right' ? 'Z (Depth)' : 'Z (Reversed)'
                  }
                  yAxisLabel="Y (Up)"
                  headerAction={
                    <button
                      type="button"
                      onClick={() =>
                        setSideViewDirection((prev) =>
                          prev === 'right' ? 'left' : 'right'
                        )
                      }
                      className="rounded p-1 text-indigo-600 transition-colors hover:bg-gray-100"
                      title="Switch Side View (Right/Left)"
                    >
                      <ArrowLeftRight size={14} />
                    </button>
                  }
                />

                {mode === '2d-blueprint' && (
                  <p className="mt-2 text-center text-xs italic text-gray-400">
                    셀을 토글하여 도형의 그림자를 정의합니다.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Panel - Mobile Only */}
            <div className="z-10 border-t border-gray-200 bg-white shadow-lg md:hidden">
              {/* Stats + Controls Row */}
              <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-4 py-2">
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
                    {mode === '3d-edit' ? '투영' : '설계도'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSideViewDirection((prev) =>
                        prev === 'right' ? 'left' : 'right'
                      )
                    }
                    className="rounded p-1 text-indigo-600 transition-colors hover:bg-indigo-100"
                    title="Switch Side View"
                  >
                    <ArrowLeftRight size={14} />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrolling Views */}
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-3 p-3">
                  <div className="shrink-0">
                    <Grid2D
                      label="Top (위)"
                      data={
                        mode === '3d-edit'
                          ? currentProjections.top
                          : blueprint.top
                      }
                      editable={mode === '2d-blueprint'}
                      onToggle={(r, c) => handleBlueprintToggle('top', r, c)}
                      numbers={
                        mode === '3d-edit' && showNumbers
                          ? topViewNumbers
                          : undefined
                      }
                    />
                  </div>

                  <div className="shrink-0">
                    <Grid2D
                      label="Front (앞)"
                      data={
                        mode === '3d-edit'
                          ? currentProjections.front
                          : blueprint.front
                      }
                      editable={mode === '2d-blueprint'}
                      onToggle={(r, c) => handleBlueprintToggle('front', r, c)}
                      numbers={
                        mode === '3d-edit' && showNumbers
                          ? frontViewNumbers
                          : undefined
                      }
                    />
                  </div>

                  <div className="shrink-0">
                    <Grid2D
                      label={`Side (${sideViewDirection === 'right' ? '오른쪽' : '왼쪽'})`}
                      data={displaySideData}
                      editable={mode === '2d-blueprint'}
                      onToggle={handleSideToggle}
                      numbers={
                        mode === '3d-edit' && showNumbers
                          ? displaySideNumbers
                          : undefined
                      }
                    />
                  </div>

                  {mode === '2d-blueprint' && (
                    <div className="flex shrink-0 items-center px-4">
                      <button
                        type="button"
                        onClick={generateFromBlueprint}
                        className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
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
