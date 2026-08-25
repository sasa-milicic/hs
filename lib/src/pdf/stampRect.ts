import type { ISessionStamp } from '../types/session';
import type { ViewportRect } from './signatureRect';

const DPI = 72;

export function inchesToPoints(inches: number): number {
  return inches * DPI;
}

export interface StampInProgress {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isMultiPage: boolean;
  templateName: string;
  defaultLabel: string;
  image: string;
  fieldData: { inputName: string; inputValue: string }[];
}

export function toStampPdfY(
  stamp: Pick<StampInProgress, 'y' | 'height'>,
): number {
  return stamp.y + stamp.height;
}

export function getStampPlacerRect(
  scale: number,
  stamp: StampInProgress,
): ViewportRect {
  return {
    left: stamp.x * scale,
    top: stamp.y * scale,
    width: stamp.width * scale,
    height: stamp.height * scale,
  };
}

export function getPlacedStampRects(
  scale: number,
  stamps: ISessionStamp[],
): Map<string, ViewportRect> {
  const rects = new Map<string, ViewportRect>();

  for (const stamp of stamps) {
    rects.set(stamp.stampId, {
      left: stamp.x * scale,
      top: (stamp.y - stamp.height) * scale,
      width: stamp.width * scale,
      height: stamp.height * scale,
    });
  }

  return rects;
}
