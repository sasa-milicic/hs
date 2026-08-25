import { useRef, useState } from 'react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { getUserPreference, saveUserPreference } from '../util/userPreferences';

const DIALOG_POSITION_PREFERENCE_KEY = 'signature-dialog-position';

export type DialogAnchor = 'center' | 'bottomLeft' | 'bottomRight' | 'custom';

export interface DialogPosition {
  anchor: DialogAnchor;
  top: number;
  left: number;
}

export interface UseDialogPositionResult {
  dialogRef: RefObject<HTMLDivElement | null>;
  dialogStyle: CSSProperties;
  anchorCenter: () => void;
  anchorBottomLeft: () => void;
  anchorBottomRight: () => void;
  handleDragPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleDragPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleDragPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function useDialogPosition(): UseDialogPositionResult {
  const [position, setPositionState] = useState<DialogPosition>(
    () =>
      getUserPreference<DialogPosition>(DIALOG_POSITION_PREFERENCE_KEY) ?? {
        anchor: 'center',
        top: 0,
        left: 0,
      },
  );
  function setPosition(newPosition: DialogPosition) {
    setPositionState(newPosition);
    saveUserPreference(DIALOG_POSITION_PREFERENCE_KEY, newPosition);
  }
  const latestDragPositionRef = useRef<DialogPosition | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    top: number;
    left: number;
  } | null>(null);

  function anchorCenter() {
    setPosition({ anchor: 'center', top: 0, left: 0 });
  }

  function anchorBottomLeft() {
    setPosition({ anchor: 'bottomLeft', top: 0, left: 0 });
  }

  function anchorBottomRight() {
    setPosition({ anchor: 'bottomRight', top: 0, left: 0 });
  }

  function handleDragPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      top: rect.top,
      left: rect.left,
    };
  }

  function handleDragPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    event.preventDefault();
    let top = start.top + (event.clientY - start.clientY);
    let left = start.left + (event.clientX - start.clientX);
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      top = Math.min(
        Math.max(top, 0),
        Math.max(0, window.innerHeight - rect.height),
      );
      left = Math.min(
        Math.max(left, 0),
        Math.max(0, window.innerWidth - rect.width),
      );
    }
    const newPosition: DialogPosition = { anchor: 'custom', top, left };
    latestDragPositionRef.current = newPosition;
    setPositionState(newPosition);
  }

  function handleDragPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragStartRef.current = null;
    if (latestDragPositionRef.current) {
      saveUserPreference(
        DIALOG_POSITION_PREFERENCE_KEY,
        latestDragPositionRef.current,
      );
      latestDragPositionRef.current = null;
    }
  }

  function getDialogStyle(): CSSProperties {
    switch (position.anchor) {
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'bottomLeft':
        return { bottom: 0, left: 0 };
      case 'bottomRight':
        return { bottom: 0, right: 0 };
      case 'custom':
        return { top: position.top, left: position.left };
    }
  }

  return {
    dialogRef,
    dialogStyle: getDialogStyle(),
    anchorCenter,
    anchorBottomLeft,
    anchorBottomRight,
    handleDragPointerDown,
    handleDragPointerMove,
    handleDragPointerUp,
  };
}
