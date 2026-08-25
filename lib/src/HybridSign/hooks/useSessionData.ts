import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import pdfWasmJbig2Url from 'pdfjs-dist/wasm/jbig2.wasm?url';

const PDF_WASM_URL = pdfWasmJbig2Url.replace(/jbig2\.wasm(?:\?.*)?$/, '');
import { fetchDocument } from '../../api/getDocument';
import { fetchRemoteSignatureIdTypes } from '../../api/getIdentifications';
import { getTenantToken } from '../../api/retrieveToken';
import { checkPosBind } from '../../api/posSignature';
import { i18n } from '../../i18n/i18n';
import { mapEnabledSignatureMethods } from '../../signatures/signatureMethods';
import { applyPredefinedRoleLabels } from '../../signatures/roleLabels';
import { SignatureMethod } from '../../types/session';
import type {
  ISessionRole,
  ISessionSignature,
  ISessionCheckmark,
  ISessionStamp,
  SessionMetadata,
  BatchSession,
} from '../../types/session';
import type {
  GetDocumentCheckbox,
  GetDocumentMeta,
  StampTemplate,
} from '../../api/getDocument.types';
import type { PdfSource, Language } from '../../types/hybridSign';
import type { PdfPagesHandle } from '../../components/PdfPages/PdfPages';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export type Status = 'loading' | 'ready' | 'error';

let pendingWorkerTeardown: Promise<void> = Promise.resolve();

function parseMinisignChannels(minisignChannelsEnabled: string): {
  email: boolean;
  sms: boolean;
} {
  const channels = minisignChannelsEnabled
    .split(',')
    .map((channel) => channel.trim().toLowerCase());
  return { email: channels.includes('email'), sms: channels.includes('sms') };
}

function applyOverride<K extends keyof SessionMetadata>(
  key: K,
  rawValue: NonNullable<SessionMetadata[K]>,
  override: Partial<SessionMetadata> | undefined,
): NonNullable<SessionMetadata[K]> {
  return (
    (override?.[key] as NonNullable<SessionMetadata[K]> | undefined) ?? rawValue
  );
}

function mapCheckboxesResponse(
  checkboxes: GetDocumentCheckbox[],
  previous: ISessionCheckmark[],
): ISessionCheckmark[] {
  const apiIds = new Set(checkboxes.map((checkbox) => checkbox.checkboxId));
  const mapped: ISessionCheckmark[] = checkboxes.map((checkbox) => ({
    checkboxId: checkbox.checkboxId,
    name: checkbox.name,
    label: checkbox.label,
    page: checkbox.page,
    x: checkbox.x,
    y: checkbox.y,
    width: checkbox.width,
    height: checkbox.height,
    checked: checkbox.checked,
    isCreatedInCurrentSession: false,
  }));
  const unsavedLocal = previous.filter(
    (checkmark) =>
      checkmark.isCreatedInCurrentSession && !apiIds.has(checkmark.checkboxId),
  );
  return [...mapped, ...unsavedLocal];
}

function mapRolesResponse(
  roles: ISessionRole[],
  previous: ISessionRole[],
): ISessionRole[] {
  const apiSignatureIds = new Set(
    roles.flatMap((role) =>
      role.signatures.map((signature) => signature.signatureId),
    ),
  );
  const unsavedLocalByRoleId = new Map<string, ISessionSignature[]>();
  for (const role of previous) {
    const unsaved = role.signatures.filter(
      (signature) =>
        signature.isCreatedInCurrentSession &&
        !apiSignatureIds.has(signature.signatureId),
    );
    if (unsaved.length > 0) unsavedLocalByRoleId.set(role.roleId, unsaved);
  }
  if (unsavedLocalByRoleId.size === 0) return roles;

  const merged = roles.map((role) => {
    const unsaved = unsavedLocalByRoleId.get(role.roleId);
    return unsaved
      ? { ...role, signatures: [...role.signatures, ...unsaved] }
      : role;
  });
  const apiRoleIds = new Set(roles.map((role) => role.roleId));
  for (const role of previous) {
    if (!apiRoleIds.has(role.roleId) && unsavedLocalByRoleId.has(role.roleId)) {
      merged.push({
        ...role,
        signatures: unsavedLocalByRoleId.get(role.roleId)!,
      });
    }
  }
  return merged;
}

function toDocumentSource(source: PdfSource): {
  data: Uint8Array;
  wasmUrl: string;
} {
  const binary = atob(source);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { data: bytes, wasmUrl: PDF_WASM_URL };
}

export interface UseSessionDataParams {
  transactionId: string;
  tenantId: string;
  language: Language;
  signee: string | undefined;
  secretKey: string | undefined;
  sessionMetadataOverride: Partial<SessionMetadata> | undefined;
  pdfPagesRef: RefObject<PdfPagesHandle | null>;
  onFreshDocumentLoaded: () => void;
  onAdvanceToStartupSignature: (signature: ISessionSignature) => void;
  showNotification: (messageKey: string, type: 'error') => void;
}

export interface UseSessionDataResult {
  status: Status;
  doc: PDFDocumentProxy | null;
  documentName: string;
  roles: ISessionRole[];
  setRoles: (updater: (previous: ISessionRole[]) => ISessionRole[]) => void;
  enabledSignatureMethods: SignatureMethod[];
  stampTemplates: StampTemplate[];
  apiToken: string | null;
  isDocumentFinalizable: boolean;
  isRemoteSignaturePhoneMandatory: boolean;
  isSlaveSession: boolean;
  isRemoteSignatureForSlaveAllowed: boolean;
  isInvitationAllowed: boolean;
  signatureFlowEnabled: boolean;
  standAloneUI: boolean;
  isLite: boolean;
  remoteSignatureValidityUntil: string;
  isAllowRemoteSignatureToReceiverVisible: boolean;
  allowRemoteSignatureToReceiverDefault: boolean;
  areRemoteSignatureIdFieldsVisible: boolean;
  areRemoteSignatureIdFieldsEditable: boolean;
  remoteSignatureIdTypes: string[];
  isMinisignEmailChannelEnabled: boolean;
  isMinisignSmsChannelEnabled: boolean;
  isPosDeviceBound: boolean;
  setIsPosDeviceBound: (value: boolean) => void;
  posUsername: string;
  posSignerName: string;
  sessionEmail: string;
  sessionPhone: string;
  preserveRemoteSign: boolean;
  isSessionLocked: boolean;
  setIsSessionLocked: (value: boolean) => void;
  consentMessage: string | null;
  handleAcceptConsent: () => void;
  handleDeclineConsent: () => void;
  stamps: ISessionStamp[];
  areAdditionalStampsAllowed: boolean;
  checkmarks: ISessionCheckmark[];
  setCheckmarks: (
    updater: (previous: ISessionCheckmark[]) => ISessionCheckmark[],
  ) => void;
  areAdditionalCheckboxesAllowed: boolean;
  isBulkSignatureEnabled: boolean;
  areAdditionalSignaturesAllowed: boolean;
  disableRoles: boolean;
  emailOrderingEnabled: boolean;
  refetchDocument: () => Promise<void>;
  invalidateArchivedDocuments: (transactionIds: string[]) => void;
  getArchivedRoles: (transactionId: string) => ISessionRole[] | undefined;
  activeTransactionId: string;
  activeSecretKey: string | undefined;
  batchSessions: BatchSession[];
  switchToDocument: (session: BatchSession) => void;
}

export function useSessionData({
  transactionId,
  tenantId,
  language,
  signee,
  secretKey,
  sessionMetadataOverride,
  pdfPagesRef,
  onFreshDocumentLoaded,
  onAdvanceToStartupSignature,
  showNotification,
}: UseSessionDataParams): UseSessionDataResult {
  const [status, setStatus] = useState<Status>('loading');
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [roles, setRoles] = useState<ISessionRole[]>([]);
  const [enabledSignatureMethods, setEnabledSignatureMethods] = useState<
    SignatureMethod[]
  >([]);
  const [stampTemplates, setStampTemplates] = useState<StampTemplate[]>([]);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [isDocumentFinalizable, setIsDocumentFinalizable] = useState(false);
  const [isRemoteSignaturePhoneMandatory, setIsRemoteSignaturePhoneMandatory] =
    useState(false);
  const [isSlaveSession, setIsSlaveSession] = useState(false);
  const [
    isRemoteSignatureForSlaveAllowed,
    setIsRemoteSignatureForSlaveAllowed,
  ] = useState(false);
  const [isInvitationAllowed, setIsInvitationAllowed] = useState(false);
  const [signatureFlowEnabled, setSignatureFlowEnabled] = useState(false);
  const [standAloneUI, setStandAloneUI] = useState(false);
  const [isLite, setIsLite] = useState(false);
  const [remoteSignatureValidityUntil, setRemoteSignatureValidityUntil] =
    useState('');
  const [
    isAllowRemoteSignatureToReceiverVisible,
    setIsAllowRemoteSignatureToReceiverVisible,
  ] = useState(false);
  const [
    allowRemoteSignatureToReceiverDefault,
    setAllowRemoteSignatureToReceiverDefault,
  ] = useState(false);
  const [
    areRemoteSignatureIdFieldsVisible,
    setAreRemoteSignatureIdFieldsVisible,
  ] = useState(false);
  const [
    areRemoteSignatureIdFieldsEditable,
    setAreRemoteSignatureIdFieldsEditable,
  ] = useState(true);
  const [remoteSignatureIdTypes, setRemoteSignatureIdTypes] = useState<
    string[]
  >([]);
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionPhone, setSessionPhone] = useState('');
  const [isMinisignEmailChannelEnabled, setIsMinisignEmailChannelEnabled] =
    useState(false);
  const [isMinisignSmsChannelEnabled, setIsMinisignSmsChannelEnabled] =
    useState(false);
  const [isPosDeviceBound, setIsPosDeviceBound] = useState(false);
  const [posUsername, setPosUsername] = useState('');
  const [posSignerName, setPosSignerName] = useState('');
  const [preserveRemoteSign, setPreserveRemoteSign] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [consentMessage, setConsentMessage] = useState<string | null>(null);
  const [stamps, setStamps] = useState<ISessionStamp[]>([]);
  const [areAdditionalStampsAllowed, setAreAdditionalStampsAllowed] =
    useState(false);
  const [checkmarks, setCheckmarks] = useState<ISessionCheckmark[]>([]);
  const [areAdditionalCheckboxesAllowed, setAreAdditionalCheckboxesAllowed] =
    useState(false);
  const [isBulkSignatureEnabled, setIsBulkSignatureEnabled] = useState(false);
  const [areAdditionalSignaturesAllowed, setAreAdditionalSignaturesAllowed] =
    useState(false);
  const [disableRoles, setDisableRoles] = useState(false);
  const [emailOrderingEnabled, setEmailOrderingEnabled] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState(transactionId);
  const [activeSecretKey, setActiveSecretKey] = useState(secretKey);
  const [batchSessions, setBatchSessions] = useState<BatchSession[]>([]);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const lastMetaRef = useRef<GetDocumentMeta | null>(null);
  const startupSignatureDialogPendingRef = useRef(false);
  const startupSignatureIdRef = useRef<string | null>(null);
  const localRolesArchiveRef = useRef<Map<string, ISessionRole[]>>(new Map());
  const localCheckmarksArchiveRef = useRef<Map<string, ISessionCheckmark[]>>(
    new Map(),
  );
  const loadedTransactionIdRef = useRef<string | null>(null);

  function applyMetaState(
    meta: GetDocumentMeta,
    override: Partial<SessionMetadata> | undefined,
  ) {
    const signatureMethods = applyOverride(
      'enabledSignatureMethods',
      mapEnabledSignatureMethods(meta.signActions),
      override,
    );
    setEnabledSignatureMethods(signatureMethods);
    setIsDocumentFinalizable(
      applyOverride('isDocumentFinalizable', meta.finalizeU, override),
    );
    setIsRemoteSignaturePhoneMandatory(
      applyOverride(
        'isRemoteSignaturePhoneMandatory',
        meta.inputfieldMobilenumberIsMandatory,
        override,
      ),
    );
    setIsSlaveSession(
      applyOverride('isSlaveSession', meta.hybridSignSlave, override),
    );
    setIsRemoteSignatureForSlaveAllowed(
      applyOverride(
        'isRemoteSignatureForSlaveAllowed',
        meta.allowRemoteSignature,
        override,
      ),
    );
    setIsInvitationAllowed(
      applyOverride('isInvitationAllowed', meta.allowInvitation, override),
    );
    setSignatureFlowEnabled(
      applyOverride(
        'signatureFlowEnabled',
        meta.signatureFlowEnabled,
        override,
      ),
    );
    setStandAloneUI(applyOverride('standAloneUI', meta.standAloneUI, override));
    setIsLite(applyOverride('isLite', meta.liteUI, override));
    setRemoteSignatureValidityUntil(
      applyOverride(
        'remoteSignatureValidityUntil',
        meta.remoteSignatureValidityUntil,
        override,
      ),
    );
    setIsAllowRemoteSignatureToReceiverVisible(
      applyOverride(
        'shouldAskForAdditionalRemoteSignature',
        meta.askForAdditionalRemoteSignature,
        override,
      ),
    );
    setAllowRemoteSignatureToReceiverDefault(
      applyOverride(
        'additionalRemoteSignatureValue',
        meta.askForAdditionalRemoteSignatureValue,
        override,
      ),
    );
    setAreRemoteSignatureIdFieldsVisible(
      applyOverride(
        'areRemoteSignatureIdFieldsVisible',
        meta.idFieldsVisible,
        override,
      ),
    );
    setAreRemoteSignatureIdFieldsEditable(
      !applyOverride(
        'areRemoteSignatureIdFieldsReadonly',
        meta.idFieldsReadonly,
        override,
      ),
    );
    setPosUsername(applyOverride('posUsername', meta.posUsername, override));
    setPosSignerName(applyOverride('posSignerName', meta.signerName, override));
    setSessionEmail(applyOverride('email', meta.email, override));
    setSessionPhone(applyOverride('phone', meta.phone, override));
    setPreserveRemoteSign(
      applyOverride('preserveRemoteSign', meta.preserveRemoteSign, override),
    );
    setAreAdditionalStampsAllowed(
      applyOverride(
        'areAdditionalStampsAllowed',
        meta.allowAdditionalStamps,
        override,
      ),
    );
    setAreAdditionalCheckboxesAllowed(
      applyOverride(
        'allowAdditionalCheckboxes',
        meta.allowAdditionalCheckboxes,
        override,
      ),
    );
    setIsBulkSignatureEnabled(
      applyOverride(
        'bulkSignatureEnabled',
        meta.bulkSignatureEnabled,
        override,
      ),
    );
    setAreAdditionalSignaturesAllowed(
      applyOverride(
        'areAdditionalSignaturesAllowed',
        meta.allowAdditionalSignatures,
        override,
      ),
    );
    setDisableRoles(applyOverride('disableRoles', meta.disableRoles, override));
    setEmailOrderingEnabled(
      applyOverride(
        'emailOrderingEnabled',
        meta.emailOrderingEnabled,
        override,
      ),
    );
    return signatureMethods;
  }

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!lastMetaRef.current) return;
    applyMetaState(lastMetaRef.current, sessionMetadataOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMetadataOverride]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    if (
      loadedTransactionIdRef.current &&
      loadedTransactionIdRef.current !== activeTransactionId
    ) {
      localRolesArchiveRef.current.set(loadedTransactionIdRef.current, roles);
      localCheckmarksArchiveRef.current.set(
        loadedTransactionIdRef.current,
        checkmarks,
      );
    }

    setStatus('loading');
    setConsentMessage(null);

    async function loadDocument() {
      try {
        const apiToken = await getTenantToken(activeTransactionId, tenantId);
        if (cancelled) return;

        const response = await fetchDocument({
          transactionId: activeTransactionId,
          locale: sessionMetadataOverride?.locale ?? language,
          signee,
          secretKey: activeSecretKey,
          apiToken,
        });
        if (cancelled) return;

        if (response.meta.locale) {
          i18n.changeLanguage(response.meta.locale);
        }

        console.log('HybridSign getDocument response:', response);

        await pendingWorkerTeardown;
        if (cancelled) return;

        const docSource = toDocumentSource(response.pdf);
        loadingTask = getDocument(docSource);
        loadingTaskRef.current = loadingTask;
        const loadedDoc = await loadingTask.promise;
        if (cancelled) return;

        setDocumentName(response.name);
        setRoles(
          mapRolesResponse(
            applyPredefinedRoleLabels(
              response.signatureData.roles,
              i18n.t.bind(i18n),
            ),
            localRolesArchiveRef.current.get(activeTransactionId) ?? [],
          ),
        );
        lastMetaRef.current = response.meta;
        startupSignatureDialogPendingRef.current =
          response.meta.showSignatureDialog;
        const signatureMethods = applyMetaState(
          response.meta,
          sessionMetadataOverride,
        );
        const gateIsSlaveSession = applyOverride(
          'isSlaveSession',
          response.meta.hybridSignSlave,
          sessionMetadataOverride,
        );
        const gateValidityUntil = applyOverride(
          'remoteSignatureValidityUntil',
          response.meta.remoteSignatureValidityUntil,
          sessionMetadataOverride,
        );
        const gateConsentText = applyOverride(
          'consentText',
          response.meta.consentText,
          sessionMetadataOverride,
        );
        const gateStandAloneUI = applyOverride(
          'standAloneUI',
          response.meta.standAloneUI,
          sessionMetadataOverride,
        );
        let isLockedByStartupGate = response.finalized && !gateStandAloneUI;
        if (gateIsSlaveSession && gateValidityUntil) {
          const isExpired = new Date(gateValidityUntil).getTime() < Date.now();
          if (isExpired) {
            isLockedByStartupGate = true;
            if (response.meta.remoteSignatureStatus !== 'SIGNED') {
              showNotification('errors.9012', 'error');
            }
          } else if (response.meta.remoteSignatureStatus === 'SIGNED') {
            isLockedByStartupGate = true;
          } else if (gateConsentText) {
            isLockedByStartupGate = true;
            setConsentMessage(gateConsentText);
          }
        }
        setStampTemplates(response.stampTemplatesData ?? []);
        setStamps(response.stampData?.stampsMetadata ?? []);
        setCheckmarks(
          mapCheckboxesResponse(
            response.signatureData.checkboxes ?? [],
            localCheckmarksArchiveRef.current.get(activeTransactionId) ?? [],
          ),
        );
        setBatchSessions(response.meta.batchSessions ?? []);
        onFreshDocumentLoaded();
        setApiToken(apiToken);
        fetchRemoteSignatureIdTypes(apiToken)
          .then((idTypes) => {
            if (!cancelled) setRemoteSignatureIdTypes(idTypes);
          })
          .catch(() => {});
        const minisignChannels = parseMinisignChannels(
          response.minisignChannelsEnabled,
        );
        setIsMinisignEmailChannelEnabled(minisignChannels.email);
        setIsMinisignSmsChannelEnabled(minisignChannels.sms);
        if (signatureMethods.includes(SignatureMethod.PosSignature)) {
          checkPosBind(activeTransactionId, apiToken)
            .then((result) => setIsPosDeviceBound(!!result))
            .catch(() => {});
        }
        setIsSessionLocked(isLockedByStartupGate);
        setDoc(loadedDoc);
        setStatus('ready');
        loadedTransactionIdRef.current = activeTransactionId;
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
      if (loadingTask) {
        pendingWorkerTeardown = loadingTask.destroy().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTransactionId, tenantId, language, signee, activeSecretKey]);

  useEffect(() => {
    if (!doc || !startupSignatureDialogPendingRef.current || isSessionLocked)
      return;
    startupSignatureDialogPendingRef.current = false;
    startupSignatureIdRef.current =
      pdfPagesRef.current?.openFirstUnsignedForStartup() ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  async function refetchDocument() {
    try {
      const token = await getTenantToken(activeTransactionId, tenantId);
      const response = await fetchDocument({
        transactionId: activeTransactionId,
        locale: sessionMetadataOverride?.locale ?? language,
        signee,
        secretKey: activeSecretKey,
        apiToken: token,
      });

      if (response.meta.locale) {
        i18n.changeLanguage(response.meta.locale);
      }

      await pendingWorkerTeardown;
      const previousLoadingTask = loadingTaskRef.current;
      const docSource = toDocumentSource(response.pdf);
      const loadingTask = getDocument(docSource);
      loadingTaskRef.current = loadingTask;
      const loadedDoc = await loadingTask.promise;

      setApiToken(token);
      setDocumentName(response.name);
      setRoles((previous) =>
        mapRolesResponse(response.signatureData.roles, previous),
      );
      if (startupSignatureIdRef.current) {
        startupSignatureIdRef.current = null;
        const nextUnsigned = response.signatureData.roles
          .flatMap((role) => role.signatures)
          .find((signature) => !signature.transacted);
        if (nextUnsigned) {
          onAdvanceToStartupSignature(nextUnsigned);
        }
      }
      lastMetaRef.current = response.meta;
      const signatureMethods = applyMetaState(
        response.meta,
        sessionMetadataOverride,
      );
      setStampTemplates(response.stampTemplatesData ?? []);
      setStamps(response.stampData?.stampsMetadata ?? []);
      setCheckmarks((previous) =>
        mapCheckboxesResponse(
          response.signatureData.checkboxes ?? [],
          previous,
        ),
      );
      setBatchSessions(response.meta.batchSessions ?? []);
      const minisignChannels = parseMinisignChannels(
        response.minisignChannelsEnabled,
      );
      setIsMinisignEmailChannelEnabled(minisignChannels.email);
      setIsMinisignSmsChannelEnabled(minisignChannels.sms);
      if (signatureMethods.includes(SignatureMethod.PosSignature)) {
        checkPosBind(activeTransactionId, token)
          .then((result) => setIsPosDeviceBound(!!result))
          .catch(() => {});
      }
      setDoc(loadedDoc);

      if (previousLoadingTask) {
        pendingWorkerTeardown = previousLoadingTask.destroy().catch(() => {});
      }
    } catch {}
  }

  function switchToDocument(session: BatchSession) {
    setActiveTransactionId(session.transactionId);
    setActiveSecretKey(session.secretKey);
  }

  function getArchivedRoles(transactionId: string): ISessionRole[] | undefined {
    return localRolesArchiveRef.current.get(transactionId);
  }

  function invalidateArchivedDocuments(transactionIds: string[]) {
    for (const id of transactionIds) {
      localRolesArchiveRef.current.delete(id);
      localCheckmarksArchiveRef.current.delete(id);
    }
  }

  function handleAcceptConsent() {
    setConsentMessage(null);
    setIsSessionLocked(false);
  }

  function handleDeclineConsent() {
    setConsentMessage(null);
  }

  return {
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
  };
}
