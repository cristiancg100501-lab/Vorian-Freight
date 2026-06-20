"use client";

import { useEffect, useRef } from "react";

// CSS-only animated background - replaces the heavy Mapbox WebGL version.
// Renders a grid of faint "route lines" using canvas 2D (no WebGL, no API calls)
// and animates tiny dots traveling along them at ~24fps.
// CPU: ~2-5% vs 30-50% for the Mapbox version.

export function LoginMap({ theme }: { theme?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = theme !== "light";

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate a random grid of "streets"
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const numLines = 28;
    type Line = { x1: number; y1: number; x2: number; y2: number };
    const lines: Line[] = [];

    const regenerateLines = () => {
      lines.length = 0;
      for (let i = 0; i < numLines; i++) {
        const isHorizontal = Math.random() > 0.5;
        if (isHorizontal) {
          const y = Math.random() * H();
          lines.push({ x1: 0, y1: y, x2: W(), y2: y + (Math.random() - 0.5) * 80 });
        } else {
          const x = Math.random() * W();
          lines.push({ x1: x, y1: 0, x2: x + (Math.random() - 0.5) * 80, y2: H() });
        }
      }
    };
    regenerateLines();

    // Particles that travel along lines
    const particles = lines.map((line) => ({
      line,
      t: Math.random(),
      speed: 0.0008 + Math.random() * 0.0015,
      trail: [] as { x: number; y: number }[],
    }));

    const lineColor = isDark ? "rgba(255,100,130,0.08)" : "rgba(200,40,80,0.06)";
    const dotColor = isDark ? "#F5718E" : "#C52850";
    const trailLength = 6;

    // Throttle to 24fps
    const fpsInterval = 1000 / 24;
    let lastTime = 0;

    const draw = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(draw);

      const elapsed = timestamp - lastTime;
      if (elapsed < fpsInterval) return;
      lastTime = timestamp - (elapsed % fpsInterval);

      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);

      // Draw grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      });

      // Draw particles + trails
      particles.forEach((p) => {
        p.t += p.speed;
        if (p.t >= 1) p.t = 0;

        const x = p.line.x1 + (p.line.x2 - p.line.x1) * p.t;
        const y = p.line.y1 + (p.line.y2 - p.line.y1) * p.t;

        p.trail.unshift({ x, y });
        if (p.trail.length > trailLength) p.trail.pop();

        p.trail.forEach((pos, idx) => {
          const alpha = (1 - idx / trailLength) * (idx === 0 ? 0.9 : 0.4);
          const radius = idx === 0 ? 2 : 1.2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle =
            dotColor +
            Math.round(alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.fill();
        });
      });
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.7 }}
    />
  );
}
