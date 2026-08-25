import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type { SignatureInProgress } from '../../../pdf/signatureCreationRect';
import { usePlacerDrag } from '../../../hooks/usePlacerDrag';
import { useDisplayClass } from '../../../layout/useDisplayClass';
import { Icon } from '../../shared/Icon/Icon';
import type { IconName } from '../../shared/Icon/icons';
import styles from './SignaturePlacer.module.css';

export interface SignaturePlacerMethod {
  key: string;
  icon: IconName;
  label: string;
}

interface SignaturePlacerProps {
  signature: SignatureInProgress;
  scale: number;
  totalPages: number;
  getPageElement: (pageNumber: number) => HTMLDivElement | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onChange: (signature: SignatureInProgress) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
  methods: SignaturePlacerMethod[];
}

export function SignaturePlacer({
  signature,
  scale,
  totalPages,
  getPageElement,
  scrollContainerRef,
  onChange,
  onCancel,
  onConfirm,
  isConfirming,
  methods,
}: SignaturePlacerProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const { isMobile } = useDisplayClass();
  const {
    isDragging,
    pageOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePageJump,
  } = usePlacerDrag({
    item: signature,
    scale,
    totalPages,
    getPageElement,
    scrollContainerRef,
    onChange,
  });

  return (
    <div
      className={
        isDragging ? `${styles.placer} ${styles.dragging}` : styles.placer
      }
      data-placer="signature"
      style={{
        left: pageOffset.left + signature.x * scale,
        top: pageOffset.top + signature.y * scale,
        width: signature.width,
        height: signature.height,
        transform: `scale(${scale})`,
        transformOrigin: 'left top',
      }}
    >
      <div className={styles.topDecoration}>
        <span className={styles.pageJumpLabel}>
          {t('signaturePlacer.jumpPageLabel')}
        </span>
        <select
          className={styles.pageJumpSelect}
          value={signature.page}
          onChange={(event) => handlePageJump(Number(event.target.value))}
        >
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <option key={pageNumber} value={pageNumber}>
                {pageNumber}
              </option>
            ),
          )}
        </select>
      </div>
      <div
        className={styles.indicator}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      >
        <div className={styles.methods}>
          {methods.map((method) => (
            <div
              key={method.key}
              className={`${styles.method} ${isMobile ? styles.methodMobile : ''}`}
            >
              <Icon name={method.icon} className={styles.methodIcon} />
              <span className={styles.visuallyHidden}>{method.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.bottomDecoration}>
        <div className={styles.infoMessage}>
          <span className={styles.defaultText}>
            {t('signaturePlacer.explanationLabel')}
          </span>
          <span className={styles.draggingText}>
            {t('signaturePlacer.draggingText')}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isConfirming}
          >
            {t('signaturePlacer.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {t('signaturePlacer.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
