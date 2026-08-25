import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from '../../../pdf/renderPage';
import type { RenderSignal } from '../../../pdf/renderPage';
import styles from './Thumbnails.module.css';

const THUMBNAIL_SCALE = 0.2;

interface ThumbnailsProps {
  doc: PDFDocumentProxy;
  currentPage: number;
  onPageClick: (pageNumber: number) => void;
}

export function Thumbnails({ doc, currentPage, onPageClick }: ThumbnailsProps) {
  const pageElementsRef = useRef(new Map<number, HTMLButtonElement>());
  const refCallbacksRef = useRef(
    new Map<number, (element: HTMLButtonElement | null) => void>(),
  );

  function getPageRefCallback(pageNumber: number) {
    let callback = refCallbacksRef.current.get(pageNumber);
    if (!callback) {
      callback = (element) => {
        if (element) pageElementsRef.current.set(pageNumber, element);
        else pageElementsRef.current.delete(pageNumber);
      };
      refCallbacksRef.current.set(pageNumber, callback);
    }
    return callback;
  }

  useLayoutEffect(() => {
    for (const pageElement of pageElementsRef.current.values()) {
      pageElement.replaceChildren();
    }
  }, [doc]);

  useEffect(() => {
    const signal: RenderSignal = { cancelled: false };

    async function renderAllThumbnails() {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const pageElement = pageElementsRef.current.get(pageNumber);
        if (!pageElement) continue;

        pageElement.innerHTML = '';
        const canvas = await renderPageToCanvas(
          doc,
          pageNumber,
          THUMBNAIL_SCALE,
          signal,
        );
        if (signal.cancelled || !canvas) return;

        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
        pageElement.appendChild(canvas);
      }
    }

    renderAllThumbnails();

    return () => {
      signal.cancelled = true;
      signal.cancelRender?.();
    };
  }, [doc]);

  useEffect(() => {
    pageElementsRef.current
      .get(currentPage)
      ?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  return (
    <div className={styles.thumbnails} data-field-id="thumbnails">
      {Array.from({ length: doc.numPages }, (_, index) => {
        const pageNumber = index + 1;
        return (
          <button
            key={pageNumber}
            type="button"
            title={`Page ${pageNumber}`}
            className={
              pageNumber === currentPage
                ? styles.thumbnailActive
                : styles.thumbnail
            }
            data-field-id={`thumbnail-${pageNumber}`}
            onClick={() => onPageClick(pageNumber)}
            ref={getPageRefCallback(pageNumber)}
          />
        );
      })}
    </div>
  );
}
