import { useState } from 'react';
import type { RefObject } from 'react';
import { rotateDocument } from '../../api/sessionActions';
import { DEFAULT_ZOOM } from '../../pdf/zoomLevels';
import type { PdfPagesHandle } from '../../components/PdfPages/PdfPages';

export interface UseViewerControlsParams {
  transactionId: string;
  pdfPagesRef: RefObject<PdfPagesHandle | null>;
  currentPage: number;
  scrollToPage: (pageNumber: number) => void;
  apiToken: string | null;
  isSessionLocked: boolean;
  setIsSessionLocked: (value: boolean) => void;
  refetchDocument: () => Promise<void>;
}

export interface UseViewerControlsResult {
  zoom: number;
  setZoom: (zoom: number) => void;
  isSidebarsHidden: boolean;
  handleFullWidthClick: () => Promise<void>;
  handleFullHeightClick: () => Promise<void>;
  handleToggleSidebars: () => void;
  handleRotateClick: (deltaRotation: number) => Promise<void>;
}

export function useViewerControls({
  transactionId,
  pdfPagesRef,
  currentPage,
  scrollToPage,
  apiToken,
  isSessionLocked,
  setIsSessionLocked,
  refetchDocument,
}: UseViewerControlsParams): UseViewerControlsResult {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isSidebarsHidden, setIsSidebarsHidden] = useState(false);

  async function handleFullWidthClick() {
    const first = await pdfPagesRef.current?.fitToWidth(currentPage);
    if (!first) return;
    setZoom(first);
    requestAnimationFrame(() => {
      void pdfPagesRef.current?.fitToWidth(currentPage).then((second) => {
        if (second) setZoom(second);
      });
    });
  }

  async function handleFullHeightClick() {
    const first = await pdfPagesRef.current?.fitToHeight(currentPage);
    if (!first) return;
    setZoom(first);
    requestAnimationFrame(() => {
      void pdfPagesRef.current?.fitToHeight(currentPage).then((second) => {
        if (second) setZoom(second);
      });
      scrollToPage(currentPage);
    });
  }

  function handleToggleSidebars() {
    setIsSidebarsHidden((hidden) => !hidden);
  }

  async function handleRotateClick(deltaRotation: number) {
    if (!apiToken || isSessionLocked) return;
    setIsSessionLocked(true);
    try {
      await rotateDocument({ transactionId, deltaRotation, apiToken });
      await refetchDocument();
    } finally {
      setIsSessionLocked(false);
    }
  }

  return {
    zoom,
    setZoom,
    isSidebarsHidden,
    handleFullWidthClick,
    handleFullHeightClick,
    handleToggleSidebars,
    handleRotateClick,
  };
}
