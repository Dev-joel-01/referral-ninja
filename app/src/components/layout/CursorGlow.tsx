import { useEffect, useRef, useState } from 'react';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if touch device
    const checkTouch = window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(checkTouch);
    if (checkTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      const { x: currentX, y: currentY } = positionRef.current;
      const { x: targetX, y: targetY } = targetRef.current;
      
      // Smooth interpolation
      positionRef.current = {
        x: currentX + (targetX - currentX) * 0.1,
        y: currentY + (targetY - currentY) * 0.1
      };
      
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${positionRef.current.x - 250}px, ${positionRef.current.y - 250}px)`;
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Don't render on touch devices
  if (isTouchDevice) {
    return null;
  }

  return (
    <div
      ref={glowRef}
      className="fixed pointer-events-none z-0"
      style={{
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(57, 255, 20, 0.12) 0%, rgba(57, 255, 20, 0.04) 40%, transparent 70%)',
        borderRadius: '50%',
        willChange: 'transform',
      }}
    />
  );
}
