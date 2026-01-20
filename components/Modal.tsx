import React, { useEffect, useState } from 'react';
import { X, Link2, QrCode, Clock, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {title && (
              <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Success Modal variant
interface ResultModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  correctAnswer: number;
  userAnswer: number;
  onReveal: () => void;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  isCorrect,
  correctAnswer,
  userAnswer,
  onReveal,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="text-center">
        {isCorrect ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600 mb-2">
              정답입니다!
            </h3>
            <p className="text-gray-600 mb-6">
              맞았습니다! 블록은 <span className="font-bold text-indigo-600">{correctAnswer}개</span>입니다.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-red-600 mb-2">
              틀렸습니다
            </h3>
            <p className="text-gray-600 mb-2">
              입력하신 답: <span className="font-bold">{userAnswer}개</span>
            </p>
            <p className="text-gray-600 mb-6">
              정답은 <span className="font-bold text-indigo-600">{correctAnswer}개</span>입니다.
            </p>
          </>
        )}

        <button
          onClick={onReveal}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          3D 모델 확인하기
        </button>
      </div>
    </Modal>
  );
};

// Share Modal with Tabs (URL / QR) and Timer
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseShareUrl: string; // URL without timer param
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  baseShareUrl
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'qr'>('url');
  const [timer, setTimer] = useState<number>(60);
  const [copied, setCopied] = useState(false);

  // Generate URL with timer
  const shareUrl = timer > 0
    ? `${baseShareUrl}&timer=${timer}`
    : baseShareUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setTimer(value);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="퀴즈 공유하기">
      <div className="space-y-4">
        {/* Timer Setting */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">제한 시간 설정</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={timer}
              onChange={handleTimerChange}
              min="0"
              max="3600"
              className="w-24 px-3 py-2 border border-amber-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            <span className="text-sm text-amber-700">초</span>
            <span className="text-xs text-amber-600 ml-2">
              (0 = 제한 없음)
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link2 size={16} />
            URL 링크
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'qr'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode size={16} />
            QR 코드
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'url' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              아래 링크를 복사하여 친구에게 공유하세요.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 overflow-hidden text-ellipsis"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              QR 코드를 스캔하여 퀴즈에 접속하세요.
            </p>
            <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
              <QRCode
                value={shareUrl}
                size={200}
                level="M"
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              />
            </div>
            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'URL 복사됨!' : 'URL도 복사하기'}
            </button>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-400 text-center space-y-1">
          <p>링크를 열면 2D 투영 뷰만 보이고, 3D 모델은 정답 후에 공개됩니다.</p>
          {timer > 0 && (
            <p className="text-amber-600">
              ⏱️ 제한 시간 {timer}초가 적용됩니다.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
