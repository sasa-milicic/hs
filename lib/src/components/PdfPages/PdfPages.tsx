import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from '../../pdf/renderPage';
import type { RenderSignal } from '../../pdf/renderPage';
import { getSignatureRects } from '../../pdf/signatureRect';
import { getPlacedStampRects } from '../../pdf/stampRect';
import type { StampInProgress } from '../../pdf/stampRect';
import { getPlacedCheckmarkRects } from '../../pdf/checkmarkRect';
import type { CheckmarkInProgress } from '../../pdf/checkmarkRect';
import type { SignatureInProgress } from '../../pdf/signatureCreationRect';
import { useCurrentPage } from './hooks/useCurrentPage';
import { SignatureField } from '../signatures/SignatureField/SignatureField';
import type { SignatureFieldMethod } from '../signatures/SignatureField/SignatureField';
import { StampField } from '../stamps/StampField/StampField';
import { StampPlacer } from '../stamps/StampPlacer/StampPlacer';
import { CheckmarkField } from '../checkmarks/CheckmarkField/CheckmarkField';
import { CheckmarkPlacer } from '../checkmarks/CheckmarkPlacer/CheckmarkPlacer';
import { SignaturePlacer } from '../signatures/SignaturePlacer/SignaturePlacer';
import { TouchpadSignDialog } from '../signing/TouchpadSignDialog/TouchpadSignDialog';
import { StampSignDialog } from '../signing/StampSignDialog/StampSignDialog';
import { RemoteSignatureDialog } from '../signing/RemoteSignatureDialog/RemoteSignatureDialog';
import { MinisignDialog } from '../signing/MinisignDialog/MinisignDialog';
import { QualifiedSignatureDialog } from '../signing/QualifiedSignatureDialog/QualifiedSignatureDialog';
import { PosSignatureDialog } from '../signing/PosSignatureDialog/PosSignatureDialog';
import { NewSignatureFlowDialog } from './NewSignatureFlowDialog';
import { useSignatureFlow } from './hooks/useSignatureFlow';
import { useMethodDescriptors } from './hooks/useMethodDescriptors';
import { isSignatureMethodAvailable } from '../../signatures/signatureMethods';
import { SignatureMethod } from '../../types/session';
import type {
  BatchSession,
  ISessionRole,
  ISessionSignature,
  ISessionStamp,
  ISessionCheckmark,
} from '../../types/session';
import type { StampTemplate } from '../../api/getDocument.types';
import type { IconName } from '../shared/Icon/icons';
import styles from './PdfPages.module.css';

export interface PdfPagesHandle {
  scrollToPage: (pageNumber: number) => void;
  openFirstUnsignedForStartup: () => string | null;
  openDialogForSignature: (
    signatureId: string,
    method: SignatureMethod,
  ) => boolean;
  fitToWidth: (pageNumber: number) => Promise<number | null>;
  fitToHeight: (pageNumber: number) => Promise<number | null>;
}

function measureClassicScrollbarThickness(): number {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;width:100px;height:100px;overflow:scroll;top:-9999px';
  document.body.appendChild(probe);
  const thickness = probe.offsetWidth - probe.clientWidth;
  document.body.removeChild(probe);
  return thickness;
}

function contentBoxSize(container: HTMLElement): {
  width: number;
  height: number;
} {
  const style = getComputedStyle(container);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return {
    width: container.clientWidth - padX,
    height: container.clientHeight - padY,
  };
}

function availableFitWidth(
  container: HTMLElement,
  pageWidth: number,
  pageHeight: number,
): number {
  const { width, height } = contentBoxSize(container);
  let available = width;
  const wouldOverflowY = pageHeight * (available / pageWidth) > height;
  const yScrollbarAlreadyTaken =
    container.offsetWidth - container.clientWidth > 0;
  if (wouldOverflowY && !yScrollbarAlreadyTaken) {
    available -= measureClassicScrollbarThickness();
  }
  return Math.max(Math.floor(available), 0);
}

function availableFitHeight(
  container: HTMLElement,
  pageWidth: number,
  pageHeight: number,
): number {
  const { width, height } = contentBoxSize(container);
  let available = height;
  const wouldOverflowX = pageWidth * (available / pageHeight) > width;
  const xScrollbarAlreadyTaken =
    container.offsetHeight - container.clientHeight > 0;
  if (wouldOverflowX && !xScrollbarAlreadyTaken) {
    available -= measureClassicScrollbarThickness();
  }
  return Math.max(available, 0);
}

const STARTUP_METHOD_ORDER = [
  SignatureMethod.MiniSign,
  SignatureMethod.TouchpadSignature,
  SignatureMethod.QualifiedSignature,
  SignatureMethod.RemoteSignature,
  SignatureMethod.PosSignature,
];

interface PdfPagesProps {
  doc: PDFDocumentProxy;
  zoom: number;
  roles: ISessionRole[];
  enabledSignatureMethods: SignatureMethod[];
  isSlaveSession: boolean;
  isRemoteSignatureForSlaveAllowed: boolean;
  stampTemplates: StampTemplate[];
  isRemoteSignaturePhoneMandatory: boolean;
  isAllowRemoteSignatureToReceiverVisible: boolean;
  allowRemoteSignatureToReceiverDefault: boolean;
  areRemoteSignatureIdFieldsVisible: boolean;
  areRemoteSignatureIdFieldsEditable: boolean;
  remoteSignatureIdTypes: string[];
  isMinisignEmailChannelEnabled: boolean;
  isMinisignSmsChannelEnabled: boolean;
  isPosDeviceBound: boolean;
  posUsername: string;
  sessionEmail: string;
  sessionPhone: string;
  preserveRemoteSign: boolean;
  secretKey?: string;
  onPosDeviceBoundChange: (isBound: boolean) => void;
  transactionId: string;
  apiToken: string | null;
  activeSignatureId: string | null;
  isSessionLocked: boolean;
  onActivateSignature: (signature: ISessionSignature) => void;
  onDeleteSignature: (signature: ISessionSignature) => void;
  onCurrentPageChange: (pageNumber: number) => void;
  onSigned: (bulkTransactionIds?: string[]) => void | Promise<void>;
  onSignedSuccessfully: () => void;
  onRemoteSignatureSent: (deliveryChannel: string) => void;
  stamps: ISessionStamp[];
  activeStampId: string | null;
  onActivateStamp: (stamp: ISessionStamp) => void;
  stampCreation: StampInProgress | null;
  onStampCreationChange: (stamp: StampInProgress) => void;
  onCancelStampCreation: () => void;
  onConfirmStampCreation: () => void;
  isConfirmingStampCreation: boolean;
  checkmarks: ISessionCheckmark[];
  activeCheckmarkId: string | null;
  onActivateCheckmark: (checkmark: ISessionCheckmark) => void;
  checkmarkCreation: CheckmarkInProgress | null;
  onCheckmarkCreationChange: (checkmark: CheckmarkInProgress) => void;
  onCancelCheckmarkCreation: () => void;
  onConfirmCheckmarkCreation: () => void;
  onSaveCheckmark: (
    checkmark: ISessionCheckmark,
    checked: boolean,
  ) => void | Promise<void>;
  onDeleteCheckmark: (checkmark: ISessionCheckmark) => void;
  signatureCreation: SignatureInProgress | null;
  onSignatureCreationChange: (signature: SignatureInProgress) => void;
  onCancelSignatureCreation: () => void;
  onConfirmSignatureCreation: () => void;
  isSignatureFlowDialogOpen: boolean;
  onCloseSignatureFlowDialog: () => void;
  isBulkSignatureEnabled: boolean;
  batchSessions: BatchSession[];
  getArchivedRoles: (transactionId: string) => ISessionRole[] | undefined;
}

export interface PageSignature {
  signature: ISessionSignature;
  roleId: string;
  roleLabel: string;
  transactionId?: string;
}

export interface MethodDescriptor {
  key: string;
  method: SignatureMethod;
  label: string;
  icon: IconName;
  open: (pageSignature: PageSignature) => void;
  disabled?: boolean;
}

export const PdfPages = forwardRef<PdfPagesHandle, PdfPagesProps>(
  function PdfPages(
    {
      doc,
      zoom,
      roles,
      enabledSignatureMethods,
      isSlaveSession,
      isRemoteSignatureForSlaveAllowed,
      stampTemplates,
      isRemoteSignaturePhoneMandatory,
      isAllowRemoteSignatureToReceiverVisible,
      allowRemoteSignatureToReceiverDefault,
      areRemoteSignatureIdFieldsVisible,
      areRemoteSignatureIdFieldsEditable,
      remoteSignatureIdTypes,
      isMinisignEmailChannelEnabled,
      isMinisignSmsChannelEnabled,
      isPosDeviceBound,
      posUsername,
      sessionEmail,
      sessionPhone,
      preserveRemoteSign,
      secretKey,
      onPosDeviceBoundChange,
      transactionId,
      apiToken,
      activeSignatureId,
      isSessionLocked,
      onActivateSignature,
      onDeleteSignature,
      onCurrentPageChange,
      onSigned,
      onSignedSuccessfully,
      onRemoteSignatureSent,
      stamps,
      activeStampId,
      onActivateStamp,
      stampCreation,
      onStampCreationChange,
      onCancelStampCreation,
      onConfirmStampCreation,
      isConfirmingStampCreation,
      checkmarks,
      activeCheckmarkId,
      onActivateCheckmark,
      checkmarkCreation,
      onCheckmarkCreationChange,
      onCancelCheckmarkCreation,
      onConfirmCheckmarkCreation,
      onSaveCheckmark,
      onDeleteCheckmark,
      signatureCreation,
      onSignatureCreationChange,
      onCancelSignatureCreation,
      onConfirmSignatureCreation,
      isSignatureFlowDialogOpen,
      onCloseSignatureFlowDialog,
      isBulkSignatureEnabled,
      batchSessions,
      getArchivedRoles,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageWrapperElementsRef = useRef(new Map<number, HTMLDivElement>());
    const canvasHostElementsRef = useRef(new Map<number, HTMLDivElement>());
    const [openTouchpadSignature, setOpenTouchpadSignature] =
      useState<PageSignature | null>(null);
    const [openStampSignature, setOpenStampSignature] =
      useState<PageSignature | null>(null);
    const [openRemoteSignature, setOpenRemoteSignature] =
      useState<PageSignature | null>(null);
    const [openMinisignSignature, setOpenMinisignSignature] =
      useState<PageSignature | null>(null);
    const [openQualifiedSignature, setOpenQualifiedSignature] =
      useState<PageSignature | null>(null);
    const [openPosSignature, setOpenPosSignature] =
      useState<PageSignature | null>(null);
    const [pageNaturalSizes, setPageNaturalSizes] = useState<
      Map<number, { width: number; height: number }>
    >(new Map());

    const {
      touchpadFlowHandlers,
      minisignFlowHandlers,
      qualifiedFlowHandlers,
      stampSignFlowHandlers,
      flowProgressFor,
      bulkDocumentsFor,
      hasNextInFlow,
      startSignatureFlow,
      startBulkSign,
    } = useSignatureFlow({
      roles,
      batchSessions,
      getArchivedRoles,
      onSigned,
      setOpenTouchpadSignature,
      setOpenMinisignSignature,
      setOpenQualifiedSignature,
      setOpenStampSignature,
    });

    const currentPage = useCurrentPage(containerRef, doc.numPages);

    const methodDescriptors = useMethodDescriptors({
      isPosDeviceBound,
      setOpenMinisignSignature,
      setOpenTouchpadSignature,
      setOpenQualifiedSignature,
      setOpenRemoteSignature,
      setOpenStampSignature,
      setOpenPosSignature,
    });

    const signaturesByPage = useMemo(() => {
      const byPage = new Map<number, PageSignature[]>();
      for (const role of roles) {
        for (const signature of role.signatures) {
          const pageSignatures = byPage.get(signature.page) ?? [];
          pageSignatures.push({
            signature,
            roleId: role.roleId,
            roleLabel: role.label,
          });
          byPage.set(signature.page, pageSignatures);
        }
      }
      return byPage;
    }, [roles]);

    const signatureRects = useMemo(
      () =>
        getSignatureRects(
          zoom,
          roles.flatMap((role) => role.signatures),
        ),
      [roles, zoom],
    );

    const stampsByPage = useMemo(() => {
      const byPage = new Map<number, ISessionStamp[]>();
      for (const stamp of stamps) {
        const pageStamps = byPage.get(stamp.page) ?? [];
        pageStamps.push(stamp);
        byPage.set(stamp.page, pageStamps);
      }
      return byPage;
    }, [stamps]);

    const stampRects = useMemo(
      () => getPlacedStampRects(zoom, stamps),
      [stamps, zoom],
    );

    const checkmarksByPage = useMemo(() => {
      const byPage = new Map<number, ISessionCheckmark[]>();
      for (const checkmark of checkmarks) {
        const pageCheckmarks = byPage.get(checkmark.page) ?? [];
        pageCheckmarks.push(checkmark);
        byPage.set(checkmark.page, pageCheckmarks);
      }
      return byPage;
    }, [checkmarks]);

    const checkmarkRects = useMemo(
      () => getPlacedCheckmarkRects(zoom, checkmarks),
      [checkmarks, zoom],
    );

    function getPageElement(pageNumber: number): HTMLDivElement | null {
      return pageWrapperElementsRef.current.get(pageNumber) ?? null;
    }

    function getMethodsFor(
      pageSignature: PageSignature,
    ): SignatureFieldMethod[] {
      return methodDescriptors
        .filter((descriptor) =>
          isSignatureMethodAvailable(
            descriptor.method,
            pageSignature.signature,
            enabledSignatureMethods,
            isSlaveSession,
            isRemoteSignatureForSlaveAllowed,
          ),
        )
        .map((descriptor) => ({
          key: descriptor.key,
          label: descriptor.label,
          icon: descriptor.icon,
          onSign: () => descriptor.open(pageSignature),
          disabled: descriptor.disabled,
        }));
    }

    useEffect(() => {
      onCurrentPageChange(currentPage);
    }, [currentPage, onCurrentPageChange]);

    useImperativeHandle(ref, () => ({
      scrollToPage(pageNumber: number) {
        pageWrapperElementsRef.current
          .get(pageNumber)
          ?.scrollIntoView({ block: 'start' });
      },
      openFirstUnsignedForStartup() {
        const firstUnsigned = roles
          .flatMap((role) =>
            role.signatures.map((signature) => ({
              signature,
              roleId: role.roleId,
              roleLabel: role.label,
            })),
          )
          .find((pageSignature) => !pageSignature.signature.transacted);
        if (!firstUnsigned) return null;

        const method = STARTUP_METHOD_ORDER.find((candidate) =>
          isSignatureMethodAvailable(
            candidate,
            firstUnsigned.signature,
            enabledSignatureMethods,
            isSlaveSession,
            isRemoteSignatureForSlaveAllowed,
          ),
        );
        if (!method) return null;

        methodDescriptors
          .find((descriptor) => descriptor.method === method)
          ?.open(firstUnsigned);
        return firstUnsigned.signature.signatureId;
      },
      openDialogForSignature(signatureId: string, method: SignatureMethod) {
        const pageSignature = roles
          .flatMap((role) =>
            role.signatures.map((signature) => ({
              signature,
              roleId: role.roleId,
              roleLabel: role.label,
            })),
          )
          .find((candidate) => candidate.signature.signatureId === signatureId);
        if (!pageSignature || pageSignature.signature.transacted) return false;
        if (
          !isSignatureMethodAvailable(
            method,
            pageSignature.signature,
            enabledSignatureMethods,
            isSlaveSession,
            isRemoteSignatureForSlaveAllowed,
          )
        ) {
          return false;
        }
        methodDescriptors
          .find((descriptor) => descriptor.method === method)
          ?.open(pageSignature);
        return true;
      },
      async fitToWidth(pageNumber: number) {
        const container = containerRef.current;
        if (!container) return null;
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        return (
          availableFitWidth(container, viewport.width, viewport.height) /
          viewport.width
        );
      },
      async fitToHeight(pageNumber: number) {
        const container = containerRef.current;
        if (!container) return null;
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        return (
          availableFitHeight(container, viewport.width, viewport.height) /
          viewport.height
        );
      },
    }));

    useEffect(() => {
      containerRef.current?.scrollTo({ top: 0, left: 0 });
    }, [transactionId]);

    useEffect(() => {
      let cancelled = false;
      setPageNaturalSizes(new Map());

      async function loadNaturalSizes() {
        const sizes = await Promise.all(
          Array.from({ length: doc.numPages }, async (_, index) => {
            const pageNumber = index + 1;
            try {
              const page = await doc.getPage(pageNumber);
              const viewport = page.getViewport({ scale: 1 });
              return [
                pageNumber,
                { width: viewport.width, height: viewport.height },
              ] as const;
            } catch (error) {
              console.error(
                `Failed to load the natural size for page ${pageNumber}`,
                error,
              );
              return null;
            }
          }),
        );
        if (cancelled) return;
        setPageNaturalSizes(new Map(sizes.filter((entry) => entry !== null)));
      }

      loadNaturalSizes();

      return () => {
        cancelled = true;
      };
    }, [doc]);

    useLayoutEffect(() => {
      for (const canvasHost of canvasHostElementsRef.current.values()) {
        canvasHost.replaceChildren();
      }
    }, [doc]);

    useEffect(() => {
      const signal: RenderSignal = { cancelled: false };

      async function renderAllPages() {
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
          const canvasHost = canvasHostElementsRef.current.get(pageNumber);
          if (!canvasHost) continue;

          canvasHost.innerHTML = '';
          const canvas = await renderPageToCanvas(
            doc,
            pageNumber,
            zoom,
            signal,
          );
          if (signal.cancelled || !canvas) return;
          canvasHost.appendChild(canvas);
        }
      }

      renderAllPages();

      return () => {
        signal.cancelled = true;
        signal.cancelRender?.();
      };
    }, [doc, zoom]);

    return (
      <>
        <div className={styles.pages} ref={containerRef}>
          {Array.from({ length: doc.numPages }, (_, index) => {
            const pageNumber = index + 1;
            const naturalSize = pageNaturalSizes.get(pageNumber);
            return (
              <div
                key={pageNumber}
                data-page-number={pageNumber}
                className={styles.pageWrapper}
                style={
                  naturalSize
                    ? {
                        width: naturalSize.width * zoom,
                        height: naturalSize.height * zoom,
                      }
                    : undefined
                }
                ref={(element) => {
                  if (element)
                    pageWrapperElementsRef.current.set(pageNumber, element);
                  else pageWrapperElementsRef.current.delete(pageNumber);
                }}
              >
                <div
                  className={styles.canvasHost}
                  ref={(element) => {
                    if (element)
                      canvasHostElementsRef.current.set(pageNumber, element);
                    else canvasHostElementsRef.current.delete(pageNumber);
                  }}
                />
                {(signaturesByPage.get(pageNumber) ?? []).map(
                  (pageSignature) => {
                    const rect = signatureRects.get(
                      pageSignature.signature.signatureId,
                    );
                    if (!rect) return null;
                    return (
                      <SignatureField
                        key={pageSignature.signature.signatureId}
                        signatureId={pageSignature.signature.signatureId}
                        text={pageSignature.signature.text}
                        isSigned={pageSignature.signature.transacted}
                        isActive={
                          pageSignature.signature.signatureId ===
                          activeSignatureId
                        }
                        isSessionLocked={isSessionLocked}
                        isCreatedInCurrentSession={
                          pageSignature.signature.isCreatedInCurrentSession
                        }
                        rect={rect}
                        scale={zoom}
                        methods={getMethodsFor(pageSignature)}
                        onActivate={() =>
                          onActivateSignature(pageSignature.signature)
                        }
                        onDelete={() =>
                          onDeleteSignature(pageSignature.signature)
                        }
                      />
                    );
                  },
                )}
                {(stampsByPage.get(pageNumber) ?? []).map((stamp) => {
                  const rect = stampRects.get(stamp.stampId);
                  if (!rect) return null;
                  return (
                    <StampField
                      key={stamp.stampId}
                      stampId={stamp.stampId}
                      isActive={stamp.stampId === activeStampId}
                      isSessionLocked={isSessionLocked}
                      rect={rect}
                      onActivate={() => onActivateStamp(stamp)}
                    />
                  );
                })}
                {(checkmarksByPage.get(pageNumber) ?? []).map((checkmark) => {
                  const rect = checkmarkRects.get(checkmark.checkboxId);
                  if (!rect) return null;
                  return (
                    <CheckmarkField
                      key={checkmark.checkboxId}
                      checkmark={checkmark}
                      isActive={checkmark.checkboxId === activeCheckmarkId}
                      isSessionLocked={isSessionLocked}
                      rect={rect}
                      onActivate={() => onActivateCheckmark(checkmark)}
                      onSave={onSaveCheckmark}
                      onDelete={onDeleteCheckmark}
                    />
                  );
                })}
              </div>
            );
          })}
          {stampCreation && (
            <StampPlacer
              stamp={stampCreation}
              scale={zoom}
              totalPages={doc.numPages}
              getPageElement={getPageElement}
              scrollContainerRef={containerRef}
              onChange={onStampCreationChange}
              onCancel={onCancelStampCreation}
              onConfirm={onConfirmStampCreation}
              isConfirming={isConfirmingStampCreation}
            />
          )}
          {checkmarkCreation && (
            <CheckmarkPlacer
              checkmark={checkmarkCreation}
              scale={zoom}
              totalPages={doc.numPages}
              getPageElement={getPageElement}
              scrollContainerRef={containerRef}
              onChange={onCheckmarkCreationChange}
              onCancel={onCancelCheckmarkCreation}
              onConfirm={onConfirmCheckmarkCreation}
            />
          )}
          {signatureCreation && (
            <SignaturePlacer
              signature={signatureCreation}
              scale={zoom}
              totalPages={doc.numPages}
              getPageElement={getPageElement}
              scrollContainerRef={containerRef}
              onChange={onSignatureCreationChange}
              onCancel={onCancelSignatureCreation}
              onConfirm={onConfirmSignatureCreation}
              isConfirming={false}
              methods={methodDescriptors
                .filter((descriptor) =>
                  isSignatureMethodAvailable(
                    descriptor.method,
                    { signActions: signatureCreation.signActions },
                    enabledSignatureMethods,
                    isSlaveSession,
                    isRemoteSignatureForSlaveAllowed,
                  ),
                )
                .map((descriptor) => ({
                  key: descriptor.key,
                  icon: descriptor.icon,
                  label: descriptor.label,
                }))}
            />
          )}
        </div>
        {openTouchpadSignature && apiToken && (
          <TouchpadSignDialog
            key={openTouchpadSignature.signature.signatureId}
            signature={openTouchpadSignature.signature}
            roleId={openTouchpadSignature.roleId}
            roleLabel={openTouchpadSignature.roleLabel}
            transactionId={openTouchpadSignature.transactionId ?? transactionId}
            apiToken={apiToken}
            onClose={touchpadFlowHandlers.onClose}
            onSigned={touchpadFlowHandlers.onSigned}
            onSignedSuccessfully={onSignedSuccessfully}
            hasNextInFlow={hasNextInFlow(SignatureMethod.TouchpadSignature)}
            flowProgress={flowProgressFor(SignatureMethod.TouchpadSignature)}
            bulkDocuments={bulkDocumentsFor(SignatureMethod.TouchpadSignature)}
          />
        )}
        {openStampSignature && apiToken && (
          <StampSignDialog
            key={openStampSignature.signature.signatureId}
            signature={openStampSignature.signature}
            roleId={openStampSignature.roleId}
            transactionId={openStampSignature.transactionId ?? transactionId}
            apiToken={apiToken}
            stampTemplates={stampTemplates}
            onClose={stampSignFlowHandlers.onClose}
            onSigned={stampSignFlowHandlers.onSigned}
            onSignedSuccessfully={onSignedSuccessfully}
          />
        )}
        {openRemoteSignature && apiToken && (
          <RemoteSignatureDialog
            signature={openRemoteSignature.signature}
            transactionId={transactionId}
            apiToken={apiToken}
            sessionEmail={sessionEmail}
            sessionPhone={sessionPhone}
            preserveRemoteSign={preserveRemoteSign}
            secretKey={secretKey}
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
            onClose={() => setOpenRemoteSignature(null)}
            onSent={onRemoteSignatureSent}
          />
        )}
        {openMinisignSignature && apiToken && (
          <MinisignDialog
            key={openMinisignSignature.signature.signatureId}
            signature={openMinisignSignature.signature}
            roleId={openMinisignSignature.roleId}
            roleLabel={openMinisignSignature.roleLabel}
            transactionId={openMinisignSignature.transactionId ?? transactionId}
            apiToken={apiToken}
            isEmailChannelEnabled={isMinisignEmailChannelEnabled}
            isSmsChannelEnabled={isMinisignSmsChannelEnabled}
            roles={roles}
            enabledSignatureMethods={enabledSignatureMethods}
            isSlaveSession={isSlaveSession}
            isRemoteSignatureForSlaveAllowed={isRemoteSignatureForSlaveAllowed}
            onNavigateToSignature={onActivateSignature}
            onClose={minisignFlowHandlers.onClose}
            onSigned={minisignFlowHandlers.onSigned}
            hasNextInFlow={hasNextInFlow(SignatureMethod.MiniSign)}
            flowProgress={flowProgressFor(SignatureMethod.MiniSign)}
            bulkDocuments={bulkDocumentsFor(SignatureMethod.MiniSign)}
          />
        )}
        {openQualifiedSignature && apiToken && (
          <QualifiedSignatureDialog
            key={openQualifiedSignature.signature.signatureId}
            signature={openQualifiedSignature.signature}
            roleId={openQualifiedSignature.roleId}
            roleLabel={openQualifiedSignature.roleLabel}
            transactionId={
              openQualifiedSignature.transactionId ?? transactionId
            }
            apiToken={apiToken}
            onClose={qualifiedFlowHandlers.onClose}
            onSigned={qualifiedFlowHandlers.onSigned}
          />
        )}
        {openPosSignature && apiToken && (
          <PosSignatureDialog
            signature={openPosSignature.signature}
            roleId={openPosSignature.roleId}
            roleLabel={openPosSignature.roleLabel}
            transactionId={transactionId}
            apiToken={apiToken}
            posUsername={posUsername}
            onClose={() => setOpenPosSignature(null)}
            onSigned={onSigned}
            onBindChecked={onPosDeviceBoundChange}
          />
        )}
        {isSignatureFlowDialogOpen && (
          <NewSignatureFlowDialog
            roles={roles}
            methodDescriptors={methodDescriptors}
            enabledSignatureMethods={enabledSignatureMethods}
            isSlaveSession={isSlaveSession}
            isRemoteSignatureForSlaveAllowed={isRemoteSignatureForSlaveAllowed}
            transactionId={transactionId}
            batchSessions={batchSessions}
            getArchivedRoles={getArchivedRoles}
            onClose={onCloseSignatureFlowDialog}
            onStartSignatureFlow={(method, remainingIds) =>
              startSignatureFlow(method, remainingIds)
            }
            isBulkSignatureEnabled={isBulkSignatureEnabled}
            onStartBulkSign={(method, documents) =>
              startBulkSign(method, documents)
            }
          />
        )}
      </>
    );
  },
);
