import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type { CheckmarkInProgress } from '../../../pdf/checkmarkRect';
import { usePlacerDrag, clamp } from '../../../hooks/usePlacerDrag';
import styles from './CheckmarkPlacer.module.css';

const MIN_CHECKMARK_SIZE = 1;

interface CheckmarkPlacerProps {
  checkmark: CheckmarkInProgress;
  scale: number;
  totalPages: number;
  getPageElement: (pageNumber: number) => HTMLDivElement | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onChange: (checkmark: CheckmarkInProgress) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CheckmarkPlacer({
  checkmark,
  scale,
  totalPages,
  getPageElement,
  scrollContainerRef,
  onChange,
  onCancel,
  onConfirm,
}: CheckmarkPlacerProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const {
    isDragging,
    pageOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePageJump,
  } = usePlacerDrag({
    item: checkmark,
    scale,
    totalPages,
    getPageElement,
    scrollContainerRef,
    onChange,
  });
  const resizeStartRef = useRef<{
    clientX: number;
    clientY: number;
    width: number;
    height: number;
  } | null>(null);

  function handleResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    resizeStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: checkmark.width,
      height: checkmark.height,
    };
  }

  function handleResizePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = resizeStartRef.current;
    if (!start) return;
    event.preventDefault();
    event.stopPropagation();
    let width = Math.max(
      MIN_CHECKMARK_SIZE,
      start.width + (event.clientX - start.clientX) / scale,
    );
    let height = Math.max(
      MIN_CHECKMARK_SIZE,
      start.height + (event.clientY - start.clientY) / scale,
    );
    const pageElement = getPageElement(checkmark.page);
    if (pageElement) {
      const rect = pageElement.getBoundingClientRect();
      width = clamp(
        width,
        MIN_CHECKMARK_SIZE,
        Math.max(MIN_CHECKMARK_SIZE, rect.width / scale - checkmark.x),
      );
      height = clamp(
        height,
        MIN_CHECKMARK_SIZE,
        Math.max(MIN_CHECKMARK_SIZE, rect.height / scale - checkmark.y),
      );
    }
    onChange({ ...checkmark, width, height });
  }

  function handleResizePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    resizeStartRef.current = null;
  }

  return (
    <div
      className={
        isDragging ? `${styles.placer} ${styles.dragging}` : styles.placer
      }
      data-placer="checkmark"
      style={{
        left: pageOffset.left + checkmark.x * scale,
        top: pageOffset.top + checkmark.y * scale,
        width: checkmark.width * scale,
        height: checkmark.height * scale,
      }}
    >
      <div className={styles.topDecoration}>
        <label className={styles.pageJumpLabel}>
          {t('checkmarkPlacer.jumpPageLabel')}
          <select
            className={styles.pageJumpSelect}
            value={checkmark.page}
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
      <div
        className={styles.dragHandle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      >
        <div className={styles.checkbox} aria-hidden="true" />
      </div>
      {checkmark.name && (
        <div className={styles.nameLabel}>{checkmark.name}</div>
      )}
      <div
        className={styles.resizeHandle}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onLostPointerCapture={handleResizePointerUp}
      />
      <div className={styles.bottomDecoration}>
        <span className={styles.infoMessage}>
          {isDragging
            ? t('checkmarkPlacer.draggingText')
            : t('checkmarkPlacer.explanationLabel')}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {t('checkmarkPlacer.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            {t('checkmarkPlacer.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
