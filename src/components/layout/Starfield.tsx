import { useEffect, useRef } from "react";

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
    }));

    const nebulae = [
      { x: 0.15, y: 0.25, rx: 340, ry: 200, color: "245,216,0", a: 0.025 },
      { x: 0.82, y: 0.7, rx: 300, ry: 180, color: "68,153,255", a: 0.02 },
      { x: 0.5, y: 0.5, rx: 420, ry: 260, color: "180,74,255", a: 0.013 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      nebulae.forEach((n) => {
        const grd = ctx.createRadialGradient(
          n.x * canvas.width,
          n.y * canvas.height,
          0,
          n.x * canvas.width,
          n.y * canvas.height,
          n.rx
        );
        grd.addColorStop(0, `rgba(${n.color},${n.a})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.scale(1, n.ry / n.rx);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(n.x * canvas.width, n.y * canvas.height * (n.rx / n.ry), n.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      stars.forEach((s) => {
        s.twinkle += 0.018;
        const a = s.alpha * (0.55 + 0.45 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,240,220,${a})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
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
