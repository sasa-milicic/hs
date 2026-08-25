export const TOUCHPAD_CANVAS_WIDTH = 898;
export const TOUCHPAD_CANVAS_HEIGHT = 225;
export const CANVAS_MIN_DIRTY_VALID = 0.002;

export interface TouchpadStrokePoint {
  x: number;
  y: number;
  timestamp: number;
}

export type TouchpadStroke = TouchpadStrokePoint[];

export interface TouchpadStrokesModel {
  x: number[];
  y: number[];
  t: number[];
  off: number[];
}

export function strokesToApiModel(
  strokes: TouchpadStroke[],
): TouchpadStrokesModel {
  const model: TouchpadStrokesModel = { x: [], y: [], t: [], off: [] };
  let prevPointTimestamp: number | undefined;

  for (const stroke of strokes) {
    model.off.push(model.t.length + 1);

    for (const point of stroke) {
      model.x.push(point.x);
      model.y.push(point.y);
      model.t.push(
        prevPointTimestamp === undefined
          ? 0
          : point.timestamp - prevPointTimestamp,
      );
      prevPointTimestamp = point.timestamp;
    }
  }

  return model;
}

export function getCanvasDirtyPercentage(
  context: CanvasRenderingContext2D,
): number {
  const totalPixels = TOUCHPAD_CANVAS_WIDTH * TOUCHPAD_CANVAS_HEIGHT;
  const data = context.getImageData(
    0,
    0,
    TOUCHPAD_CANVAS_WIDTH,
    TOUCHPAD_CANVAS_HEIGHT,
  ).data;
  let dirtyPixels = 0;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) dirtyPixels += 1;
  }

  return dirtyPixels / totalPixels;
}
