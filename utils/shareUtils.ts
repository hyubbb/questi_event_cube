import { Voxel } from '../types';

/**
 * Encodes voxel data to a Base64 string for URL sharing
 * Compact format: stores only x, y, z coordinates and optional color
 */
export const encodeVoxels = (voxels: Voxel[]): string => {
  try {
    // Create compact representation
    const compactData = voxels.map(v => ({
      x: v.x,
      y: v.y,
      z: v.z,
      c: v.color || undefined // 'c' for color (optional)
    }));

    const jsonString = JSON.stringify(compactData);
    // Use btoa for Base64 encoding (works in browser)
    const base64 = btoa(encodeURIComponent(jsonString));
    return base64;
  } catch (error) {
    console.error('Failed to encode voxels:', error);
    return '';
  }
};

/**
 * Decodes a Base64 string back to voxel data
 */
export const decodeVoxels = (encoded: string): Voxel[] | null => {
  try {
    const jsonString = decodeURIComponent(atob(encoded));
    const compactData = JSON.parse(jsonString);

    // Validate and reconstruct voxels
    if (!Array.isArray(compactData)) return null;

    return compactData.map((v: { x: number; y: number; z: number; c?: string }) => ({
      x: v.x,
      y: v.y,
      z: v.z,
      id: `${v.x},${v.y},${v.z}`,
      color: v.c
    }));
  } catch (error) {
    console.error('Failed to decode voxels:', error);
    return null;
  }
};

/**
 * Generates a shareable quiz URL with encoded voxel data
 */
export const generateQuizUrl = (voxels: Voxel[]): string => {
  const encoded = encodeVoxels(voxels);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?puzzle=${encoded}`;
};

/**
 * Parses quiz data from current URL
 * Returns the encoded puzzle string if present
 */
export const parseQuizFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('puzzle');
};

/**
 * Parses timer value from current URL
 * Returns the timer in seconds, or 0 if not present
 */
export const parseTimerFromUrl = (): number => {
  const urlParams = new URLSearchParams(window.location.search);
  const timerParam = urlParams.get('timer');
  if (timerParam) {
    const timer = parseInt(timerParam, 10);
    return isNaN(timer) ? 0 : Math.max(0, timer);
  }
  return 0;
};

/**
 * Copies text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Failed to copy to clipboard:', fallbackError);
      return false;
    }
  }
};

/**
 * Clears quiz parameters from URL without page reload
 */
export const clearQuizFromUrl = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('puzzle');
  url.searchParams.delete('timer');
  window.history.replaceState({}, '', url.toString());
};
