import { useEffect, useRef } from "react";

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30; // twinkling doesn't need 60fps
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // The nebula glow never changes, so paint it once into an offscreen canvas
    // and blit it each frame instead of rebuilding three gradients per frame.
    const nebulaLayer = document.createElement("canvas");
    const nebulae = [
      { x: 0.15, y: 0.25, rx: 340, ry: 200, color: "245,216,0", a: 0.025 },
      { x: 0.82, y: 0.7, rx: 300, ry: 180, color: "68,153,255", a: 0.02 },
      { x: 0.5, y: 0.5, rx: 420, ry: 260, color: "180,74,255", a: 0.013 },
    ];

    const paintNebulae = () => {
      nebulaLayer.width = canvas.width;
      nebulaLayer.height = canvas.height;
      const nctx = nebulaLayer.getContext("2d");
      if (!nctx) return;
      nebulae.forEach((n) => {
        const cx = n.x * canvas.width;
        const cy = n.y * canvas.height;
        const grd = nctx.createRadialGradient(cx, cy, 0, cx, cy, n.rx);
        grd.addColorStop(0, `rgba(${n.color},${n.a})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        nctx.save();
        nctx.scale(1, n.ry / n.rx);
        nctx.fillStyle = grd;
        nctx.beginPath();
        nctx.arc(cx, cy * (n.rx / n.ry), n.rx, 0, Math.PI * 2);
        nctx.fill();
        nctx.restore();
      });
    };

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
    }));

    const draw = (advance: boolean) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(nebulaLayer, 0, 0);
      stars.forEach((st) => {
        if (advance) st.twinkle += 0.03;
        const alpha = st.alpha * (0.55 + 0.45 * Math.sin(st.twinkle));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,240,220,${alpha})`;
        ctx.fill();
      });
    };

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      draw(true);
    };

    const start = () => {
      if (reducedMotion || animId) return;
      animId = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(animId);
      animId = 0;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      paintNebulae();
      draw(false);
    };
    // Don't burn battery in a background tab.
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
