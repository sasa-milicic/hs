import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../shared/Icon/Icon';
import { GroupButtonsViewerControls } from './GroupButtonsViewerControls';
import styles from './MobileHeader.module.css';

interface MobileHeaderProps {
  documentName: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomChange: (zoom: number) => void;
  showCloseButton?: boolean;
  finalizeLabel: string;
  areSessionActionsVisible: boolean;
  isSessionLocked: boolean;
  onFinalize: () => void;
  signLabel: string;
  isEverythingSigned: boolean;
  onSignClick: () => void;
  isSignButtonHidden: boolean;
  isRemoteSignatureSession: boolean;
  tempSaveLabel: string;
  onTempSaveClick: () => void;
  onFullWidthClick: () => void;
  onFullHeightClick: () => void;
  isSidebarsHidden: boolean;
  onToggleSidebars: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  isRotationDisabled: boolean;
}

export function MobileHeader({
  documentName,
  currentPage,
  totalPages,
  zoom,
  onPrevPage,
  onNextPage,
  onZoomChange,
  showCloseButton,
  finalizeLabel,
  areSessionActionsVisible,
  isSessionLocked,
  onFinalize,
  signLabel,
  isEverythingSigned,
  onSignClick,
  isSignButtonHidden,
  isRemoteSignatureSession,
  tempSaveLabel,
  onTempSaveClick,
  onFullWidthClick,
  onFullHeightClick,
  isSidebarsHidden,
  onToggleSidebars,
  onRotateLeft,
  onRotateRight,
  isRotationDisabled,
}: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  const showSign =
    (showCloseButton || areSessionActionsVisible) &&
    !isSignButtonHidden &&
    !isSessionLocked;
  const showSave = areSessionActionsVisible && !isSessionLocked;

  return (
    <div className={styles.header} data-field-id="mobile-header">
      <div className={styles.leftSection}>
        <span className={styles.documentName} title={documentName}>
          {documentName}
        </span>
      </div>
      <div className={styles.centerSection}>
        {isRemoteSignatureSession ? (
          showSave && (
            <div className={styles.saveAndExit}>
              <button
                type="button"
                className={styles.saveButton}
                data-field-id="header-temp-save"
                onClick={onTempSaveClick}
              >
                <span>{tempSaveLabel}</span>
                <Icon name="save" />
              </button>
              <button
                type="button"
                className={styles.saveButton}
                data-field-id="header-finalize"
                onClick={onFinalize}
              >
                <span>{finalizeLabel}</span>
                <Icon name="save" />
              </button>
            </div>
          )
        ) : (
          <div className={styles.saveAndExit}>
            {showSign && (
              <button
                type="button"
                className={styles.signButton}
                data-field-id="header-sign"
                onClick={onSignClick}
                disabled={isEverythingSigned}
              >
                <span>{signLabel}</span>
              </button>
            )}
            {showSave && (
              <button
                type="button"
                className={styles.saveButton}
                data-field-id="header-finalize"
                onClick={onFinalize}
              >
                <Icon name="save" />
                <span>{finalizeLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={styles.menuButton}
          data-field-id="header-overflow-menu"
          aria-label="Open viewer menu"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <Icon name="dotsVertical" className={styles.menuIcon} />
        </button>
        {isMenuOpen && (
          <div
            className={styles.menuPanel}
            role="menu"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <GroupButtonsViewerControls
              variant="menu"
              currentPage={currentPage}
              totalPages={totalPages}
              zoom={zoom}
              isSessionLocked={isSessionLocked}
              isRotationDisabled={isRotationDisabled}
              isSidebarsHidden={isSidebarsHidden}
              onPrevPage={onPrevPage}
              onNextPage={onNextPage}
              onZoomChange={onZoomChange}
              onFullWidthClick={onFullWidthClick}
              onFullHeightClick={onFullHeightClick}
              onToggleSidebars={onToggleSidebars}
              onRotateLeft={onRotateLeft}
              onRotateRight={onRotateRight}
            />
          </div>
        )}
      </div>
    </div>
  );
}
