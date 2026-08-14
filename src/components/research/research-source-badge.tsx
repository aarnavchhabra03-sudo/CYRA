'use client';

import React from 'react';
import { SourceType, EvidenceLevel } from '@/lib/research/types';
import { BookOpen, GraduationCap, Globe, FileText, ShieldCheck } from 'lucide-react';

interface ResearchSourceBadgeProps {
  type: SourceType;
  evidenceLevel?: EvidenceLevel;
  sourceName?: string;
  className?: string;
}

export const ResearchSourceBadge: React.FC<ResearchSourceBadgeProps> = ({
  type,
  evidenceLevel = 'general',
  sourceName,
  className = '',
}) => {
  const getBadgeStyle = () => {
    if (evidenceLevel === 'primary') {
      return {
        icon: FileText,
        label: 'ARXIV · PRIMARY RESEARCH',
        style: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
      };
    }

    if (evidenceLevel === 'academic') {
      return {
        icon: GraduationCap,
        label: `ACADEMIC · ${sourceName?.toUpperCase() || 'UNIVERSITY'}`,
        style: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
      };
    }

    if (type === 'course') {
      return {
        icon: BookOpen,
        label: 'COURSE MATERIAL',
        style: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      };
    }

    if (evidenceLevel === 'secondary') {
      return {
        icon: ShieldCheck,
        label: `REFERENCE · ${sourceName?.toUpperCase() || 'DOCUMENTATION'}`,
        style: 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
      };
    }

    return {
      icon: Globe,
      label: `WEB · ${sourceName?.toUpperCase() || 'RESOURCE'}`,
      style: 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]',
    };
  };

  const badge = getBadgeStyle();
  const Icon = badge.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded border ${badge.style} ${className}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{badge.label}</span>
    </span>
  );
};

export default ResearchSourceBadge;
