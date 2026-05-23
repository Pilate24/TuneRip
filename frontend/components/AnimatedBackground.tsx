'use client';

import { useRef, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { BackgroundConfig, AnimatedPreset } from '@/lib/store';

// ─── Canvas animated presets ──────────────────────────────────────────────────

function useCanvasPreset(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  preset: AnimatedPreset,
  enabled: boolean
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Aurora preset ──
    if (preset === 'aurora') {
      const blobs = Array.from({ length: 5 }, (_, i) => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 250 + Math.random() * 250,
        hue: 200 + i * 40,
        speed: 0.002 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2,
      }));

      const draw = () => {
        ctx.fillStyle = '#04041a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        blobs.forEach((b) => {
          b.x += Math.sin(t * b.speed + b.phase) * 0.8;
          b.y += Math.cos(t * b.speed + b.phase * 1.3) * 0.6;
          const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          grad.addColorStop(0, `hsla(${b.hue}, 80%, 55%, 0.18)`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
        t++;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Mesh / flowing gradient preset ──
    else if (preset === 'mesh') {
      const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        const grad = ctx.createLinearGradient(
          w * 0.5 + Math.sin(t * 0.008) * w * 0.4,
          0,
          w * 0.5 + Math.cos(t * 0.006) * w * 0.4,
          h
        );
        grad.addColorStop(0, `hsl(${270 + Math.sin(t * 0.01) * 30}, 70%, 10%)`);
        grad.addColorStop(0.4, `hsl(${300 + Math.cos(t * 0.007) * 20}, 60%, 8%)`);
        grad.addColorStop(0.7, `hsl(${240 + Math.sin(t * 0.009) * 25}, 80%, 6%)`);
        grad.addColorStop(1, `hsl(${200 + Math.cos(t * 0.011) * 20}, 70%, 4%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Overlay shimmering orbs
        for (let i = 0; i < 3; i++) {
          const ox = w * (0.2 + i * 0.3) + Math.sin(t * 0.005 + i) * 80;
          const oy = h * (0.3 + i * 0.2) + Math.cos(t * 0.004 + i) * 60;
          const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 180);
          og.addColorStop(0, `hsla(${260 + i * 30}, 80%, 50%, 0.12)`);
          og.addColorStop(1, 'transparent');
          ctx.fillStyle = og;
          ctx.fillRect(0, 0, w, h);
        }
        t++;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Particles / starfield preset ──
    else if (preset === 'particles') {
      interface Star { x: number; y: number; r: number; speed: number; opacity: number; twinklePhase: number; }
      const stars: Star[] = Array.from({ length: 180 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.5 + Math.random() * 1.5,
        speed: 0.05 + Math.random() * 0.15,
        opacity: 0.3 + Math.random() * 0.7,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
      // A few coloured nebula blobs
      const nebula = [
        { x: 0.25, y: 0.4, hue: 260, r: 220 },
        { x: 0.7, y: 0.6, hue: 200, r: 180 },
        { x: 0.5, y: 0.2, hue: 310, r: 150 },
      ];

      const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#02020f';
        ctx.fillRect(0, 0, w, h);

        // Nebula
        nebula.forEach((n) => {
          const g = ctx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r);
          g.addColorStop(0, `hsla(${n.hue}, 70%, 50%, 0.08)`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        });

        // Stars
        stars.forEach((s) => {
          s.y -= s.speed;
          if (s.y < 0) { s.y = h; s.x = Math.random() * w; }
          const twinkle = 0.5 + 0.5 * Math.sin(t * 0.05 + s.twinklePhase);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${s.opacity * twinkle})`;
          ctx.fill();
        });
        t++;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Waves preset ──
    else if (preset === 'waves') {
      const layers = [
        { amp: 60, period: 0.008, speed: 0.018, hue: 260, alpha: 0.15, yFrac: 0.55 },
        { amp: 40, period: 0.010, speed: 0.024, hue: 300, alpha: 0.12, yFrac: 0.60 },
        { amp: 50, period: 0.006, speed: 0.015, hue: 200, alpha: 0.10, yFrac: 0.65 },
      ];

      const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        // Dark bg
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#040414');
        bg.addColorStop(1, '#0a0120');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        layers.forEach((l) => {
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x++) {
            const y = l.yFrac * h + Math.sin(x * l.period + t * l.speed) * l.amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, l.yFrac * h - l.amp, 0, h);
          g.addColorStop(0, `hsla(${l.hue}, 80%, 55%, ${l.alpha})`);
          g.addColorStop(1, `hsla(${l.hue}, 80%, 30%, 0)`);
          ctx.fillStyle = g;
          ctx.fill();
        });
        t++;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, preset, enabled]);
}

// ─── Gradient CSS helper ──────────────────────────────────────────────────────

function buildGradientCSS(colors: string[], angle: number, animated: boolean) {
  const stops = colors.join(', ');
  if (animated) {
    return {
      background: `linear-gradient(${angle}deg, ${stops})`,
      backgroundSize: '400% 400%',
      animation: 'bg-gradient-shift 12s ease infinite',
    } as React.CSSProperties;
  }
  return { background: `linear-gradient(${angle}deg, ${stops})` } as React.CSSProperties;
}

// ─── Individual layer renderers ───────────────────────────────────────────────

function SolidLayer({ color }: { color: string }) {
  return (
    <div
      style={{ position: 'absolute', inset: 0, background: color, transition: 'background 0.6s ease' }}
    />
  );
}

function GradientLayer({ config }: { config: BackgroundConfig }) {
  const colors = config.gradientColors ?? ['#0a0a0f', '#1a0033', '#000d1a'];
  const angle = config.gradientAngle ?? 135;
  const animated = config.gradientAnimated !== false && config.animationsEnabled !== false;
  const style = buildGradientCSS(colors, angle, animated);
  return <div style={{ position: 'absolute', inset: 0, ...style }} />;
}

function ImageLayer({ src }: { src: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("${src}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

function VideoLayer({ src, enabled }: { src: string; enabled: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (enabled) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [enabled]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      autoPlay={enabled}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none',
      }}
    />
  );
}

function CanvasLayer({ preset, enabled }: { preset: AnimatedPreset; enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvasPreset(ref, preset, enabled);
  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function AnimatedBackground() {
  const config = useStore((s) => s.backgroundConfig);

  const animEnabled = config.animationsEnabled !== false;
  const blur = config.blur ?? 0;
  const brightness = config.brightness ?? 100;
  const dimOpacity = config.dimOpacity ?? 0;

  // Build a stable key so AnimatePresence knows when to crossfade
  const bgKey = useMemo(() => {
    if (config.type === 'solid') return `solid-${config.solidColor}`;
    if (config.type === 'gradient') return `gradient-${config.gradientColors?.join('-')}`;
    if (config.type === 'image') return `image-${config.src?.slice(0, 40)}`;
    if (config.type === 'video') return `video-${config.src?.slice(0, 40)}`;
    return `animated-${config.preset}`;
  }, [config]);

  return (
    <div
      id="app-bg-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transform: 'translateZ(0)', // GPU layer
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={bgKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Brightness CSS filter wrapper */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              filter: brightness < 100 ? `brightness(${brightness}%)` : undefined,
            }}
          >
            {config.type === 'solid' && (
              <SolidLayer color={config.solidColor ?? '#0a0a0f'} />
            )}
            {config.type === 'gradient' && <GradientLayer config={config} />}
            {config.type === 'image' && config.src && (
              <ImageLayer src={config.src} />
            )}
            {config.type === 'video' && config.src && (
              <VideoLayer src={config.src} enabled={animEnabled} />
            )}
            {config.type === 'animated' && config.preset && (
              <CanvasLayer preset={config.preset} enabled={animEnabled} />
            )}
          </div>

          {/* Dim overlay */}
          {dimOpacity > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `rgba(0,0,0,${dimOpacity})`,
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default memo(AnimatedBackground);
