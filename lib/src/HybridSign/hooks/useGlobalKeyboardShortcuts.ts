import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  topDialogShortcuts,
  isAnyDialogRegistered,
} from '../../hooks/useDialogShortcuts';
import { getDisplayZoomLevels, zoomIndexOf } from '../../pdf/zoomLevels';
import { SignatureMethod } from '../../types/session';
import type { ISessionSignature } from '../../types/session';
import type { PdfPagesHandle } from '../../components/PdfPages/PdfPages';

export interface UseGlobalKeyboardShortcutsParams {
  doc: PDFDocumentProxy | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  currentPage: number;
  allSignatures: ISessionSignature[];
  activeSignatureId: string | null;
  activateSignature: (signature: ISessionSignature) => void;
  scrollToPage: (pageNumber: number) => void;
  pdfPagesRef: RefObject<PdfPagesHandle | null>;
  showCloseButton: boolean | undefined;
  areSessionActionsVisible: boolean;
  isSessionLocked: boolean;
  handleFinalizeClick: () => void;
  handleCancelClick: () => void;
  handleToggleSidebars: () => void;
  handleFullHeightClick: () => Promise<void>;
}

export function useGlobalKeyboardShortcuts({
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
}: UseGlobalKeyboardShortcutsParams): void {
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA' ||
        target.isContentEditable
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!doc || isTypingTarget(e.target)) return;
      const displayZoomLevels = getDisplayZoomLevels(zoom);
      const zoomIndex = zoomIndexOf(displayZoomLevels, zoom);

      if (e.key === 'Escape') {
        e.preventDefault();
        topDialogShortcuts()?.onClose();
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        topDialogShortcuts()?.onSubmit();
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'Backspace') {
        e.preventDefault();
        topDialogShortcuts()?.onClear?.();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if ((showCloseButton || areSessionActionsVisible) && !isSessionLocked)
          handleFinalizeClick();
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        if ((showCloseButton || areSessionActionsVisible) && !isSessionLocked)
          handleCancelClick();
      } else if (!e.ctrlKey && !e.shiftKey && e.key === 'PageUp') {
        e.preventDefault();
        scrollToPage(currentPage - 1);
      } else if (!e.ctrlKey && !e.shiftKey && e.key === 'PageDown') {
        e.preventDefault();
        scrollToPage(currentPage + 1);
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        const topNext = topDialogShortcuts()?.onNavigateNext;
        if (topNext) {
          topNext();
        } else if (allSignatures.length > 0) {
          const index = allSignatures.findIndex(
            (signature) => signature.signatureId === activeSignatureId,
          );
          activateSignature(allSignatures[(index + 1) % allSignatures.length]);
        }
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        const topPrev = topDialogShortcuts()?.onNavigatePrev;
        if (topPrev) {
          topPrev();
        } else if (allSignatures.length > 0) {
          const index = allSignatures.findIndex(
            (signature) => signature.signatureId === activeSignatureId,
          );
          const newIndex =
            index === -1
              ? allSignatures.length - 1
              : (index - 1 + allSignatures.length) % allSignatures.length;
          activateSignature(allSignatures[newIndex]);
        }
      } else if (e.ctrlKey && !e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (activeSignatureId && !isAnyDialogRegistered()) {
          pdfPagesRef.current?.openDialogForSignature(
            activeSignatureId,
            SignatureMethod.TouchpadSignature,
          );
        }
      } else if (e.ctrlKey && !e.shiftKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        if (activeSignatureId && !isAnyDialogRegistered()) {
          pdfPagesRef.current?.openDialogForSignature(
            activeSignatureId,
            SignatureMethod.QualifiedSignature,
          );
        }
      } else if (e.ctrlKey && !e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleToggleSidebars();
      } else if (!e.ctrlKey && e.key === '+') {
        e.preventDefault();
        if (zoomIndex !== displayZoomLevels.length - 1)
          setZoom(displayZoomLevels[zoomIndex + 1].value);
      } else if (!e.ctrlKey && e.key === '-') {
        e.preventDefault();
        if (zoomIndex !== 0) setZoom(displayZoomLevels[zoomIndex - 1].value);
      } else if (!e.ctrlKey && e.key === ',') {
        e.preventDefault();
        handleFullHeightClick();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    doc,
    zoom,
    currentPage,
    allSignatures,
    activeSignatureId,
    showCloseButton,
    areSessionActionsVisible,
    isSessionLocked,
    activateSignature,
    handleFinalizeClick,
    handleCancelClick,
    handleToggleSidebars,
    handleFullHeightClick,
  ]);
}
