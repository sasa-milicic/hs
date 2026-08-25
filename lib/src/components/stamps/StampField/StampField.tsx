import type { ViewportRect } from '../../../pdf/signatureRect';
import styles from './StampField.module.css';

interface StampFieldProps {
  stampId: string;
  isActive: boolean;
  isSessionLocked: boolean;
  rect: ViewportRect;
  onActivate: () => void;
}

export function StampField({
  stampId,
  isActive,
  isSessionLocked,
  rect,
  onActivate,
}: StampFieldProps) {
  let className = styles.field;
  if (isActive) className = styles.fieldActive;
  if (isSessionLocked) className = `${className} ${styles.disabled}`;

  return (
    <div
      className={className}
      data-field-id={stampId}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      onClick={isSessionLocked ? undefined : onActivate}
    />
  );
}
