import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface RenderSignal {
  cancelled: boolean;
  cancelRender?: () => void;
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  signal: RenderSignal,
): Promise<HTMLCanvasElement | null> {
  const page = await doc.getPage(pageNumber);
  if (signal.cancelled) return null;

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderTask = page.render({ canvas, viewport });
  signal.cancelRender = () => renderTask.cancel();
  try {
    await renderTask.promise;
  } catch (error) {
    if (signal.cancelled) return null;
    throw error;
  } finally {
    signal.cancelRender = undefined;
  }
  if (signal.cancelled) return null;

  return canvas;
}
