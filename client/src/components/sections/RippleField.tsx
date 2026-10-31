import * as React from 'react';

const SPACING = 26; // grid gap between dots, px
const RIPPLE_SPEED = 260; // px per second
const RIPPLE_LIFE = 2.6; // seconds
const RIPPLE_WIDTH = 70; // thickness of the ring, px
const MAX_RIPPLES = 10;
const IDLE_EVERY = 3.2; // seconds between ambient ripples

type Ripple = { x: number; y: number; born: number; strength: number };

/**
 * A field of points, like a star map, that ripples like space-time. Moving the pointer
 * sends rings outward that push the points aside and brighten them; ambient ripples keep
 * it alive when idle. Renders a single still frame when reduced motion is on.
 */
export function RippleField({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ripples: Ripple[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastIdle = 0;
    let lastSpawn = { x: -9999, y: -9999, t: 0 };
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (x: number, y: number, strength: number) => {
      ripples.push({ x, y, born: now(), strength });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    };

    const draw = () => {
      const t = now();
      ctx.clearRect(0, 0, width, height);

      if (!reduceMotion && t - lastIdle > IDLE_EVERY) {
        lastIdle = t;
        spawn(width * (0.2 + Math.random() * 0.6), height * (0.2 + Math.random() * 0.6), 0.7);
      }
      while (ripples.length && t - ripples[0].born > RIPPLE_LIFE) ripples.shift();

      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(cx, cy);

      for (let gx = SPACING / 2; gx < width; gx += SPACING) {
        for (let gy = SPACING / 2; gy < height; gy += SPACING) {
          let dx = 0;
          let dy = 0;
          let glow = 0;

          for (const r of ripples) {
            const age = t - r.born;
            const radius = age * RIPPLE_SPEED;
            const ox = gx - r.x;
            const oy = gy - r.y;
            const dist = Math.hypot(ox, oy) || 1;
            const band = (dist - radius) / RIPPLE_WIDTH;
            if (Math.abs(band) > 1.5) continue;
            const fade = (1 - age / RIPPLE_LIFE) * r.strength;
            // One crest and trough across the ring; points ride it outward then settle.
            const wave = Math.sin(band * Math.PI) * Math.exp(-band * band) * fade;
            dx += (ox / dist) * wave * 9;
            dy += (oy / dist) * wave * 9;
            glow += Math.exp(-band * band * 2) * fade;
          }

          // Points fade toward the centre so the logo has clear space.
          const edge = Math.min(1, Math.hypot(gx - cx, gy - cy) / maxR + 0.25);
          const alpha = Math.min(0.9, (0.28 + glow * 0.6) * edge);
          const size = 1.2 + Math.min(glow, 1.2) * 1.2;

          ctx.fillStyle = `rgba(23, 23, 23, ${alpha})`;
          ctx.beginPath();
          ctx.arc(gx + dx, gy + dy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const t = now();
      // Throttle so a moving cursor leaves a trail of rings, not a smear.
      if (t - lastSpawn.t > 0.18 && Math.hypot(x - lastSpawn.x, y - lastSpawn.y) > 36) {
        spawn(x, y, 1);
        lastSpawn = { x, y, t };
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      spawn(event.clientX - rect.left, event.clientY - rect.top, 1.4);
    };

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw();
    });
    observer.observe(canvas);
    resize();
    if (!reduceMotion) spawn(width / 2, height / 2, 1);
    draw();

    const host = canvas.parentElement ?? canvas;
    if (!reduceMotion) {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerdown', onPointerDown);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
