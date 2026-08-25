import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export function useCurrentPage(
  containerRef: RefObject<HTMLElement | null>,
  pageCount: number,
): number {
  const [currentPage, setCurrentPage] = useState(1);
  const visibleRatios = useRef(new Map<number, number>());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageCount === 0) return;

    visibleRatios.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number(
            (entry.target as HTMLElement).dataset.pageNumber,
          );
          if (!pageNumber) continue;
          visibleRatios.current.set(pageNumber, entry.intersectionRatio);
        }

        let bestPage = currentPage;
        let bestRatio = 0;
        for (const [pageNumber, ratio] of visibleRatios.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = pageNumber;
          }
        }
        if (bestRatio > 0) {
          setCurrentPage(bestPage);
        }
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const pageElements =
      container.querySelectorAll<HTMLElement>('[data-page-number]');
    pageElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, pageCount]);

  return currentPage;
}
