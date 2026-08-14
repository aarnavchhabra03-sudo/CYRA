'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Bookmark,
  GitFork,
  Bot,
  BookOpen,
  TrendingUp,
  Settings,
  Command,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  category: 'RESEARCH' | 'LEARNING' | 'SYSTEM';
  icon: React.ElementType;
  href: string;
  shortcut?: string;
}

const COMMANDS: CommandItem[] = [
  { id: 'search-research', label: 'Search research', category: 'RESEARCH', icon: Search, href: '/research', shortcut: 'S' },
  { id: 'new-research', label: 'New research', category: 'RESEARCH', icon: Plus, href: '/research', shortcut: 'N' },
  { id: 'open-library', label: 'Open library', category: 'RESEARCH', icon: Bookmark, href: '/research/library', shortcut: 'L' },
  { id: 'open-knowledge-graph', label: 'Open knowledge graph', category: 'RESEARCH', icon: GitFork, href: '/research/intelligence', shortcut: 'G' },
  { id: 'ask-ai-tutor', label: 'Ask AI Tutor', category: 'LEARNING', icon: Bot, href: '/tutor', shortcut: 'T' },
  { id: 'open-courses', label: 'Open courses', category: 'LEARNING', icon: BookOpen, href: '/courses', shortcut: 'C' },
  { id: 'open-progress', label: 'Open progress', category: 'LEARNING', icon: TrendingUp, href: '/progress', shortcut: 'P' },
  { id: 'open-settings', label: 'Open settings', category: 'SYSTEM', icon: Settings, href: '/settings', shortcut: ',' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on search text
  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Global Keyboard Event Listener for Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when palette opens & reset selection
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside open palette (Up/Down Arrow & Enter)
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  };

  const executeCommand = (cmd: CommandItem) => {
    setIsOpen(false);
    router.push(cmd.href);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-md animate-os-fade"
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--cyra-panel)] border border-[var(--cyra-border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--cyra-text)] font-sans"
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-[var(--cyra-border)] flex items-center gap-3 bg-[var(--cyra-panel)]">
          <Command className="w-4 h-4 text-[var(--cyra-cyan)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-xs text-[var(--cyra-text)] placeholder-[var(--cyra-text-muted)] focus:outline-none font-sans"
          />
          <kbd className="os-badge os-badge-muted text-[9px] uppercase">ESC</kbd>
        </div>

        {/* Command List Container */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 bg-[var(--cyra-bg)]">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-xs ${
                    isSelected
                      ? 'bg-[var(--pastel-blue-bg)] text-[var(--pastel-blue-text)] border-l-3 border-l-[var(--cyra-cyan)] pl-2.5 font-bold'
                      : 'text-[var(--cyra-text-secondary)] hover:text-[var(--cyra-text)] hover:bg-[var(--cyra-card-soft)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[var(--cyra-cyan)]' : 'text-[var(--cyra-text-muted)]'}`} />
                    <span className="font-sans font-medium text-[var(--cyra-text)]">{cmd.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="os-badge os-badge-muted text-[9px] uppercase">{cmd.category}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] font-mono text-[var(--cyra-text-muted)] bg-[var(--cyra-card-soft)] px-1.5 py-0.5 rounded border border-[var(--cyra-border)]">
                        ⌘{cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-[var(--cyra-text-muted)] font-mono">
              No matching commands found.
            </div>
          )}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="p-3 bg-[var(--cyra-panel)] border-t border-[var(--cyra-border)] flex items-center justify-between text-[10px] text-[var(--cyra-text-muted)] font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ NAVIGATE</span>
            <span>•</span>
            <span>↵ SELECT</span>
            <span>•</span>
            <span>ESC EXIT</span>
          </div>

          <div className="flex items-center gap-1 text-[var(--cyra-cyan)] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>CYRA OS COMMAND PALETTE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
