export interface ZoomLevel {
  value: number;
  percentage: string;
}

export const ZOOM_LEVELS: ZoomLevel[] = [
  { value: 0.1, percentage: '10%' },
  { value: 0.25, percentage: '25%' },
  { value: 0.5, percentage: '50%' },
  { value: 0.75, percentage: '75%' },
  { value: 1, percentage: '100%' },
  { value: 1.25, percentage: '125%' },
  { value: 1.5, percentage: '150%' },
  { value: 2, percentage: '200%' },
];

export const DEFAULT_ZOOM = 1;

export function getDisplayZoomLevels(zoom: number): ZoomLevel[] {
  if (ZOOM_LEVELS.some((level) => level.value === zoom)) return ZOOM_LEVELS;

  const customLevel: ZoomLevel = {
    value: zoom,
    percentage: `${Math.floor(zoom * 10000) / 100}%`,
  };
  const insertAt = ZOOM_LEVELS.findIndex((level) => level.value > zoom);
  const levels = [...ZOOM_LEVELS];
  levels.splice(insertAt === -1 ? levels.length : insertAt, 0, customLevel);
  return levels;
}

export function zoomIndexOf(levels: ZoomLevel[], zoom: number): number {
  return levels.findIndex(
    (level) =>
      level.value === zoom || (Number.isNaN(level.value) && Number.isNaN(zoom)),
  );
}
