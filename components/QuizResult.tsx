import React, { useMemo } from 'react';
import { Voxel } from '../types';
import { CubeStage } from './CubeStage';
import { Grid2D } from './Grid2D';
import { project3DTo2D, generateTopViewNumbers, generateFrontViewNumbers, generateSideViewNumbers } from '../utils/voxelEngine';
import { ArrowLeftRight, Box, RotateCcw, Share2, Layers, CheckCircle, XCircle, Hash } from 'lucide-react';
import { COLORS } from '../constants';

interface QuizResultProps {
  voxels: Voxel[];
  correctAnswer: number;
  userAnswer: number;
  isCorrect: boolean;
  onNewQuiz: () => void;
  onShare: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  voxels,
  correctAnswer,
  userAnswer,
  isCorrect,
  onNewQuiz,
  onShare
}) => {
  const [sideViewDirection, setSideViewDirection] = React.useState<'right' | 'left'>('right');
  const [showNumbers, setShowNumbers] = React.useState(true);

  // Calculate projections and numbers
  const projections = useMemo(() => project3DTo2D(voxels), [voxels]);
  const topViewNumbers = useMemo(() => generateTopViewNumbers(voxels), [voxels]);
  const frontViewNumbers = useMemo(() => generateFrontViewNumbers(voxels), [voxels]);
  const sideViewNumbers = useMemo(() => generateSideViewNumbers(voxels), [voxels]);

  // Handle side view flip
  const displaySideData = sideViewDirection === 'left'
    ? projections.side.map(row => [...row].reverse())
    : projections.side;
  const displaySideNumbers = sideViewDirection === 'left'
    ? sideViewNumbers.map(row => [...row].reverse())
    : sideViewNumbers;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Result Header */}
      <div className={`${isCorrect ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white px-4 py-3`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <CheckCircle size={32} className="text-emerald-100" />
            ) : (
              <XCircle size={32} className="text-orange-100" />
            )}
            <div>
              <h1 className="text-xl font-bold">
                {isCorrect ? '정답입니다!' : '아쉽네요!'}
              </h1>
              <p className="text-white/80 text-sm">
                {isCorrect
                  ? '멋지게 맞추셨네요!'
                  : `입력하신 답: ${userAnswer}개`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-white/70">정답</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Layers size={20} />
                {correctAnswer}개
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onNewQuiz}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">새 퀴즈</span>
              </button>
              <button
                onClick={onShare}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                title="이 퀴즈 공유하기"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3D View */}
      <div className="flex-1 relative bg-gradient-to-br from-sky-50 to-indigo-50/50">
        <CubeStage
          voxels={voxels}
          mode="3d-edit"
          onAddVoxel={() => {}}
          onRemoveVoxel={() => {}}
          showXRay={false}
          selectedColor={COLORS.voxelDefault}
        />

        {/* Info Overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm">
          <div className="text-xs text-gray-500">블록 수</div>
          <div className="text-xl font-bold text-indigo-600 flex items-center gap-1">
            <Box size={18} /> {correctAnswer}개
          </div>
        </div>

        {/* Rotation Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full text-sm text-gray-600 shadow-sm pointer-events-none select-none">
          드래그하여 회전 • 스크롤하여 확대/축소
        </div>
      </div>

      {/* Bottom Panel - Horizontal Scrolling 2D Views */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        {/* Controls Row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-700">투영 뷰</div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showNumbers}
                onChange={(e) => setShowNumbers(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Hash size={14} />
              숫자 표시
            </label>
            <button
              onClick={() => setSideViewDirection(prev => prev === 'right' ? 'left' : 'right')}
              className="flex items-center gap-1 px-2 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Switch Side View (Right/Left)"
            >
              <ArrowLeftRight size={14} />
              Side: {sideViewDirection === 'right' ? 'Right' : 'Left'}
            </button>
          </div>
        </div>

        {/* Horizontal Scrolling Views */}
        <div className="overflow-x-auto">
          <div className="flex gap-4 p-4 min-w-max">
            {/* Top View */}
            <div className="flex-shrink-0">
              <Grid2D
                label="Top View (위)"
                data={projections.top}
                editable={false}
                numbers={showNumbers ? topViewNumbers : undefined}
                xAxisLabel="X (Right)"
                yAxisLabel="Z (Depth)"
              />
            </div>

            {/* Front View */}
            <div className="flex-shrink-0">
              <Grid2D
                label="Front View (앞)"
                data={projections.front}
                editable={false}
                numbers={showNumbers ? frontViewNumbers : undefined}
                xAxisLabel="X (Right)"
                yAxisLabel="Y (Up)"
              />
            </div>

            {/* Side View */}
            <div className="flex-shrink-0">
              <Grid2D
                label={`Side View (${sideViewDirection === 'right' ? '오른쪽' : '왼쪽'})`}
                data={displaySideData}
                editable={false}
                numbers={showNumbers ? displaySideNumbers : undefined}
                xAxisLabel={sideViewDirection === 'right' ? "Z (Depth)" : "Z (Reversed)"}
                yAxisLabel="Y (Up)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
