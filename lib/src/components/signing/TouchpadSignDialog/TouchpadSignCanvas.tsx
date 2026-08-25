import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  CANVAS_MIN_DIRTY_VALID,
  TOUCHPAD_CANVAS_HEIGHT,
  TOUCHPAD_CANVAS_WIDTH,
  getCanvasDirtyPercentage,
  strokesToApiModel,
} from '../../../pdf/touchpadSign';
import type {
  TouchpadStroke,
  TouchpadStrokePoint,
  TouchpadStrokesModel,
} from '../../../pdf/touchpadSign';
import styles from './TouchpadSignCanvas.module.css';

export interface TouchpadSignCanvasState {
  isValid: boolean;
  strokes: TouchpadStrokesModel;
  canvasImage: string | null;
}

export interface TouchpadSignCanvasHandle {
  reset: () => void;
}

interface TouchpadSignCanvasProps {
  label: string;
  onChange: (state: TouchpadSignCanvasState) => void;
}

const STROKE_COLOR = 'black';
const STROKE_WIDTH = 3;

const EMPTY_STATE: TouchpadSignCanvasState = {
  isValid: false,
  strokes: strokesToApiModel([]),
  canvasImage: null,
};

export const TouchpadSignCanvas = forwardRef<
  TouchpadSignCanvasHandle,
  TouchpadSignCanvasProps
>(function TouchpadSignCanvas({ label, onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const strokesRef = useRef<TouchpadStroke[]>([]);
  const currentStrokeRef = useRef<TouchpadStroke | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = TOUCHPAD_CANVAS_WIDTH;
    canvas.height = TOUCHPAD_CANVAS_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.strokeStyle = STROKE_COLOR;
    context.lineJoin = 'round';
    context.lineWidth = STROKE_WIDTH;
    contextRef.current = context;
    onChange(EMPTY_STATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;
    const dirtyPercentage = getCanvasDirtyPercentage(context);
    onChange({
      isValid: dirtyPercentage > CANVAS_MIN_DIRTY_VALID,
      strokes: strokesToApiModel(strokesRef.current),
      canvasImage: strokesRef.current.length
        ? canvas.toDataURL('image/png', 1.0).split(',')[1]
        : null,
    });
  }

  useImperativeHandle(ref, () => ({
    reset() {
      strokesRef.current = [];
      currentStrokeRef.current = null;
      contextRef.current?.clearRect(
        0,
        0,
        TOUCHPAD_CANVAS_WIDTH,
        TOUCHPAD_CANVAS_HEIGHT,
      );
      onChange(EMPTY_STATE);
    },
  }));

  function toCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): {
    point: TouchpadStrokePoint;
    isInside: boolean;
  } {
    const rect = canvasRectRef.current!;
    const isInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    return {
      point: {
        x: ((event.clientX - rect.left) / rect.width) * TOUCHPAD_CANVAS_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * TOUCHPAD_CANVAS_HEIGHT,
        timestamp: Date.now(),
      },
      isInside,
    };
  }

  function drawLine(from: TouchpadStrokePoint, to: TouchpadStrokePoint) {
    const context = contextRef.current;
    if (!context) return;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function drawPoint(point: TouchpadStrokePoint) {
    contextRef.current?.fillRect(point.x, point.y, STROKE_WIDTH, STROKE_WIDTH);
  }

  function endStroke() {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    if (stroke.length === 1) drawPoint(stroke[0]);
    strokesRef.current.push(stroke);
    currentStrokeRef.current = null;
    emitChange();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    canvasRectRef.current = canvas.getBoundingClientRect();
    currentStrokeRef.current = [toCanvasPoint(event).point];
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    event.preventDefault();
    const { point, isInside } = toCanvasPoint(event);
    if (!isInside) {
      endStroke();
      return;
    }
    drawLine(stroke[stroke.length - 1], point);
    stroke.push(point);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    endStroke();
  }

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div className={styles.labelRow}>
        <hr className={styles.underline} />
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
});
