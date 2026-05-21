'use client';
import { useState } from 'react';

const QUALITIES = [
  { value: '128', label: '128kbps', desc: 'Standard' },
  { value: '192', label: '192kbps', desc: 'High' },
  { value: '320', label: '320kbps', desc: 'Lossless' },
];

interface QualitySelectorProps {
  value: string;
  onChange: (q: string) => void;
}

export default function QualitySelector({ value, onChange }: QualitySelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {QUALITIES.map((q) => (
        <button
          key={q.value}
          onClick={() => onChange(q.value)}
          className={`quality-badge ${value === q.value ? 'active' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 16px', gap: '2px' }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700 }}>{q.label}</span>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>{q.desc}</span>
        </button>
      ))}
    </div>
  );
}
