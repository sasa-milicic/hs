import { useEffect, useState } from 'react';
import {
  DisplayClass,
  Orientation,
  checkMobile,
  determineDisplayClass,
  determineOrientation,
} from './displayClass';

export interface DisplayClassState {
  displayClass: DisplayClass;
  orientation: Orientation;
  isMobile: boolean;
}

function readDisplayClassState(): DisplayClassState {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent || navigator.vendor || '';
  const displayClass = determineDisplayClass(width, checkMobile(userAgent));
  return {
    displayClass,
    orientation: determineOrientation(width, window.innerHeight),
    isMobile: displayClass === DisplayClass.Mobile,
  };
}

export function useDisplayClass(): DisplayClassState {
  const [state, setState] = useState<DisplayClassState>(readDisplayClassState);

  useEffect(() => {
    let timeoutId: number | undefined;

    function scheduleRead() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setState(readDisplayClassState());
      }, 100);
    }

    window.addEventListener('resize', scheduleRead);
    window.addEventListener('orientationchange', scheduleRead);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', scheduleRead);
      window.removeEventListener('orientationchange', scheduleRead);
    };
  }, []);

  return state;
}
