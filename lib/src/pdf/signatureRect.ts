import type { ISessionSignature } from '../types/session';

export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getSignatureRects(
  scale: number,
  signatures: ISessionSignature[],
): Map<string, ViewportRect> {
  const rects = new Map<string, ViewportRect>();

  for (const signature of signatures) {
    rects.set(signature.signatureId, {
      left: signature.x * scale,
      top: (signature.y - signature.height) * scale,
      width: signature.width * scale,
      height: signature.height * scale,
    });
  }

  return rects;
}
