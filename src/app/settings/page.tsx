'use client';

import React from 'react';
import { Settings, Shield, Sliders, Database, AlertCircle, Palette, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const configs = [
    { title: 'Default LLM Model', val: 'Gemini 1.5 Flash (Synthesizer Engine)', icon: Sliders },
    { title: 'Data Cache Storage', val: 'IndexedDB (Local Mock Data)', icon: Database },
    { title: 'Security Tier', val: 'Secure HTTPS Pipeline', icon: Shield }
  ];

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-6 font-sans">
      <div>
        <div className="inline-flex items-center gap-2 text-[#60758A] mb-2">
          <Settings className="w-5 h-5 text-[#149FC4]" />
          <span className="text-[10px] font-mono tracking-wider font-bold uppercase">User Control Console</span>
        </div>
        <h2 className="text-2xl font-bold text-[var(--cyra-text)] tracking-tight">System Configuration</h2>
        <p className="text-xs text-[var(--cyra-text-secondary)] mt-1">Adjust preferences, interface styling variables, and integration keys.</p>
      </div>

      {/* Theme Selection Block */}
      <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 shadow-[0_4px_18px_rgba(40,70,100,0.05)]">
        <div className="flex items-start gap-3">
          <Palette className="w-5 h-5 text-[#7770D8] mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[var(--cyra-text)]">Appearance</h3>
            <p className="text-[11px] text-[var(--cyra-text-secondary)] mt-0.5">Customize the visual style of your CYRA learning workspace.</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--cyra-border)]">
          <span className="text-xs font-bold text-[var(--cyra-text-secondary)]">Theme Preference</span>
          <div className="flex p-1 rounded-xl bg-[var(--cyra-bg)] border border-[var(--cyra-border)] gap-1">
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#172033] text-white shadow-md'
                  : 'text-[var(--cyra-text-muted)] hover:text-[var(--cyra-text-secondary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-[#DCEEFF] text-[#286B91] shadow-md border border-[#C5DFF2]'
                  : 'text-[var(--cyra-text-muted)] hover:text-[var(--cyra-text-secondary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
          </div>
        </div>
      </div>

      {/* Config Items */}
      <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-1 shadow-[0_4px_18px_rgba(40,70,100,0.05)]">
        {configs.map((config, idx) => {
          const Icon = config.icon;
          return (
            <div key={idx} className="flex justify-between items-center py-3 border-b border-[var(--cyra-border)] last:border-b-0">
              <div className="flex items-center gap-2 text-xs text-[var(--cyra-text)]">
                <Icon className="w-4 h-4 text-[var(--cyra-text-secondary)]" />
                <span className="font-medium">{config.title}</span>
              </div>
              <span className="text-xs font-mono text-[#149FC4] font-bold">{config.val}</span>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-[#DCEEFF] border border-[#C5DFF2] rounded-xl text-[10px] font-mono text-[#286B91] flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[#149FC4] flex-shrink-0" />
        <span>Supabase Integration settings (Auth keys and DB links) will be set up in subsequent project steps.</span>
      </div>
    </div>
  );
}
