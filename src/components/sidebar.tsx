'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CyraLogo from '@/components/cyra-logo';
import {
  Home, 
  BookOpen, 
  Search, 
  Bookmark,
  GitFork,
  Bot, 
  TrendingUp, 
  Zap, 
  Settings, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Flame,
  Activity
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

const workspaceGroup = [
  { label: 'Overview',       href: '/',                     icon: Home },
  { label: 'Research',       href: '/research',             icon: Search },
  { label: 'Library',        href: '/research/library',     icon: Bookmark },
  { label: 'Knowledge Graph',href: '/research/intelligence',  icon: GitFork },
  { label: 'AI Tutor',       href: '/tutor',                icon: Bot },
];

const learningGroup = [
  { label: 'Courses',        href: '/courses',              icon: BookOpen },
  { label: 'Progress',       href: '/progress',             icon: TrendingUp },
  { label: 'Quizzes',        href: '/course/operating-systems', icon: Zap },
];

const systemGroup = [
  { label: 'Profile',        href: '/profile',              icon: User },
  { label: 'Settings',       href: '/settings',             icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);

  // Sidebar collapse & mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cyra_sidebar_collapsed');
      if (saved === 'true' && window.innerWidth >= 768) {
        setIsCollapsed(true);
        document.documentElement.classList.add('sidebar-collapsed');
      } else {
        setIsCollapsed(false);
        document.documentElement.classList.remove('sidebar-collapsed');
      }
    } catch (e) {
      console.warn('LocalStorage error reading sidebar state:', e);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/signup') return;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setAuthUser(user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            setProfile(data);
          } else {
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner',
              xp: 0,
              current_streak: 1,
              longest_streak: 1,
            });
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    }

    loadProfile();
  }, [pathname]);

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('cyra_sidebar_collapsed', String(nextState));
      if (nextState) {
        document.documentElement.classList.add('sidebar-collapsed');
      } else {
        document.documentElement.classList.remove('sidebar-collapsed');
      }
    } catch (e) {
      console.warn('LocalStorage error saving sidebar state:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const effectiveCollapsed = isMobileOpen ? false : isCollapsed;

  const userName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Learner';
  const userXp = profile?.xp ?? 0;
  const userStreak = profile?.current_streak ?? 1;
  const level = Math.floor(userXp / 300) + 1;

  const renderNavGroup = (title: string, items: typeof workspaceGroup) => (
    <div className="space-y-1">
      {!effectiveCollapsed && (
        <p className="px-2.5 mb-1 text-[10px] font-mono font-extrabold tracking-widest uppercase text-[var(--sidebar-text-muted)]">
          {title}
        </p>
      )}
      {items.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={label}
            href={href}
            title={effectiveCollapsed ? label : undefined}
            className={`group relative flex items-center gap-2.5 rounded-lg font-sans text-xs transition-all duration-150 focus-visible:outline-none ${
              active 
                ? 'bg-[var(--pastel-blue-bg)] text-[var(--pastel-blue-text)] font-bold border-l-3 border-l-[var(--cyra-cyan)] pl-2' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-l-3 border-l-transparent'
            } ${
              effectiveCollapsed 
                ? 'justify-center h-9 w-9 mx-auto p-0 border-l-0' 
                : 'px-2.5 py-2'
            }`}
            aria-label={label}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? 'text-[var(--cyra-cyan)]' : 'text-[var(--text-muted)] group-hover:text-[var(--cyra-cyan)]'}`} />
            {!effectiveCollapsed && <span className="truncate">{label}</span>}
            {!effectiveCollapsed && active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--cyra-cyan)] flex-shrink-0" />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Trigger Button */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-xs flex items-center justify-center hover:border-[var(--border-strong)] transition-colors cursor-pointer"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-[var(--sidebar-bg)] transition-all duration-200 ease-in-out border-r border-[var(--sidebar-border)] shadow-xs ${
          effectiveCollapsed ? 'w-[68px]' : 'w-[256px]'
        } ${
          isMobileOpen ? 'translate-x-0 w-[256px]' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`py-4 transition-all ${
            effectiveCollapsed
              ? 'flex flex-col items-center gap-3 px-2'
              : 'flex items-center justify-between px-4'
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 group min-w-0">
            <div className="relative flex-shrink-0">
              <CyraLogo size="md" alt="CYRA Logo" priority />
            </div>

            {!effectiveCollapsed && (
              <div className="leading-tight min-w-0 truncate">
                <span className="text-xs font-mono font-bold tracking-wider text-[var(--sidebar-text)] uppercase">
                  CYRA<span className="text-[var(--cyra-cyan)]">.AI</span>
                </span>
                <p className="text-[9px] font-mono text-[var(--sidebar-text-muted)] tracking-wider uppercase truncate mt-0.5">
                  Research Intelligence OS
                </p>
              </div>
            )}
          </Link>

          {!isMobileOpen && (
            <button
              onClick={toggleCollapse}
              aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)] hover:border-[var(--border-strong)] flex-shrink-0 cursor-pointer"
              title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {effectiveCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div className="w-full h-px bg-[var(--border)] mb-2" />

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto overflow-x-hidden pt-1">
          {renderNavGroup('WORKSPACE', workspaceGroup)}
          {renderNavGroup('LEARNING', learningGroup)}
          {renderNavGroup('SYSTEM', systemGroup)}
        </nav>

        {/* System Status & User Profile Rail Footer */}
        <div className="mt-auto px-3 pb-3 pt-2 border-t border-[var(--sidebar-border)] space-y-2">
          
          {/* AI System Operational Status */}
          {!effectiveCollapsed ? (
            <div className="p-2.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-between text-[10px] font-mono">
              <span className="text-[var(--text-secondary)] font-bold uppercase tracking-wider">AI SYSTEM</span>
              <span className="flex items-center gap-1.5 text-[var(--cyra-green)] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyra-green)] animate-pulse" />
                OPERATIONAL
              </span>
            </div>
          ) : (
            <div className="flex justify-center py-1" title="AI SYSTEM: OPERATIONAL">
              <span className="w-2 h-2 rounded-full bg-[var(--cyra-green)] animate-pulse" />
            </div>
          )}

          {/* User Profile Summary & Logout */}
          <div
            className={`rounded-xl flex items-center transition-all ${
              effectiveCollapsed
                ? 'h-9 w-9 mx-auto p-0 justify-center bg-[var(--surface)] border border-[var(--border)] relative'
                : 'p-2.5 gap-2.5 bg-[var(--surface)] border border-[var(--border)] shadow-xs'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--pastel-blue-bg)] border border-[var(--border)] flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold text-[var(--cyra-cyan)] uppercase">
              {userName[0]}
            </div>

            {!effectiveCollapsed && (
              <div className="flex-1 min-w-0 leading-tight">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--sidebar-text)] truncate">{userName}</span>
                  <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)] font-semibold">
                    Lv {level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9.5px] font-mono text-[var(--sidebar-text-muted)] mt-0.5">
                  <span className="flex items-center gap-1 text-[var(--cyra-amber)]">
                    <Flame className="w-2.5 h-2.5" />
                    {userStreak}d
                  </span>
                  <span>{userXp} XP</span>
                </div>
              </div>
            )}

            {!effectiveCollapsed && (
              <button
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1 rounded text-[var(--sidebar-text-muted)] hover:text-[var(--cyra-red)] hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
