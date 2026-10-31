import * as React from 'react';

const LINES = 18;
const POINTER_RADIUS = 220;

/**
 * Stacked thin wave lines that drift slowly. Hovering swells the waves near the pointer,
 * easing back when it leaves. Renders a single still frame when reduced motion is on.
 */
export function WaveField({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // `target` follows the pointer; `pointer` eases toward it so the swell stays smooth.
    const target = { x: 0, y: 0, strength: 0 };
    const pointer = { x: 0, y: 0, strength: 0 };
    let width = 0;
    let height = 0;
    let frame = 0;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      pointer.x += (target.x - pointer.x) * 0.08;
      pointer.y += (target.y - pointer.y) * 0.08;
      pointer.strength += (target.strength - pointer.strength) * 0.05;

      const gap = height / (LINES + 1);
      for (let line = 1; line <= LINES; line++) {
        const baseY = gap * line;
        // Lines near the vertical centre are fainter so the logo stays clean.
        const centreFade = Math.abs(baseY - height / 2) / (height / 2);
        ctx.strokeStyle = `rgba(23, 23, 23, ${0.04 + centreFade * 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const idle =
            Math.sin(x * 0.006 + time * 0.6 + line * 0.45) * 6 +
            Math.sin(x * 0.013 - time * 0.4 + line * 0.8) * 3;
          const dist = Math.hypot(x - pointer.x, baseY - pointer.y);
          const near = Math.max(0, 1 - dist / POINTER_RADIUS);
          const swell = Math.sin(x * 0.02 - time * 2) * 14 * near * near * pointer.strength;
          const y = baseY + idle + swell;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time += 0.016;
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
      target.strength = 1;
    };
    const onPointerLeave = () => {
      target.strength = 0;
    };

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw();
    });
    observer.observe(canvas);
    resize();
    draw();

    const host = canvas.parentElement ?? canvas;
    if (!reduceMotion) {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
