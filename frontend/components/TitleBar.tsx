'use client';
import { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { setApiBase } from '@/lib/api';
import { useStore } from '@/lib/store';

export default function TitleBar() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsDesktop(true);
      
      // Fetch dynamic port and configure api + socket
      (window as any).electronAPI.getBackendPort().then((port: number) => {
        if (port) {
          const url = `http://localhost:${port}`;
          setApiBase(url);
          // To make sure socket reconnects to the new port, we can dispatch an event
          window.dispatchEvent(new CustomEvent('backend-port-ready', { detail: url }));
        }
      }).catch(console.error);
    }
  }, []);

  if (!isDesktop) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-8 flex justify-between items-center z-50 bg-black/40 backdrop-blur-md border-b border-white/5 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center px-3 gap-2">
        <span className="text-xs font-semibold text-white/80">TuneRip</span>
      </div>
      
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={() => (window as any).electronAPI.windowMinimize()} 
          className="h-full px-4 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => (window as any).electronAPI.windowMaximize()} 
          className="h-full px-4 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={() => (window as any).electronAPI.windowClose()} 
          className="h-full px-4 text-white/60 hover:text-white hover:bg-red-500 transition-colors flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
