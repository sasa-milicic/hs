import type { ISessionCheckmark } from '../types/session';
import type { ViewportRect } from './signatureRect';

const DEFAULT_CHECKMARK_SIZE = 50;

export interface CheckmarkInProgress {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  label: string;
}

export function createCheckmarkInProgress(
  page: number,
  name: string,
  label: string,
): CheckmarkInProgress {
  return {
    id: `checkmark_${Date.now()}`,
    page,
    x: 0,
    y: 0,
    width: DEFAULT_CHECKMARK_SIZE,
    height: DEFAULT_CHECKMARK_SIZE,
    name,
    label,
  };
}

export function toCheckmarkApiY(
  checkmark: Pick<CheckmarkInProgress, 'y' | 'height'>,
): number {
  return checkmark.y + checkmark.height;
}

export function getCheckmarkPlacerRect(
  scale: number,
  checkmark: CheckmarkInProgress,
): ViewportRect {
  return {
    left: checkmark.x * scale,
    top: checkmark.y * scale,
    width: checkmark.width * scale,
    height: checkmark.height * scale,
  };
}

export function getPlacedCheckmarkRects(
  scale: number,
  checkmarks: ISessionCheckmark[],
): Map<string, ViewportRect> {
  const rects = new Map<string, ViewportRect>();

  for (const checkmark of checkmarks) {
    rects.set(checkmark.checkboxId, {
      left: checkmark.x * scale,
      top: (checkmark.y - checkmark.height) * scale,
      width: checkmark.width * scale,
      height: checkmark.height * scale,
    });
  }

  return rects;
}
