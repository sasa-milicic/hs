import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

const EDGE_SCROLL_TRIGGER_DISTANCE = 50;
const EDGE_SCROLL_SPEED = 10;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface PlacedItem {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface UsePlacerDragParams<T extends PlacedItem> {
  item: T;
  scale: number;
  totalPages: number;
  getPageElement: (pageNumber: number) => HTMLDivElement | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onChange: (item: T) => void;
}

export function usePlacerDrag<T extends PlacedItem>({
  item,
  scale,
  totalPages,
  getPageElement,
  scrollContainerRef,
  onChange,
}: UsePlacerDragParams<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    page: number;
  } | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const didCenterRef = useRef(false);

  const [pageOffset, setPageOffset] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    const pageElement = getPageElement(item.page);
    if (!pageElement) {
      setPageOffset({ left: 0, top: 0 });
      return;
    }
    const measure = () =>
      setPageOffset({
        left: pageElement.offsetLeft,
        top: pageElement.offsetTop,
      });
    measure();
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(scrollContainer);
    return () => resizeObserver.disconnect();
  }, [item.page, scale, getPageElement, scrollContainerRef]);

  function stopEdgeScroll() {
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }

  useEffect(() => {
    if (didCenterRef.current) return;
    didCenterRef.current = true;
    const pageElement = getPageElement(item.page);
    const scrollContainer = scrollContainerRef.current;
    if (!pageElement || !scrollContainer) return;

    const pageRect = pageElement.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const widthPx = item.width * scale;
    const heightPx = item.height * scale;

    const leftPx = clamp(
      containerRect.left +
        containerRect.width / 2 -
        pageRect.left -
        widthPx / 2,
      0,
      Math.max(0, pageRect.width - widthPx),
    );
    const topPx = clamp(
      containerRect.top +
        containerRect.height / 2 -
        pageRect.top -
        heightPx / 2,
      0,
      Math.max(0, pageRect.height - heightPx),
    );

    onChange({ ...item, x: leftPx / scale, y: topPx / scale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => stopEdgeScroll, []);

  function startEdgeScroll(direction: 1 | -1) {
    if (scrollIntervalRef.current !== null) return;
    scrollIntervalRef.current = window.setInterval(() => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;
      scrollContainer.scrollTop += direction * EDGE_SCROLL_SPEED;
    }, 50);
  }

  function updateEdgeScroll(clientY: number) {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const containerRect = scrollContainer.getBoundingClientRect();
    if (clientY - containerRect.top < EDGE_SCROLL_TRIGGER_DISTANCE) {
      startEdgeScroll(-1);
    } else if (containerRect.bottom - clientY < EDGE_SCROLL_TRIGGER_DISTANCE) {
      startEdgeScroll(1);
    } else {
      stopEdgeScroll();
    }
  }

  function pageContainsY(pageNumber: number, clientY: number): boolean {
    if (pageNumber < 1 || pageNumber > totalPages) return false;
    const element = getPageElement(pageNumber);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  }

  function findPageAt(clientY: number, hintPage: number): number | null {
    if (pageContainsY(hintPage, clientY)) return hintPage;
    if (pageContainsY(hintPage - 1, clientY)) return hintPage - 1;
    if (pageContainsY(hintPage + 1, clientY)) return hintPage + 1;
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      if (pageContainsY(pageNumber, clientY)) return pageNumber;
    }
    return null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: item.x,
      y: item.y,
      page: item.page,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    event.preventDefault();

    let page = start.page;
    let x = start.x + (event.clientX - start.clientX) / scale;
    let y = start.y + (event.clientY - start.clientY) / scale;

    const pageAtPointer = findPageAt(event.clientY, start.page);
    const startPageElement = getPageElement(start.page);
    if (pageAtPointer && pageAtPointer !== start.page && startPageElement) {
      const targetPageElement = getPageElement(pageAtPointer);
      if (targetPageElement) {
        const startRect = startPageElement.getBoundingClientRect();
        const targetRect = targetPageElement.getBoundingClientRect();
        x = (startRect.left + x * scale - targetRect.left) / scale;
        y = (startRect.top + y * scale - targetRect.top) / scale;
        page = pageAtPointer;
      }
    }

    const pageElement = getPageElement(page);
    if (pageElement) {
      const rect = pageElement.getBoundingClientRect();
      x = clamp(x, 0, Math.max(0, rect.width / scale - item.width));
      y = clamp(y, 0, Math.max(0, rect.height / scale - item.height));
    }

    onChange({ ...item, x, y, page });
    updateEdgeScroll(event.clientY);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragStartRef.current = null;
    setIsDragging(false);
    stopEdgeScroll();
  }

  function handlePageJump(newPage: number) {
    const currentPageElement = getPageElement(item.page);
    const targetPageElement = getPageElement(newPage);
    if (!currentPageElement || !targetPageElement) {
      onChange({ ...item, page: newPage });
      return;
    }

    const currentRect = currentPageElement.getBoundingClientRect();
    const targetRect = targetPageElement.getBoundingClientRect();
    let x = (currentRect.left + item.x * scale - targetRect.left) / scale;
    let y = (currentRect.top + item.y * scale - targetRect.top) / scale;
    x = clamp(x, 0, Math.max(0, targetRect.width / scale - item.width));
    y = clamp(y, 0, Math.max(0, targetRect.height / scale - item.height));
    onChange({ ...item, x, y, page: newPage });

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      const newTopPx = targetPageElement.offsetTop + y * scale;
      const heightPx = item.height * scale;
      scrollContainer.scrollTop =
        newTopPx + heightPx / 2 - scrollContainer.clientHeight / 2;
    }
  }

  return {
    isDragging,
    pageOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePageJump,
  };
}
