import { useRef, useEffect } from 'react';

export function useGrabScroll(enabled: boolean = false) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;
    let momentumID: number;
    let hasDragged = false;

    const handleMouseDown = (e: MouseEvent) => {
      // Left click only
      if (e.button !== 0) return;

      // Exclude interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('a') ||
        target.closest('textarea') ||
        target.closest('[role="button"]') ||
        target.closest('label')
      ) {
        return;
      }

      isDown = true;
      hasDragged = false;
      container.classList.add('cursor-grabbing');
      container.classList.remove('cursor-grab');
      container.style.userSelect = 'none';

      startX = e.pageX - container.offsetLeft;
      startY = e.pageY - container.offsetTop;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;

      cancelAnimationFrame(momentumID);
    };

    const handleMouseLeaveOrUp = () => {
      if (!isDown) return;
      isDown = false;
      container.classList.remove('cursor-grabbing');
      container.classList.add('cursor-grab');
      container.style.userSelect = '';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = x - startX;
      const walkY = y - startY;

      // Set hasDragged to true if mouse moved more than 5px in any direction
      if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
        hasDragged = true;
      }

      e.preventDefault();

      // requestAnimationFrame for smooth scrolling updates
      cancelAnimationFrame(momentumID);
      momentumID = requestAnimationFrame(() => {
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
      });
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
        hasDragged = false; // Reset
      }
    };

    // Add initial cursor style
    container.classList.add('cursor-grab');

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeaveOrUp);
    container.addEventListener('mouseup', handleMouseLeaveOrUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClickCapture, true); // true = use capture phase

    return () => {
      cancelAnimationFrame(momentumID);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeaveOrUp);
      container.removeEventListener('mouseup', handleMouseLeaveOrUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClickCapture, true);
      container.classList.remove('cursor-grab', 'cursor-grabbing');
      container.style.userSelect = '';
    };
  }, [enabled]);

  return containerRef;
}
