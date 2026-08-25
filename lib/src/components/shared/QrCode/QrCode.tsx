import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const DEFAULT_SIZE = 125;

interface QrCodeProps {
  value: string;
  width?: number;
  height?: number;
}

export function QrCode({ value, width, height }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    canvas.width = width || DEFAULT_SIZE;
    canvas.height = height || DEFAULT_SIZE;
    QRCode.toCanvas(canvas, value).catch(() => {});
  }, [value, width, height]);

  return <canvas ref={canvasRef} />;
}
