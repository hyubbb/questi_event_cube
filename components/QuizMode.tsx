import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Voxel } from '../types';
import { Grid2D } from './Grid2D';
import { project3DTo2D } from '../utils/voxelEngine';
import { ArrowLeftRight, HelpCircle, Send, Clock } from 'lucide-react';

interface QuizModeProps {
  voxels: Voxel[];
  onSubmit: (answer: number) => void;
  timeLimit: number; // in seconds, 0 = no limit
}

export const QuizMode: React.FC<QuizModeProps> = ({ voxels, onSubmit, timeLimit }) => {
  const [answer, setAnswer] = useState<string>('');
  const [sideViewDirection, setSideViewDirection] = useState<'right' | 'left'>('right');
  const [remainingTime, setRemainingTime] = useState<number>(timeLimit);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Calculate 2D projections from voxels
  const projections = useMemo(() => project3DTo2D(voxels), [voxels]);

  // Handle side view flip for left direction
  const displaySideData = sideViewDirection === 'left'
    ? projections.side.map(row => [...row].reverse())
    : projections.side;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = (): string => {
    if (remainingTime <= 10) return 'text-red-600 bg-red-100';
    if (remainingTime <= 30) return 'text-amber-600 bg-amber-100';
    return 'text-indigo-600 bg-indigo-100';
  };

  // Submit handler
  const handleSubmit = useCallback((submittedAnswer: number) => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    onSubmit(submittedAnswer);
  }, [isSubmitted, onSubmit]);

  // Form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAnswer = parseInt(answer, 10);
    if (!isNaN(numAnswer) && numAnswer > 0) {
      handleSubmit(numAnswer);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (timeLimit <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit with 0 when time runs out
          handleSubmit(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimit, isSubmitted, handleSubmit]);

  return (
    <div className="flex flex-col w-full overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={24} />
              <h1 className="text-xl md:text-2xl font-bold">블록 개수 맞추기</h1>
            </div>

            {/* Timer Display */}
            {timeLimit > 0 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-bold ${getTimerColor()}`}>
                <Clock size={16} className={remainingTime <= 10 ? 'animate-pulse' : ''} />
                <span className="text-lg">{formatTime(remainingTime)}</span>
              </div>
            )}
          </div>
          <p className="text-indigo-100 text-sm mt-2">
            아래 3가지 방향에서 본 모습을 보고 블록 개수를 맞춰보세요!
          </p>
        </div>
      </div>

      {/* Timer Warning Banner */}
      {timeLimit > 0 && remainingTime <= 10 && remainingTime > 0 && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-medium animate-pulse">
          ⚠️ 시간이 얼마 남지 않았습니다! {remainingTime}초
        </div>
      )}

      {/* 2D Views Grid */}
      <div className="bg-gradient-to-br from-sky-50 to-indigo-50/50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">

          {/* Top View */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-xs font-semibold">위</span>
              Top View (Above)
            </h3>
            <div className="flex justify-center">
              <Grid2D
                label=""
                data={projections.top}
                editable={false}
                xAxisLabel="X (Right)"
                yAxisLabel="Z (Depth)"
              />
            </div>
          </div>

          {/* Front and Side Views */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front View */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-pink-100 text-pink-600 px-2 py-1 rounded text-xs font-semibold">앞</span>
                Front View
              </h3>
              <div className="flex justify-center">
                <Grid2D
                  label=""
                  data={projections.front}
                  editable={false}
                  xAxisLabel="X (Right)"
                  yAxisLabel="Y (Up)"
                />
              </div>
            </div>

            {/* Side View */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-xs font-semibold">옆</span>
                Side View ({sideViewDirection === 'right' ? 'Right' : 'Left'})
                <button
                  onClick={() => setSideViewDirection(prev => prev === 'right' ? 'left' : 'right')}
                  className="ml-auto p-1 hover:bg-gray-100 rounded text-indigo-600 transition-colors"
                  title="Switch Side View (Right/Left)"
                >
                  <ArrowLeftRight size={14} />
                </button>
              </h3>
              <div className="flex justify-center">
                <Grid2D
                  label=""
                  data={displaySideData}
                  editable={false}
                  xAxisLabel={sideViewDirection === 'right' ? "Z (Depth)" : "Z (Reversed)"}
                  yAxisLabel="Y (Up)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Input */}
      <div className="bg-white border-t border-gray-200 p-4 md:p-6 shadow-lg">
        <form onSubmit={handleFormSubmit} className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            블록은 총 몇 개일까요?
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="숫자 입력"
              min="1"
              disabled={isSubmitted}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg font-medium text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
              autoFocus
            />
            <button
              type="submit"
              disabled={!answer || parseInt(answer, 10) <= 0 || isSubmitted}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send size={18} />
              제출
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
