import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type { StampInProgress } from '../../../pdf/stampRect';
import { usePlacerDrag } from '../../../hooks/usePlacerDrag';
import styles from './StampPlacer.module.css';

interface StampPlacerProps {
  stamp: StampInProgress;
  scale: number;
  totalPages: number;
  getPageElement: (pageNumber: number) => HTMLDivElement | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onChange: (stamp: StampInProgress) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export function StampPlacer({
  stamp,
  scale,
  totalPages,
  getPageElement,
  scrollContainerRef,
  onChange,
  onCancel,
  onConfirm,
  isConfirming,
}: StampPlacerProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const {
    isDragging,
    pageOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePageJump,
  } = usePlacerDrag({
    item: stamp,
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
      data-placer="stamp"
      style={{
        left: pageOffset.left + stamp.x * scale,
        top: pageOffset.top + stamp.y * scale,
        width: stamp.width * scale,
        height: stamp.height * scale,
      }}
    >
      <div className={styles.topDecoration}>
        <label className={styles.pageJumpLabel}>
          {t('stampPlacer.jumpPageLabel')}
          <select
            className={styles.pageJumpSelect}
            value={stamp.page}
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
        </label>
      </div>
      <img
        src={`data:image/png;base64,${stamp.image}`}
        alt="Stamp"
        className={styles.image}
        draggable={false}
      />
      <div
        className={styles.dragHandle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      />
      <div className={styles.bottomDecoration}>
        <span className={styles.infoMessage}>
          {isDragging
            ? t('stampPlacer.draggingText')
            : t('stampPlacer.explanationLabel')}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isConfirming}
          >
            {t('stampPlacer.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {t('stampPlacer.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
