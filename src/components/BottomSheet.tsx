import React, { useState, useRef, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../services/telegram';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
  panelId?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  id,
  panelId,
  children,
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number>(420);

  // Measure panel height when open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      setPanelHeight(panelRef.current.offsetHeight || 420);
      setTranslateY(0);
      setIsClosing(false);
      setIsSnapping(false);
      setIsDraggingState(false);
    }
  }, [isOpen]);

  // Smooth dismiss handler
  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    triggerHaptic('light');
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setTranslateY(0);
    }, 220);
  }, [onClose]);

  // Pointer gesture tracking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button / touch
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    const isGrabHandle = Boolean(target?.closest('[data-drag-handle="true"]'));

    // Check if target is inside a scrollable child container
    let scrollParent: HTMLElement | null = null;
    if (!isGrabHandle && panelRef.current && target) {
      let curr: HTMLElement | null = target;
      while (curr && curr !== panelRef.current) {
        const style = window.getComputedStyle(curr);
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          curr.scrollHeight > curr.clientHeight
        ) {
          scrollParent = curr;
          break;
        }
        curr = curr.parentElement;
      }
      if (!scrollParent && panelRef.current) {
        const style = window.getComputedStyle(panelRef.current);
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          panelRef.current.scrollHeight > panelRef.current.clientHeight
        ) {
          scrollParent = panelRef.current;
        }
      }
    }

    const pointerId = e.pointerId;
    const startY = e.clientY;
    const startX = e.clientX;
    let lastY = e.clientY;
    let lastTime = Date.now();
    let velocity = 0;
    let isDragging = false;

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (moveEvt.pointerId !== pointerId) return;

      const currentY = moveEvt.clientY;
      const currentX = moveEvt.clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;

      if (!isDragging) {
        // Small threshold deadzone
        if (Math.abs(deltaY) < 6 && Math.abs(deltaX) < 6) return;

        // If predominantly horizontal, ignore swipe-to-close
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          cleanup();
          return;
        }

        // If moving upward, let normal scrolling happen
        if (deltaY < 0) {
          return;
        }

        // If scrollable content is scrolled down, let content scroll handle it
        if (!isGrabHandle && scrollParent && scrollParent.scrollTop > 0) {
          return;
        }

        // Engage sheet dragging
        isDragging = true;
        setIsDraggingState(true);
      }

      if (isDragging) {
        if (moveEvt.cancelable) {
          moveEvt.preventDefault();
        }

        const now = Date.now();
        const dt = now - lastTime;
        if (dt > 0) {
          velocity = (currentY - lastY) / dt;
          lastY = currentY;
          lastTime = now;
        }

        const clampedDy = Math.max(0, deltaY);
        setTranslateY(clampedDy);
      }
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      if (upEvt.pointerId !== pointerId) return;
      cleanup();

      if (!isDragging) return;

      setIsDraggingState(false);
      const distance = Math.max(0, upEvt.clientY - startY);

      // Fast flick downwards (> 0.45 px/ms) or drag distance >= 90px
      const isVelocityClose = velocity > 0.45 && distance > 25;
      const isDistanceClose = distance >= 90;

      if (isVelocityClose || isDistanceClose) {
        setIsClosing(true);
        triggerHaptic('light');
        setTimeout(() => {
          onClose();
          setIsClosing(false);
          setTranslateY(0);
        }, 220);
      } else {
        // Snap back smoothly
        setIsSnapping(true);
        setTranslateY(0);
        setTimeout(() => {
          setIsSnapping(false);
        }, 250);
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  if (!isOpen) return null;

  // Background overlay opacity interpolation:
  // As sheet is dragged down, backdrop becomes slightly more transparent;
  // when returning, full opacity is restored.
  const overlayProgress = Math.min(1, Math.max(0, translateY / 380));
  const backdropAlpha = isClosing ? 0 : 0.7 * (1 - overlayProgress * 0.75);

  const panelTranslateY = isClosing
    ? `${panelHeight + 60}px`
    : translateY > 0 || isSnapping
    ? `${translateY}px`
    : undefined;

  return (
    <div
      id={id || 'bottom-sheet-backdrop'}
      className="fixed inset-0 z-50 flex items-end justify-center select-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backdropAlpha.toFixed(3)})`,
        backdropFilter: isClosing ? 'blur(0px)' : 'blur(3px)',
        transition: isDraggingState
          ? 'none'
          : 'background-color 0.24s ease, backdrop-filter 0.24s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDraggingState && !isClosing) {
          handleDismiss();
        }
      }}
    >
      <div
        ref={panelRef}
        id={panelId || 'bottom-sheet-panel'}
        onPointerDown={handlePointerDown}
        className={`w-full max-w-md flex flex-col matte-sheet-panel max-h-[88dvh] overflow-y-auto overscroll-contain ${
          translateY === 0 && !isClosing && !isSnapping
            ? 'animate-in fade-in slide-in-from-bottom duration-200'
            : ''
        } ${className}`}
        style={{
          transform: panelTranslateY ? `translateY(${panelTranslateY})` : undefined,
          transition: isDraggingState
            ? 'none'
            : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: isDraggingState ? 'none' : 'pan-y',
          willChange: 'transform',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          paddingTop: '12px',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        {/* Grab Handle at the top of the sheet */}
        <div
          className="flex justify-center pt-1 pb-3 -mt-1 cursor-grab active:cursor-grabbing select-none touch-none"
          data-drag-handle="true"
        >
          <div
            className="rounded-full pointer-events-none"
            style={{
              width: '36px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
            }}
          />
        </div>

        {/* Sheet Content */}
        {children}
      </div>
    </div>
  );
};
