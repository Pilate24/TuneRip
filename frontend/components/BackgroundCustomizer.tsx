'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { BackgroundConfig, BackgroundType, AnimatedPreset } from '@/lib/store';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Palette,
  Sparkles,
  RotateCcw,
  Check,
  ChevronDown,
  Sun,
  Layers,
  ZapOff,
  Zap,
} from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';

// ─── Presets data ─────────────────────────────────────────────────────────────

interface PresetDef {
  id: string;
  label: string;
  config: BackgroundConfig;
  preview: string; // inline CSS for the card preview
}

const PRESETS: PresetDef[] = [
  {
    id: 'default',
    label: 'Default',
    config: {
      type: 'gradient',
      gradientColors: ['#0a0a0f', '#1a0033', '#000d1a'],
      gradientAngle: 135,
      gradientAnimated: true,
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(135deg, #0a0a0f, #1a0033, #000d1a)',
  },
  {
    id: 'neon',
    label: 'Neon Burst',
    config: {
      type: 'gradient',
      gradientColors: ['#7c3aed', '#ec4899', '#06b6d4'],
      gradientAngle: 135,
      gradientAnimated: true,
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(135deg, #7c3aed, #ec4899, #06b6d4)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    config: {
      type: 'gradient',
      gradientColors: ['#0c1445', '#0d4b6e', '#0891b2'],
      gradientAngle: 160,
      gradientAnimated: true,
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(160deg, #0c1445, #0d4b6e, #0891b2)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    config: {
      type: 'gradient',
      gradientColors: ['#0f0f1a', '#1e1b4b', '#312e81'],
      gradientAngle: 120,
      gradientAnimated: true,
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(120deg, #0f0f1a, #1e1b4b, #312e81)',
  },
  {
    id: 'rose',
    label: 'Rose Gold',
    config: {
      type: 'gradient',
      gradientColors: ['#1a0010', '#4a0020', '#881337'],
      gradientAngle: 145,
      gradientAnimated: true,
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(145deg, #1a0010, #4a0020, #881337)',
  },
  {
    id: 'forest',
    label: 'Forest',
    config: {
      type: 'gradient',
      gradientColors: ['#052e16', '#14532d', '#166534'],
      gradientAngle: 130,
      gradientAnimated: true,
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(130deg, #052e16, #14532d, #166534)',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    config: {
      type: 'animated', preset: 'aurora',
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(135deg, #04041a, #0a1628, #0d2040)',
  },
  {
    id: 'mesh',
    label: 'Purple Mesh',
    config: {
      type: 'animated', preset: 'mesh',
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(135deg, #1a0033, #2d1b69, #0f0f1a)',
  },
  {
    id: 'particles',
    label: 'Starfield',
    config: {
      type: 'animated', preset: 'particles',
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'radial-gradient(ellipse at 50% 50%, #12063a 0%, #02020f 60%)',
  },
  {
    id: 'waves',
    label: 'Waves',
    config: {
      type: 'animated', preset: 'waves',
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: true,
    },
    preview: 'linear-gradient(180deg, #040414, #0a0120)',
  },
  {
    id: 'pure-black',
    label: 'Abyss',
    config: {
      type: 'solid', solidColor: '#000000',
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: false,
    },
    preview: '#000000',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    config: {
      type: 'solid', solidColor: '#0d0d0d',
      blur: 0, brightness: 100, dimOpacity: 0, animationsEnabled: false,
    },
    preview: '#0d0d0d',
  },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: BackgroundType; label: string; icon: React.ReactNode }[] = [
  { id: 'gradient', label: 'Gradient', icon: <Palette size={15} /> },
  { id: 'animated', label: 'Animated', icon: <Sparkles size={15} /> },
  { id: 'solid', label: 'Solid', icon: <Layers size={15} /> },
  { id: 'image', label: 'Image', icon: <ImageIcon size={15} /> },
  { id: 'video', label: 'Video', icon: <Video size={15} /> },
];

// ─── Preset thumbnail colors ──────────────────────────────────────────────────

const SOLID_SWATCHES = [
  '#000000', '#0d0d0d', '#0a0a0f', '#0f172a', '#1e1b4b',
  '#14532d', '#450a0a', '#431407', '#1a1a2e', '#0c0a09',
  '#042f2e', '#082f49', '#2e1065', '#4a044e', '#450a0a',
  '#1c1917',
];

const GRADIENT_PRESETS = [
  { label: 'Neon', colors: ['#7c3aed', '#ec4899', '#06b6d4'], angle: 135 },
  { label: 'Sunset', colors: ['#7f1d1d', '#b45309', '#7c3aed'], angle: 120 },
  { label: 'Arctic', colors: ['#0c4a6e', '#0e7490', '#38bdf8'], angle: 160 },
  { label: 'Emerald', colors: ['#052e16', '#14532d', '#4ade80'], angle: 130 },
  { label: 'Candy', colors: ['#831843', '#9f1239', '#f472b6'], angle: 145 },
  { label: 'Cosmos', colors: ['#0f0f1a', '#1e1b4b', '#7c3aed'], angle: 120 },
  { label: 'Plasma', colors: ['#4a044e', '#701a75', '#a21caf'], angle: 135 },
  { label: 'Custom', colors: ['#7c3aed', '#ec4899'], angle: 135 },
];

// ─── Mini Slider component ────────────────────────────────────────────────────

function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  icon,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: React.ReactNode;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-light)', minWidth: 38, textAlign: 'right' }}>
          {value}{unit}
        </span>
      </div>
      <Slider.Root
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', userSelect: 'none', touchAction: 'none', height: 20 }}
      >
        <Slider.Track
          style={{
            background: 'var(--bg-card)',
            position: 'relative',
            flexGrow: 1,
            borderRadius: 9999,
            height: 5,
            border: '1px solid var(--border)',
          }}
        >
          <Slider.Range
            style={{
              position: 'absolute',
              background: 'var(--gradient-1)',
              borderRadius: 9999,
              height: '100%',
            }}
          />
        </Slider.Track>
        <Slider.Thumb
          style={{
            display: 'block',
            width: 18,
            height: 18,
            borderRadius: 9999,
            background: 'white',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 0 3px var(--accent-glow)',
            cursor: 'pointer',
            outline: 'none',
            transition: 'box-shadow 0.15s ease',
          }}
        />
      </Slider.Root>
    </div>
  );
}

// ─── Drag & drop upload zone ──────────────────────────────────────────────────

function DropZone({
  accept,
  onFile,
  label,
  hint,
  icon,
}: {
  accept: string;
  onFile: (dataUrl: string) => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) onFile(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '32px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'rgba(124,58,237,0.08)' : 'var(--bg-glass)',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: dragging ? 'var(--accent-light)' : 'var(--text-primary)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</p>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
      }} />
    </div>
  );
}

// ─── Live Mini Preview ────────────────────────────────────────────────────────

function MiniPreview({ config }: { config: BackgroundConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (config.type !== 'animated' || !config.animationsEnabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 200;
    canvas.height = 110;

    let t = 0;
    const preset = config.preset ?? 'aurora';

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      if (preset === 'aurora') {
        ctx.fillStyle = '#04041a';
        ctx.fillRect(0, 0, w, h);
        const blobs = [
          { x: w * 0.3, y: h * 0.5, hue: 260, r: 60 },
          { x: w * 0.7, y: h * 0.4, hue: 300, r: 50 },
          { x: w * 0.5, y: h * 0.7, hue: 200, r: 45 },
        ];
        blobs.forEach((b) => {
          const ox = b.x + Math.sin(t * 0.02) * 10;
          const oy = b.y + Math.cos(t * 0.015) * 8;
          const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, b.r);
          g.addColorStop(0, `hsla(${b.hue}, 80%, 55%, 0.25)`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        });
      } else if (preset === 'particles') {
        ctx.fillStyle = '#02020f';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) {
          const sx = ((i * 37 + t * 0.2) % w);
          const sy = ((i * 61 - t * 0.3 + h) % h);
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8 + (i % 3) * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.sin(t * 0.05 + i)})`;
          ctx.fill();
        }
      } else {
        // mesh / waves — just a coloured gradient for preview
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, `hsl(${270 + Math.sin(t * 0.02) * 20}, 70%, 10%)`);
        g.addColorStop(1, `hsl(${240}, 80%, 6%)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      t++;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [config.type, config.preset, config.animationsEnabled]);

  const previewStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '100%',
      height: '110px',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid var(--border)',
    };

    if (config.type === 'solid') {
      return { ...base, background: config.solidColor ?? '#0a0a0f' };
    }
    if (config.type === 'gradient') {
      const colors = config.gradientColors ?? ['#0a0a0f', '#1a0033'];
      return { ...base, background: `linear-gradient(${config.gradientAngle ?? 135}deg, ${colors.join(', ')})` };
    }
    if (config.type === 'image' && config.src) {
      return {
        ...base,
        backgroundImage: `url("${config.src}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (config.type === 'video' && config.src) {
      return { ...base, background: '#02020f' };
    }
    return { ...base, background: '#04041a' };
  }, [config]);

  const showCanvas = config.type === 'animated';

  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
        Live Preview
      </p>
      <div style={previewStyle}>
        {showCanvas && (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}
        {config.type === 'video' && config.src && (
          <video
            src={config.src}
            muted
            loop
            playsInline
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {/* Overlays */}
        {(config.dimOpacity ?? 0) > 0 && (
          <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${config.dimOpacity})` }} />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Preview
        </div>
      </div>
    </div>
  );
}

// ─── Main BackgroundCustomizer panel ─────────────────────────────────────────

export default function BackgroundCustomizer({ onClose }: { onClose: () => void }) {
  const { backgroundConfig, setBackground, resetBackground } = useStore();
  const [draft, setDraft] = useState<BackgroundConfig>({ ...backgroundConfig });
  const [activeTab, setActiveTab] = useState<BackgroundType>(backgroundConfig.type);
  const [customGradientColors, setCustomGradientColors] = useState<string[]>(
    backgroundConfig.gradientColors ?? ['#7c3aed', '#ec4899']
  );

  // Sync tab with draft type
  useEffect(() => {
    setDraft((d) => ({ ...d, type: activeTab }));
  }, [activeTab]);

  const updateDraft = useCallback((patch: Partial<BackgroundConfig>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const handleApply = () => {
    setBackground(draft);
    onClose();
  };

  const handleReset = () => {
    resetBackground();
    onClose();
  };

  const handlePresetClick = (preset: PresetDef) => {
    setDraft({ ...preset.config });
    setActiveTab(preset.config.type);
    if (preset.config.gradientColors) setCustomGradientColors(preset.config.gradientColors);
  };

  // ── Tab panels ──────────────────────────────────────────────────────────────

  const renderGradientTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Preset gradients grid */}
      <div>
        <p style={sectionLabel}>Gradient Presets</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {GRADIENT_PRESETS.map((gp) => (
            <motion.button
              key={gp.label}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                const cols = gp.colors;
                setCustomGradientColors(cols);
                updateDraft({ type: 'gradient', gradientColors: cols, gradientAngle: gp.angle });
              }}
              style={{
                height: 52,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: `linear-gradient(${gp.angle}deg, ${gp.colors.join(', ')})`,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              title={gp.label}
            />
          ))}
        </div>
      </div>

      {/* Custom color pickers */}
      <div>
        <p style={sectionLabel}>Custom Colors</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {customGradientColors.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <input
                type="color"
                value={c}
                onChange={(e) => {
                  const next = [...customGradientColors];
                  next[i] = e.target.value;
                  setCustomGradientColors(next);
                  updateDraft({ gradientColors: next });
                }}
                style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'none' }}
              />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stop {i + 1}</span>
            </div>
          ))}
          {customGradientColors.length < 5 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const next = [...customGradientColors, '#ffffff'];
                setCustomGradientColors(next);
                updateDraft({ gradientColors: next });
              }}
              style={{ width: 40, height: 40, borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--bg-glass)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}
            >+</motion.button>
          )}
          {customGradientColors.length > 2 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const next = customGradientColors.slice(0, -1);
                setCustomGradientColors(next);
                updateDraft({ gradientColors: next });
              }}
              style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#ef4444', fontSize: 20 }}
            >−</motion.button>
          )}
        </div>
      </div>

      {/* Angle */}
      <RangeSlider
        label="Angle"
        value={draft.gradientAngle ?? 135}
        min={0} max={360} step={5} unit="°"
        icon={<ChevronDown size={13} />}
        onChange={(v) => updateDraft({ gradientAngle: v })}
      />

      {/* Animated toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} /> Animate gradient
        </span>
        <ToggleSwitch
          checked={draft.gradientAnimated !== false}
          onChange={(v) => updateDraft({ gradientAnimated: v })}
        />
      </div>
    </div>
  );

  const renderAnimatedTab = () => {
    const animatedPresets: { id: AnimatedPreset; label: string; preview: string; desc: string }[] = [
      { id: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg, #04041a, #0a1628)', desc: 'Dreamy northern lights' },
      { id: 'mesh', label: 'Purple Mesh', preview: 'linear-gradient(135deg, #1a0033, #2d1b69)', desc: 'Flowing colour mesh' },
      { id: 'particles', label: 'Starfield', preview: 'radial-gradient(ellipse, #12063a, #02020f)', desc: 'Drifting star particles' },
      { id: 'waves', label: 'Waves', preview: 'linear-gradient(180deg, #040414, #0a0120)', desc: 'Undulating wave layers' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={sectionLabel}>Animation Presets</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {animatedPresets.map((p) => {
            const isSelected = draft.preset === p.id && draft.type === 'animated';
            return (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateDraft({ type: 'animated', preset: p.id })}
                style={{
                  height: 80,
                  borderRadius: 12,
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: p.preview,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isSelected ? '0 0 0 3px var(--accent-glow)' : 'none',
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="white" />
                  </div>
                )}
                <p style={{ fontSize: 12, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{p.label}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{p.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSolidTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={sectionLabel}>Color Swatches</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
          {SOLID_SWATCHES.map((c) => {
            const isSelected = draft.solidColor === c;
            return (
              <motion.button
                key={c}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => updateDraft({ type: 'solid', solidColor: c })}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 8,
                  background: c,
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 0 3px var(--accent-glow)' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
      <div>
        <p style={sectionLabel}>Custom Color</p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="color"
            value={draft.solidColor ?? '#0a0a0f'}
            onChange={(e) => updateDraft({ type: 'solid', solidColor: e.target.value })}
            style={{ width: 56, height: 48, border: 'none', borderRadius: 10, cursor: 'pointer', padding: 2, background: 'none' }}
          />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{draft.solidColor ?? '#0a0a0f'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click to pick any colour</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderImageTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DropZone
        accept="image/*"
        icon={<ImageIcon size={28} style={{ color: 'var(--accent-light)' }} />}
        label="Drop image here or click to browse"
        hint="PNG, JPG, WEBP, GIF supported"
        onFile={(url) => updateDraft({ type: 'image', src: url })}
      />
      {draft.src && draft.type === 'image' && (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 100 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateDraft({ src: undefined })}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'white', fontSize: 11, cursor: 'pointer' }}
          >
            Remove
          </motion.button>
        </div>
      )}
    </div>
  );

  const renderVideoTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DropZone
        accept="video/*"
        icon={<Video size={28} style={{ color: 'var(--accent-light)' }} />}
        label="Drop video here or click to browse"
        hint="MP4, WEBM, MOV — keep under 50 MB for performance"
        onFile={(url) => updateDraft({ type: 'video', src: url })}
      />
      {draft.src && draft.type === 'video' && (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 100 }}>
          <video src={draft.src} muted loop playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateDraft({ src: undefined })}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'white', fontSize: 11, cursor: 'pointer' }}
          >
            Remove
          </motion.button>
        </div>
      )}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        💡 <strong style={{ color: '#f59e0b' }}>Performance tip:</strong> Video is hardware-accelerated and looped seamlessly. Use short 10–30 second clips for best results.
      </div>
    </div>
  );

  // ── Overlay adjustments ─────────────────────────────────────────────────────

  const renderAdjustments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <MiniPreview config={draft} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', borderRadius: 14, background: 'var(--bg-glass)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
        <p style={{ ...sectionLabel, marginBottom: 0 }}>Overlay Adjustments</p>

        <RangeSlider
          label="Background Blur"
          value={draft.blur ?? 0}
          min={0} max={20} step={1} unit="px"
          icon={<Sun size={13} />}
          onChange={(v) => updateDraft({ blur: v })}
        />
        <RangeSlider
          label="Brightness"
          value={draft.brightness ?? 100}
          min={30} max={100} step={1} unit="%"
          icon={<Sun size={13} />}
          onChange={(v) => updateDraft({ brightness: v })}
        />
        <RangeSlider
          label="Dim Overlay"
          value={Math.round((draft.dimOpacity ?? 0) * 100)}
          min={0} max={80} step={1} unit="%"
          icon={<Layers size={13} />}
          onChange={(v) => updateDraft({ dimOpacity: v / 100 })}
        />

        {/* Animations toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {draft.animationsEnabled !== false ? <Zap size={13} /> : <ZapOff size={13} />}
            Animations
          </span>
          <ToggleSwitch
            checked={draft.animationsEnabled !== false}
            onChange={(v) => updateDraft({ animationsEnabled: v })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          borderRadius: 24,
          background: 'rgba(14,14,22,0.96)',
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(30px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Palette size={20} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Customize Background</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Personalize your TuneRip experience</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-glass)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </motion.button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', flex: 1, padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Left: Presets + tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Preset cards */}
              <div>
                <p style={sectionLabel}>Quick Presets</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {PRESETS.map((p) => (
                    <motion.button
                      key={p.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handlePresetClick(p)}
                      style={{
                        height: 56,
                        borderRadius: 10,
                        border: draft.type === p.config.type && (
                          p.config.type === 'animated' ? draft.preset === p.config.preset :
                          p.config.type === 'solid' ? draft.solidColor === p.config.solidColor :
                          p.config.gradientColors?.join() === draft.gradientColors?.join()
                        ) ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: p.preview.startsWith('#') ? p.preview : undefined,
                        backgroundImage: p.preview.startsWith('l') || p.preview.startsWith('r') ? p.preview : undefined,
                        cursor: 'pointer',
                        position: 'relative',
                        boxShadow: draft.type === p.config.type ? '0 0 0 3px var(--accent-glow)' : 'none',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '6px 8px',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.9)', textAlign: 'left' }}>{p.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Type tabs */}
              <div>
                <p style={sectionLabel}>Background Type</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {TABS.map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: 10,
                        border: activeTab === tab.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: activeTab === tab.id ? 'rgba(124,58,237,0.15)' : 'var(--bg-glass)',
                        color: activeTab === tab.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.icon} {tab.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === 'gradient' && renderGradientTab()}
                  {activeTab === 'animated' && renderAnimatedTab()}
                  {activeTab === 'solid' && renderSolidTab()}
                  {activeTab === 'image' && renderImageTab()}
                  {activeTab === 'video' && renderVideoTab()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: Preview + adjustments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {renderAdjustments()}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <RotateCcw size={14} /> Reset Default
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: 12, border: 'none', background: 'var(--gradient-1)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px var(--accent-glow)' }}
          >
            <Check size={15} /> Apply Background
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? 'var(--gradient-1)' : 'var(--bg-card)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s ease',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
      />
    </motion.button>
  );
}

// ─── Shared style helper ──────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '8px',
};
