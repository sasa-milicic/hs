import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HybridSignProps } from '../types/hybridSign';
import { I18N_OPTIONS } from '../i18n/i18n';
import { Header } from '../components/layout/Header/Header';
import { MobileHeader } from '../components/layout/Header/MobileHeader';
import { Thumbnails } from '../components/layout/Thumbnails/Thumbnails';
import { Icon } from '../components/shared/Icon/Icon';
import { PdfPages } from '../components/PdfPages/PdfPages';
import type { PdfPagesHandle } from '../components/PdfPages/PdfPages';
import { SignaturesSidebar } from '../components/layout/SignaturesSidebar/SignaturesSidebar';
import { AddNewStampDialog } from '../components/stamps/AddNewStampDialog/AddNewStampDialog';
import { AddNewCheckmarkDialog } from '../components/checkmarks/AddNewCheckmarkDialog/AddNewCheckmarkDialog';
import { RemoteSignatureDialog } from '../components/signing/RemoteSignatureDialog/RemoteSignatureDialog';
import { AddNewSignatureDialog } from '../components/signatures/AddNewSignatureDialog/AddNewSignatureDialog';
import { ConfirmDialog } from '../components/shared/ConfirmDialog/ConfirmDialog';
import { ShortcutsDialog } from '../components/shared/ShortcutsDialog/ShortcutsDialog';
import { NotificationsContainer } from '../components/shared/NotificationsContainer/NotificationsContainer';
import type { ISessionSignature } from '../types/session';
import type { StampInProgress } from '../pdf/stampRect';
import type { CheckmarkInProgress } from '../pdf/checkmarkRect';
import type { SignatureInProgress } from '../pdf/signatureCreationRect';
import { subscribeApiError } from '../http/apiErrorBus';
import { setApiEndpoint } from '../http/apiConfig';
import { useTenantBehavior } from '../tenants/useTenantBehavior';
import styles from './HybridSign.module.css';
import { useNotifications } from './hooks/useNotifications';
import { useSessionData } from './hooks/useSessionData';
import { useStampCreation } from './hooks/useStampCreation';
import { useCheckmarkCreation } from './hooks/useCheckmarkCreation';
import { useSignatureCreation } from './hooks/useSignatureCreation';
import { useSessionActions } from './hooks/useSessionActions';
import { useViewerControls } from './hooks/useViewerControls';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { Orientation, isLaptopOrDesktop } from '../layout/displayClass';
import { useDisplayClass } from '../layout/useDisplayClass';

const KNOWN_TENANT_THEMES: Record<string, string> = {
  '1': styles.tenant1,
  '2': styles.tenant2,
  '3': styles.tenant3,
  '4': styles.tenant4,
  '5': styles.tenant5,
  '6': styles.tenant6,
  '7': styles.tenant7,
  '8': styles.tenant8,
  '9': styles.tenant9,
  '10': styles.tenant10,
};

export function HybridSign({
  tenantId = '1',
  language = 'en',
  transactionId,
  apiEndpoint,
  secretKey,
  signee,
  showCloseButton,
  sessionMetadataOverride,
  onSessionEnd,
}: HybridSignProps) {
  if (apiEndpoint) setApiEndpoint(apiEndpoint);
  console.log('HybridSign props:', {
    tenantId,
    language,
    transactionId,
    secretKey,
    signee,
    showCloseButton,
    sessionMetadataOverride,
  });

  const { t } = useTranslation('translation', I18N_OPTIONS);
  const { notifications, showNotification, dismissNotification } =
    useNotifications();
  const { isSignButtonHidden, skipsCancelConfirmation, isIGV } =
    useTenantBehavior(tenantId);

  useEffect(() => {
    return subscribeApiError((code) =>
      showNotification(`errors.${code}`, 'error'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pdfPagesRef = useRef<PdfPagesHandle>(null);
  const {
    status,
    doc,
    documentName,
    roles,
    setRoles,
    enabledSignatureMethods,
    stampTemplates,
    apiToken,
    isDocumentFinalizable,
    isRemoteSignaturePhoneMandatory,
    isSlaveSession,
    isRemoteSignatureForSlaveAllowed,
    isInvitationAllowed,
    signatureFlowEnabled,
    standAloneUI,
    isLite,
    remoteSignatureValidityUntil,
    isAllowRemoteSignatureToReceiverVisible,
    allowRemoteSignatureToReceiverDefault,
    areRemoteSignatureIdFieldsVisible,
    areRemoteSignatureIdFieldsEditable,
    remoteSignatureIdTypes,
    isMinisignEmailChannelEnabled,
    isMinisignSmsChannelEnabled,
    isPosDeviceBound,
    setIsPosDeviceBound,
    posUsername,
    posSignerName,
    sessionEmail,
    sessionPhone,
    preserveRemoteSign,
    isSessionLocked,
    setIsSessionLocked,
    consentMessage,
    handleAcceptConsent,
    handleDeclineConsent,
    stamps,
    areAdditionalStampsAllowed,
    checkmarks,
    setCheckmarks,
    areAdditionalCheckboxesAllowed,
    isBulkSignatureEnabled,
    areAdditionalSignaturesAllowed,
    disableRoles,
    emailOrderingEnabled,
    refetchDocument,
    invalidateArchivedDocuments,
    getArchivedRoles,
    activeTransactionId,
    activeSecretKey,
    batchSessions,
    switchToDocument,
  } = useSessionData({
    transactionId,
    tenantId,
    language,
    signee,
    secretKey,
    sessionMetadataOverride,
    pdfPagesRef,
    onFreshDocumentLoaded: () => {
      setActiveStampId(null);
      setStampCreation(null);
      setIsAddStampDialogOpen(false);
      setActiveCheckmarkId(null);
      setCheckmarkCreation(null);
      setIsAddCheckmarkDialogOpen(false);
      setIsAddSignatureDialogOpen(false);
      setSignatureCreation(null);
      setCurrentPage(1);
    },
    onAdvanceToStartupSignature: activateSignature,
    showNotification,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(
    null,
  );
  const [activeStampId, setActiveStampId] = useState<string | null>(null);
  const [isAddStampDialogOpen, setIsAddStampDialogOpen] = useState(false);
  const [stampCreation, setStampCreation] = useState<StampInProgress | null>(
    null,
  );
  const [isConfirmingStampCreation, setIsConfirmingStampCreation] =
    useState(false);
  const [activeCheckmarkId, setActiveCheckmarkId] = useState<string | null>(
    null,
  );
  const [isAddCheckmarkDialogOpen, setIsAddCheckmarkDialogOpen] =
    useState(false);
  const [checkmarkCreation, setCheckmarkCreation] =
    useState<CheckmarkInProgress | null>(null);
  const [isSignatureFlowDialogOpen, setIsSignatureFlowDialogOpen] =
    useState(false);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAddSignatureDialogOpen, setIsAddSignatureDialogOpen] =
    useState(false);
  const [signatureCreation, setSignatureCreation] =
    useState<SignatureInProgress | null>(null);
  const { displayClass, orientation, isMobile } = useDisplayClass();
  const [isSignaturesSideBarOpen, setIsSignaturesSideBarOpen] = useState(false);
  const [isMobileAccordionOpen, setIsMobileAccordionOpen] = useState(false);

  function scrollToPage(pageNumber: number) {
    pdfPagesRef.current?.scrollToPage(pageNumber);
  }

  const { activateStamp, cancelStampCreation, confirmStampCreation } =
    useStampCreation({
      transactionId: activeTransactionId,
      apiToken,
      refetchDocument,
      scrollToPage,
      activeStampId,
      setActiveStampId,
      stampCreation,
      setStampCreation,
      isAddStampDialogOpen,
      setIsAddStampDialogOpen,
      isConfirmingStampCreation,
      setIsConfirmingStampCreation,
    });

  function activateSignature(signature: ISessionSignature) {
    setActiveSignatureId(signature.signatureId);
    scrollToPage(signature.page);
  }

  async function handleSigned(bulkTransactionIds?: string[]) {
    if (bulkTransactionIds) invalidateArchivedDocuments(bulkTransactionIds);
    await refetchDocument();
  }

  const {
    activateCheckmark,
    cancelCheckmarkCreation,
    confirmCheckmarkCreation,
    saveCheckmark,
    deleteCheckmark,
  } = useCheckmarkCreation({
    transactionId: activeTransactionId,
    apiToken,
    refetchDocument,
    scrollToPage,
    checkmarks,
    setCheckmarks,
    checkmarkCreation,
    setCheckmarkCreation,
    setActiveCheckmarkId,
  });

  const {
    cancelSignatureCreation,
    confirmSignatureCreation,
    deleteSignatureCreation,
  } = useSignatureCreation({
    doc,
    setRoles,
    signatureCreation,
    setSignatureCreation,
  });

  const allSignatures = roles.flatMap((role) => role.signatures);
  const isRotationDisabled = allSignatures.length > 0 || stamps.length > 0;
  const canInviteNewUser =
    isInvitationAllowed &&
    (!isSlaveSession || isRemoteSignatureForSlaveAllowed);
  const allBatchSignatures = useMemo(() => {
    const combined = [...allSignatures];
    for (const session of batchSessions) {
      if (session.transactionId === activeTransactionId) continue;
      const siblingRoles =
        getArchivedRoles(session.transactionId) ??
        session.signatureRolesDTO.roles;
      combined.push(...siblingRoles.flatMap((role) => role.signatures));
    }
    return combined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSignatures, batchSessions, activeTransactionId, getArchivedRoles]);
  const hasSignatures = allBatchSignatures.length > 0;
  const signaturesHaveEmail = allBatchSignatures.some(
    (signature) => !!signature.email,
  );
  const hasPendingEmailedSigner = allBatchSignatures.some(
    (signature) => !signature.transacted && !!signature.email,
  );
  const canStartWorkflow =
    signatureFlowEnabled &&
    hasSignatures &&
    signaturesHaveEmail &&
    hasPendingEmailedSigner &&
    !signee;
  const {
    confirmDialogKind,
    setConfirmDialogKind,
    canFinalize,
    areSessionActionsVisible,
    isEverythingSigned,
    isRemoteSignatureSession,
    handleCancelClick,
    handleFinalizeClick,
    handleTempSaveClick,
    confirmCancel,
    confirmSave,
    handleRemoteSignatureSent,
    confirmStartWorkflow,
  } = useSessionActions({
    transactionId: activeTransactionId,
    tenantId,
    language,
    secretKey: activeSecretKey,
    apiToken,
    setIsSessionLocked,
    isDocumentFinalizable,
    isSlaveSession,
    standAloneUI,
    isLite,
    skipsCancelConfirmation,
    isIGV,
    remoteSignatureValidityUntil,
    allSignatures,
    stamps,
    checkmarks,
    roles,
    batchSessions,
    getArchivedRoles,
    onSessionEnd,
  });

  const {
    zoom,
    setZoom,
    isSidebarsHidden,
    handleFullWidthClick,
    handleFullHeightClick,
    handleToggleSidebars,
    handleRotateClick,
  } = useViewerControls({
    transactionId: activeTransactionId,
    pdfPagesRef,
    currentPage,
    scrollToPage,
    apiToken,
    isSessionLocked,
    setIsSessionLocked,
    refetchDocument,
  });

  useGlobalKeyboardShortcuts({
    doc,
    zoom,
    setZoom,
    currentPage,
    allSignatures,
    activeSignatureId,
    activateSignature,
    scrollToPage,
    pdfPagesRef,
    showCloseButton,
    areSessionActionsVisible,
    isSessionLocked,
    handleFinalizeClick,
    handleCancelClick,
    handleToggleSidebars,
    handleFullHeightClick,
  });

  const tenantThemeClass = KNOWN_TENANT_THEMES[tenantId] ?? '';
  const showThumbnailsSidebar =
    !isSidebarsHidden && isLaptopOrDesktop(displayClass);
  const showDesktopSignaturesSidebar = !isMobile && !isSidebarsHidden;
  const showMobileLandscapeOpener =
    isMobile && orientation === Orientation.Landscape;
  const showMobilePortraitAccordion =
    isMobile &&
    orientation === Orientation.Portrait &&
    (areAdditionalSignaturesAllowed || areAdditionalStampsAllowed);

  useEffect(() => {
    if (stampCreation || checkmarkCreation || signatureCreation) {
      setIsMobileAccordionOpen(false);
    }
  }, [stampCreation, checkmarkCreation, signatureCreation]);

  function renderSignaturesSidebar(variant?: 'overlay' | 'accordion') {
    return (
      <SignaturesSidebar
        roles={roles}
        activeSignatureId={activeSignatureId}
        onSignatureClick={activateSignature}
        stamps={stamps}
        activeStampId={activeStampId}
        onStampClick={activateStamp}
        areAdditionalStampsAllowed={areAdditionalStampsAllowed}
        isSessionLocked={isSessionLocked}
        isStampCreateDisabled={stampCreation !== null}
        onAddStampClick={() => setIsAddStampDialogOpen(true)}
        checkmarks={checkmarks}
        activeCheckmarkId={activeCheckmarkId}
        onCheckmarkClick={activateCheckmark}
        areAdditionalCheckboxesAllowed={areAdditionalCheckboxesAllowed}
        isCheckmarkCreateDisabled={checkmarkCreation !== null}
        onAddCheckmarkClick={() => setIsAddCheckmarkDialogOpen(true)}
        onShortcutsClick={() => setIsShortcutsDialogOpen(true)}
        showShortcutsButton={isLaptopOrDesktop(displayClass)}
        canInviteNewUser={canInviteNewUser}
        onInviteClick={() => setIsInviteDialogOpen(true)}
        canStartWorkflow={canStartWorkflow}
        onStartWorkflowClick={confirmStartWorkflow}
        areAdditionalSignaturesAllowed={areAdditionalSignaturesAllowed}
        isSignatureCreateDisabled={signatureCreation !== null}
        onAddSignatureClick={() => setIsAddSignatureDialogOpen(true)}
        batchSessions={batchSessions}
        activeTransactionId={activeTransactionId}
        onDocumentClick={switchToDocument}
        variant={variant}
      />
    );
  }

  return (
    <div className={`${styles.hybridSign} ${tenantThemeClass}`}>
      {status === 'loading' && !doc && (
        <div className={styles.message}>{t('loading')}</div>
      )}
      {status === 'error' && !doc && (
        <div className={`${styles.message} ${styles.messageError}`}>
          {t('error')}
        </div>
      )}
      {doc && (
        <>
          <NotificationsContainer
            notifications={notifications}
            onDismiss={dismissNotification}
          />
          {isMobile ? (
            <MobileHeader
              documentName={documentName}
              currentPage={currentPage}
              totalPages={doc.numPages}
              zoom={zoom}
              onPrevPage={() => scrollToPage(currentPage - 1)}
              onNextPage={() => scrollToPage(currentPage + 1)}
              onZoomChange={setZoom}
              showCloseButton={showCloseButton}
              finalizeLabel={
                isRemoteSignatureSession
                  ? t('header.saveAndReturn')
                  : canFinalize
                    ? t('header.save')
                    : t('header.temporarySave')
              }
              areSessionActionsVisible={areSessionActionsVisible}
              isSessionLocked={isSessionLocked}
              onFinalize={handleFinalizeClick}
              signLabel={t('header.Sign')}
              isEverythingSigned={isEverythingSigned}
              onSignClick={() => setIsSignatureFlowDialogOpen(true)}
              isSignButtonHidden={isSignButtonHidden}
              isRemoteSignatureSession={isRemoteSignatureSession}
              tempSaveLabel={t('header.temporarySave')}
              onTempSaveClick={handleTempSaveClick}
              onFullWidthClick={handleFullWidthClick}
              onFullHeightClick={handleFullHeightClick}
              isSidebarsHidden={isSidebarsHidden}
              onToggleSidebars={handleToggleSidebars}
              onRotateLeft={() => handleRotateClick(-90)}
              onRotateRight={() => handleRotateClick(90)}
              isRotationDisabled={isRotationDisabled}
            />
          ) : (
            <Header
              documentName={documentName}
              currentPage={currentPage}
              totalPages={doc.numPages}
              zoom={zoom}
              onPrevPage={() => scrollToPage(currentPage - 1)}
              onNextPage={() => scrollToPage(currentPage + 1)}
              onZoomChange={setZoom}
              showCloseButton={showCloseButton}
              cancelLabel={
                showCloseButton ? t('header.close') : t('header.exit')
              }
              finalizeLabel={
                isRemoteSignatureSession
                  ? t('header.saveAndReturn')
                  : canFinalize
                    ? t('header.save')
                    : t('header.temporarySave')
              }
              areSessionActionsVisible={areSessionActionsVisible}
              isSessionLocked={isSessionLocked}
              onCancel={handleCancelClick}
              onFinalize={handleFinalizeClick}
              signLabel={t('header.Sign')}
              isEverythingSigned={isEverythingSigned}
              onSignClick={() => setIsSignatureFlowDialogOpen(true)}
              isSignButtonHidden={isSignButtonHidden}
              isRemoteSignatureSession={isRemoteSignatureSession}
              tempSaveLabel={t('header.temporarySave')}
              onTempSaveClick={handleTempSaveClick}
              onFullWidthClick={handleFullWidthClick}
              onFullHeightClick={handleFullHeightClick}
              isSidebarsHidden={isSidebarsHidden}
              onToggleSidebars={handleToggleSidebars}
              onRotateLeft={() => handleRotateClick(-90)}
              onRotateRight={() => handleRotateClick(90)}
              isRotationDisabled={isRotationDisabled}
              showThumbnailsSidebar={showThumbnailsSidebar}
              showSignaturesSidebar={showDesktopSignaturesSidebar}
            />
          )}
          <div className={styles.body}>
            {showThumbnailsSidebar && (
              <Thumbnails
                doc={doc}
                currentPage={currentPage}
                onPageClick={scrollToPage}
              />
            )}
            <div className={styles.pdfPane}>
              {status === 'loading' && (
                <div className={styles.pdfMessage}>{t('loading')}</div>
              )}
              {status === 'error' && (
                <div className={`${styles.pdfMessage} ${styles.messageError}`}>
                  {t('error')}
                </div>
              )}
              <PdfPages
                ref={pdfPagesRef}
                doc={doc}
                zoom={zoom}
                roles={status === 'loading' ? [] : roles}
                enabledSignatureMethods={enabledSignatureMethods}
                isSlaveSession={isSlaveSession}
                isRemoteSignatureForSlaveAllowed={
                  isRemoteSignatureForSlaveAllowed
                }
                stampTemplates={stampTemplates}
                isRemoteSignaturePhoneMandatory={
                  isRemoteSignaturePhoneMandatory
                }
                isAllowRemoteSignatureToReceiverVisible={
                  isAllowRemoteSignatureToReceiverVisible
                }
                allowRemoteSignatureToReceiverDefault={
                  allowRemoteSignatureToReceiverDefault
                }
                areRemoteSignatureIdFieldsVisible={
                  areRemoteSignatureIdFieldsVisible
                }
                areRemoteSignatureIdFieldsEditable={
                  areRemoteSignatureIdFieldsEditable
                }
                remoteSignatureIdTypes={remoteSignatureIdTypes}
                isMinisignEmailChannelEnabled={isMinisignEmailChannelEnabled}
                isMinisignSmsChannelEnabled={isMinisignSmsChannelEnabled}
                isPosDeviceBound={isPosDeviceBound}
                posUsername={posUsername}
                sessionEmail={sessionEmail}
                sessionPhone={sessionPhone}
                preserveRemoteSign={preserveRemoteSign}
                onPosDeviceBoundChange={setIsPosDeviceBound}
                transactionId={activeTransactionId}
                apiToken={apiToken}
                secretKey={activeSecretKey}
                activeSignatureId={activeSignatureId}
                isSessionLocked={isSessionLocked}
                onActivateSignature={activateSignature}
                onDeleteSignature={deleteSignatureCreation}
                onCurrentPageChange={setCurrentPage}
                onSigned={handleSigned}
                onSignedSuccessfully={() =>
                  showNotification('information.successfullySigned', 'success')
                }
                onRemoteSignatureSent={handleRemoteSignatureSent}
                stamps={stamps}
                activeStampId={activeStampId}
                onActivateStamp={activateStamp}
                stampCreation={stampCreation}
                onStampCreationChange={setStampCreation}
                onCancelStampCreation={cancelStampCreation}
                onConfirmStampCreation={confirmStampCreation}
                isConfirmingStampCreation={isConfirmingStampCreation}
                checkmarks={checkmarks}
                activeCheckmarkId={activeCheckmarkId}
                onActivateCheckmark={activateCheckmark}
                checkmarkCreation={checkmarkCreation}
                onCheckmarkCreationChange={setCheckmarkCreation}
                onCancelCheckmarkCreation={cancelCheckmarkCreation}
                onConfirmCheckmarkCreation={confirmCheckmarkCreation}
                onSaveCheckmark={saveCheckmark}
                onDeleteCheckmark={deleteCheckmark}
                signatureCreation={signatureCreation}
                onSignatureCreationChange={setSignatureCreation}
                onCancelSignatureCreation={cancelSignatureCreation}
                onConfirmSignatureCreation={confirmSignatureCreation}
                isSignatureFlowDialogOpen={isSignatureFlowDialogOpen}
                onCloseSignatureFlowDialog={() =>
                  setIsSignatureFlowDialogOpen(false)
                }
                isBulkSignatureEnabled={isBulkSignatureEnabled}
                batchSessions={batchSessions}
                getArchivedRoles={getArchivedRoles}
              />
            </div>
            {showDesktopSignaturesSidebar && renderSignaturesSidebar()}
            {showMobileLandscapeOpener &&
              isSignaturesSideBarOpen &&
              renderSignaturesSidebar('overlay')}
            {showMobileLandscapeOpener && (
              <div
                className={
                  isSignaturesSideBarOpen
                    ? styles.sidebarOpenerOpen
                    : styles.sidebarOpener
                }
                data-field-id="sidebar-opener"
              >
                <button
                  type="button"
                  className={styles.sidebarOpenerButton}
                  data-field-id="sidebar-opener-toggle"
                  aria-label="Toggle signatures sidebar"
                  aria-expanded={isSignaturesSideBarOpen}
                  onClick={() => setIsSignaturesSideBarOpen((open) => !open)}
                >
                  <Icon
                    name="chevronLeft"
                    className={styles.sidebarOpenerIcon}
                  />
                </button>
              </div>
            )}
            {showMobilePortraitAccordion && (
              <div
                className={styles.accordion}
                data-field-id="mobile-signatures-accordion"
              >
                <button
                  type="button"
                  className={styles.accordionHeader}
                  aria-expanded={isMobileAccordionOpen}
                  onClick={() => setIsMobileAccordionOpen((open) => !open)}
                >
                  <span>{t('signaturesSidebar.signaturesTitle')}</span>
                  <Icon
                    name="arrowDown"
                    className={
                      isMobileAccordionOpen
                        ? styles.accordionChevronOpen
                        : styles.accordionChevron
                    }
                  />
                </button>
                {isMobileAccordionOpen && renderSignaturesSidebar('accordion')}
              </div>
            )}
          </div>
          {isAddStampDialogOpen && apiToken && (
            <AddNewStampDialog
              stampTemplates={stampTemplates}
              transactionId={activeTransactionId}
              apiToken={apiToken}
              currentPage={currentPage}
              onClose={() => setIsAddStampDialogOpen(false)}
              onCreated={setStampCreation}
            />
          )}
          {isAddCheckmarkDialogOpen && (
            <AddNewCheckmarkDialog
              currentPage={currentPage}
              onClose={() => setIsAddCheckmarkDialogOpen(false)}
              onCreated={setCheckmarkCreation}
            />
          )}
          {isInviteDialogOpen && apiToken && (
            <RemoteSignatureDialog
              transactionId={activeTransactionId}
              apiToken={apiToken}
              sessionEmail={sessionEmail}
              sessionPhone={sessionPhone}
              preserveRemoteSign={preserveRemoteSign}
              secretKey={activeSecretKey}
              roles={roles}
              isPhoneRequired={isRemoteSignaturePhoneMandatory}
              isAllowRemoteSignatureToReceiverVisible={
                isAllowRemoteSignatureToReceiverVisible
              }
              allowRemoteSignatureToReceiverDefault={
                allowRemoteSignatureToReceiverDefault
              }
              areIdentificationsVisible={areRemoteSignatureIdFieldsVisible}
              areIdentificationsEditable={areRemoteSignatureIdFieldsEditable}
              identificationIdTypes={remoteSignatureIdTypes}
              onClose={() => setIsInviteDialogOpen(false)}
              onSent={handleRemoteSignatureSent}
            />
          )}
          {isAddSignatureDialogOpen && (
            <AddNewSignatureDialog
              roles={roles}
              disableRoles={disableRoles}
              posSignerName={posSignerName}
              signatureFlowEnabled={signatureFlowEnabled}
              emailOrderingEnabled={emailOrderingEnabled}
              enabledSignatureMethods={enabledSignatureMethods}
              isSlaveSession={isSlaveSession}
              isRemoteSignatureForSlaveAllowed={
                isRemoteSignatureForSlaveAllowed
              }
              currentPage={currentPage}
              onClose={() => setIsAddSignatureDialogOpen(false)}
              onCreated={setSignatureCreation}
            />
          )}
          {confirmDialogKind === 'cancel' && (
            <ConfirmDialog
              title={t('sessionCancelConfirmationDialog.title')}
              messageLines={[
                t('sessionCancelConfirmationDialog.messageLine1'),
                t('sessionCancelConfirmationDialog.messageLine2'),
              ]}
              cancelLabel={t('sessionCancelConfirmationDialog.cancelButton')}
              confirmLabel={t('sessionCancelConfirmationDialog.confirmButton')}
              onCancel={() => setConfirmDialogKind(null)}
              onConfirm={confirmCancel}
            />
          )}
          {confirmDialogKind === 'save' && (
            <ConfirmDialog
              title={t('sessionSaveConfirmationDialog.title')}
              messageLines={[
                t('sessionSaveConfirmationDialog.messageLine1'),
                t('sessionSaveConfirmationDialog.messageLine2'),
              ]}
              cancelLabel={t('sessionSaveConfirmationDialog.cancelButton')}
              confirmLabel={t('sessionSaveConfirmationDialog.saveButton')}
              onCancel={() => setConfirmDialogKind(null)}
              onConfirm={() => confirmSave(false)}
            />
          )}
          {confirmDialogKind === 'saveFinalizable' && (
            <ConfirmDialog
              title={t('sessionSaveConfirmationDialog.finalizable.title')}
              messageLines={[
                t('sessionSaveConfirmationDialog.finalizable.messageLine1'),
                t('sessionSaveConfirmationDialog.finalizable.messageLine2'),
              ]}
              cancelLabel={t(
                'sessionSaveConfirmationDialog.finalizable.cancelButton',
              )}
              confirmLabel={t(
                'sessionSaveConfirmationDialog.finalizable.saveButton',
              )}
              tertiaryLabel={t(
                'sessionSaveConfirmationDialog.finalizable.saveTempButton',
              )}
              onCancel={() => setConfirmDialogKind(null)}
              onConfirm={() => confirmSave(false)}
              onTertiary={() => confirmSave(true)}
            />
          )}
          {confirmDialogKind === 'saveTempNonFinalizable' && (
            <ConfirmDialog
              title={t('sessionSaveConfirmationDialog.title')}
              messageLines={[
                t('sessionSaveConfirmationDialog.messageLine1'),
                t('sessionSaveConfirmationDialog.messageLine2'),
              ]}
              cancelLabel={t('sessionSaveConfirmationDialog.cancelButton')}
              confirmLabel={t('sessionSaveConfirmationDialog.saveButton')}
              onCancel={() => setConfirmDialogKind(null)}
              onConfirm={() => confirmSave(true)}
            />
          )}
          {confirmDialogKind === 'saveTempOnly' && (
            <ConfirmDialog
              title={t(
                'sessionSaveConfirmationDialog.finalizable.tempOnly.title',
              )}
              messageLines={[
                t(
                  'sessionSaveConfirmationDialog.finalizable.tempOnly.messageLine1',
                ),
                t(
                  'sessionSaveConfirmationDialog.finalizable.tempOnly.messageLine2',
                ),
              ]}
              cancelLabel={t(
                'sessionSaveConfirmationDialog.finalizable.tempOnly.cancelButton',
              )}
              confirmLabel={t(
                'sessionSaveConfirmationDialog.finalizable.tempOnly.saveButton',
              )}
              onCancel={() => setConfirmDialogKind(null)}
              onConfirm={() => confirmSave(true)}
            />
          )}
          {(confirmDialogKind === 'igvSaveFinalize' ||
            confirmDialogKind === 'igvSaveTemp') && (
            <ConfirmDialog
              title={t('igvSaveDialog.title')}
              messageLines={[
                t('igvSaveDialog.content'),
                t('igvSaveDialog.content2'),
                t('igvSaveDialog.question'),
              ]}
              cancelLabel={t('igvSaveDialog.cancel')}
              confirmLabel={t('igvSaveDialog.save')}
              onCancel={() => setConfirmDialogKind(null)}
              onConfirm={() => confirmSave(confirmDialogKind === 'igvSaveTemp')}
            />
          )}
          {consentMessage && (
            <ConfirmDialog
              title={t('consentDialog.title')}
              messageLines={[consentMessage]}
              cancelLabel={t('consentDialog.decline')}
              confirmLabel={t('consentDialog.accept')}
              onCancel={handleDeclineConsent}
              onConfirm={handleAcceptConsent}
            />
          )}
        </>
      )}
      {isShortcutsDialogOpen && (
        <ShortcutsDialog onClose={() => setIsShortcutsDialogOpen(false)} />
      )}
    </div>
  );
}
