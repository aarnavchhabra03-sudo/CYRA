'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, ArrowLeft, Search, GraduationCap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[var(--cyra-bg)] text-[var(--cyra-text)] font-sans">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] shadow-[0_8px_30px_rgba(40,70,100,0.07)] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#DCEEFF] border border-[#C5DFF2] text-[#149FC4] flex items-center justify-center mx-auto shadow-xs">
          <Compass className="w-8 h-8 animate-spin-slow text-[#149FC4]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#DCEEFF] text-[#286B91] border border-[#C5DFF2]">
            <span>ERROR 404</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#172033] tracking-tight font-sans mt-2">
            PAGE NOT FOUND
          </h1>
          <p className="text-xs text-[#60758A] leading-relaxed font-sans">
            The research intelligence or learning pathway page you requested does not exist or has been relocated within the CYRA OS.
          </p>
        </div>

        <div className="pt-2 space-y-2.5 font-mono text-xs">
          <Link
            href="/"
            className="os-button-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO DASHBOARD</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/research"
              className="os-button-secondary py-2 text-[11px] flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-[#149FC4]" />
              <span>RESEARCH</span>
            </Link>

            <Link
              href="/courses"
              className="os-button-secondary py-2 text-[11px] flex items-center justify-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#7770D8]" />
              <span>COURSES</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
