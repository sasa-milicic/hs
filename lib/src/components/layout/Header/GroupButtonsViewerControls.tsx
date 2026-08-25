import { useMemo } from 'react';
import { Icon } from '../../shared/Icon/Icon';
import { getDisplayZoomLevels, zoomIndexOf } from '../../../pdf/zoomLevels';
import styles from './GroupButtonsViewerControls.module.css';

interface GroupButtonsViewerControlsProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  isSessionLocked: boolean;
  isRotationDisabled: boolean;
  isSidebarsHidden: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomChange: (zoom: number) => void;
  onFullWidthClick: () => void;
  onFullHeightClick: () => void;
  onToggleSidebars: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  className?: string;
  variant?: 'toolbar' | 'menu';
}

export function GroupButtonsViewerControls({
  currentPage,
  totalPages,
  zoom,
  isSessionLocked,
  isRotationDisabled,
  isSidebarsHidden,
  onPrevPage,
  onNextPage,
  onZoomChange,
  onFullWidthClick,
  onFullHeightClick,
  onToggleSidebars,
  onRotateLeft,
  onRotateRight,
  className,
  variant = 'toolbar',
}: GroupButtonsViewerControlsProps) {
  const displayZoomLevels = useMemo(() => getDisplayZoomLevels(zoom), [zoom]);
  const zoomIndex = zoomIndexOf(displayZoomLevels, zoom);
  const canZoomIn =
    zoomIndex !== -1 && zoomIndex < displayZoomLevels.length - 1;
  const canZoomOut = zoomIndex > 0;

  const pagesGroup = (
    <span className={styles.group}>
      <span className={styles.pagesInfo}>
        {currentPage}/{totalPages}
      </span>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-next-page"
        disabled={currentPage >= totalPages}
        onClick={onNextPage}
        aria-label="Next page"
      >
        <Icon name="arrowDown" />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-prev-page"
        disabled={currentPage <= 1}
        onClick={onPrevPage}
        aria-label="Previous page"
      >
        <Icon name="arrowUp" />
      </button>
    </span>
  );

  const zoomButtons = (
    <>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-zoom-in"
        disabled={!canZoomIn}
        onClick={() =>
          canZoomIn && onZoomChange(displayZoomLevels[zoomIndex + 1].value)
        }
        aria-label="Zoom in"
      >
        <Icon name="plus" />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-zoom-out"
        disabled={!canZoomOut}
        onClick={() =>
          canZoomOut && onZoomChange(displayZoomLevels[zoomIndex - 1].value)
        }
        aria-label="Zoom out"
      >
        <Icon name="minus" />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-fit-width"
        onClick={onFullWidthClick}
        aria-label="Fit width"
      >
        <Icon name="fullWidth" />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-fit-height"
        onClick={onFullHeightClick}
        aria-label="Fit height"
      >
        <Icon name="fullHeight" />
      </button>
    </>
  );

  const zoomSelect = (
    <select
      className={styles.zoomSelect}
      data-field-id="header-zoom-select"
      value={zoom}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => onZoomChange(Number(event.target.value))}
      aria-label="Zoom level"
    >
      {displayZoomLevels.map((level) => (
        <option key={level.value} value={level.value}>
          {level.percentage}
        </option>
      ))}
    </select>
  );

  const sidebarButtons = (
    <>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-toggle-sidebars"
        onClick={onToggleSidebars}
        aria-label="Toggle sidebars"
      >
        <Icon name={isSidebarsHidden ? 'sidebarVisible' : 'sidebarUnvisible'} />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-rotate-left"
        onClick={onRotateLeft}
        disabled={isSessionLocked || isRotationDisabled}
        aria-label="Rotate left"
      >
        <Icon name="rotateLeft" />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        data-field-id="header-rotate-right"
        onClick={onRotateRight}
        disabled={isSessionLocked || isRotationDisabled}
        aria-label="Rotate right"
      >
        <Icon name="rotateRight" />
      </button>
    </>
  );

  if (variant === 'menu') {
    return (
      <div
        className={`${styles.controlsMenu}${className ? ` ${className}` : ''}`}
        data-field-id="header-viewer-controls"
      >
        {pagesGroup}
        <span className={styles.menuTools}>
          {sidebarButtons}
          {zoomSelect}
          {zoomButtons}
        </span>
      </div>
    );
  }

  return (
    <div
      className={
        className ? `${styles.controls} ${className}` : styles.controls
      }
      data-field-id="header-viewer-controls"
    >
      {pagesGroup}
      <span className={styles.group}>{zoomButtons}</span>
      <span className={styles.group}>{zoomSelect}</span>
      <span className={styles.group}>{sidebarButtons}</span>
    </div>
  );
}
