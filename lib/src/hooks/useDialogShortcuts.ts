import { useEffect, useRef } from 'react';

export interface DialogShortcutHandlers {
  onClose: () => void;
  onSubmit: () => void;
  onClear?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
}

type HandlersRef = { current: DialogShortcutHandlers };

const stack: HandlersRef[] = [];

export function topDialogShortcuts(): DialogShortcutHandlers | undefined {
  return stack[stack.length - 1]?.current;
}

export function isAnyDialogRegistered(): boolean {
  return stack.length > 0;
}

export function useDialogShortcuts(handlers: DialogShortcutHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    stack.push(ref);
    return () => {
      const index = stack.lastIndexOf(ref);
      if (index !== -1) stack.splice(index, 1);
    };
  }, []);
}
