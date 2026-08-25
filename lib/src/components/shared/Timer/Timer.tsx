import { useEffect, useRef, useState } from 'react';

const MILLISECONDS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;

function formatTime(milliseconds: number): string {
  const minutes = Math.floor(
    milliseconds / (MILLISECONDS_IN_SECOND * SECONDS_IN_MINUTE),
  );
  const seconds =
    Math.floor(milliseconds / MILLISECONDS_IN_SECOND) % SECONDS_IN_MINUTE;
  return `${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
}

interface TimerProps {
  time: number;
  onFinish: () => void;
  className?: string;
}

export function Timer({ time, onFinish, className }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(time);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    setCurrentTime(time);
  }, [time]);

  useEffect(() => {
    if (currentTime <= 0) {
      onFinishRef.current();
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentTime((previous) => previous - MILLISECONDS_IN_SECOND);
    }, MILLISECONDS_IN_SECOND);
    return () => clearTimeout(timeout);
  }, [currentTime]);

  return <span className={className}>{formatTime(currentTime)}</span>;
}
