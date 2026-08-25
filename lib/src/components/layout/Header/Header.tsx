import { GroupButtonsSession } from './GroupButtonsSession';
import { GroupButtonsViewerControls } from './GroupButtonsViewerControls';
import styles from './Header.module.css';

interface HeaderProps {
  documentName: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomChange: (zoom: number) => void;
  showCloseButton?: boolean;
  cancelLabel: string;
  finalizeLabel: string;
  areSessionActionsVisible: boolean;
  isSessionLocked: boolean;
  onCancel: () => void;
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
  showThumbnailsSidebar: boolean;
  showSignaturesSidebar: boolean;
}

export function Header({
  documentName,
  currentPage,
  totalPages,
  zoom,
  onPrevPage,
  onNextPage,
  onZoomChange,
  showCloseButton,
  cancelLabel,
  finalizeLabel,
  areSessionActionsVisible,
  isSessionLocked,
  onCancel,
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
  showThumbnailsSidebar,
  showSignaturesSidebar,
}: HeaderProps) {
  const showSessionActions =
    (showCloseButton || areSessionActionsVisible) && !isSessionLocked;
  const showThumbs = !isSidebarsHidden && showThumbnailsSidebar;
  const showSigs = !isSidebarsHidden && showSignaturesSidebar;
  const toolbarRowClass = [
    styles.toolbarRow,
    showThumbs ? styles.hasThumbnails : '',
    showSigs ? styles.hasSignatures : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.header} data-field-id="header">
      <div className={styles.actionsRow}>
        {showSessionActions && (
          <GroupButtonsSession
            cancelLabel={cancelLabel}
            finalizeLabel={finalizeLabel}
            signLabel={signLabel}
            tempSaveLabel={tempSaveLabel}
            isEverythingSigned={isEverythingSigned}
            isSignButtonHidden={isSignButtonHidden}
            isRemoteSignatureSession={isRemoteSignatureSession}
            onCancel={onCancel}
            onFinalize={onFinalize}
            onSignClick={onSignClick}
            onTempSaveClick={onTempSaveClick}
          />
        )}
      </div>
      {}
      <div className={toolbarRowClass}>
        <span className={styles.documentName} title={documentName}>
          {documentName}
        </span>
        {showThumbs && <div className={styles.thumbnailsSpacer} />}
        <div className={styles.headerMain}>
          <div className={styles.centerSection}>
            <GroupButtonsViewerControls
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
        </div>
        {showSigs && <div className={styles.sidebarSpacer} />}
      </div>
    </div>
  );
}
