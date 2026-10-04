'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { planService } from '@/lib/services/planService';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PlanModal } from '@/components/plans/PlanModal';
import {
  Dumbbell,
  Archive,
  User as UserIcon,
  PlusCircle,
  TrendingUp,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenNewPlan?: () => void;
}

export function AppLayout({ children, onOpenNewPlan }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);

  const navItems = [
    {
      href: '/plans',
      label: 'Piani',
      icon: Dumbbell,
      active: pathname === '/plans' || pathname.startsWith('/plans/'),
    },
    {
      href: '/progress',
      label: 'Progressi',
      icon: TrendingUp,
      active: pathname === '/progress',
    },
    {
      href: '/archive',
      label: 'Archivio',
      icon: Archive,
      active: pathname === '/archive',
    },
    {
      href: '/profile',
      label: 'Profilo',
      icon: UserIcon,
      active: pathname === '/profile',
    },
  ];

  const handleCreatePlan = async (data: { name: string; notes?: string }) => {
    if (!user) return;
    const newPlan = await planService.createPlan(user.id, data.name, data.notes);
    router.push(`/plans/${newPlan.id}`);
  };

  const handleOpenCreateModal = () => {
    if (onOpenNewPlan) {
      onOpenNewPlan();
    } else {
      setIsNewPlanModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-5 sticky top-0 h-screen justify-between z-30 box-border overflow-y-auto">
        <div className="flex flex-col gap-5">
          {/* Brand Logo */}
          <Link href="/plans" className="flex items-center gap-3 px-1 py-1 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                SnapLift
              </span>
              <span className="block text-[10px] text-zinc-400 font-medium tracking-widest uppercase">
                Workout Tracker
              </span>
            </div>
          </Link>

          {/* Always Visible Quick New Plan Button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/15 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuovo Piano</span>
          </button>

          {/* Nav list */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.active && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (Fixed Layout, no overflow) */}
        <div className="flex flex-col gap-3.5 pt-4 border-t border-slate-200 dark:border-zinc-800/80 w-full box-border">
          {/* Theme Section */}
          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-0.5">
              Tema
            </span>
            <ThemeToggle className="w-full" showLabels={true} />
          </div>

          {/* User Profile Card & Logout */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 w-full box-border">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                {((profile?.display_name || user?.email || user?.user_metadata?.full_name || 'U')[0] || 'U').toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                  {profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
                </span>
                <span className="text-[10px] text-zinc-500 truncate">
                  {user?.email || ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
              title="Esci"
              aria-label="Esci"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 pt-safe pb-3 flex items-center justify-between">
          <Link href="/plans" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-xs">
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              SnapLift
            </span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle showLabels={false} />
            <Link
              href="/profile"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:border-emerald-500 transition-colors"
            >
              {((profile?.display_name || user?.email || user?.user_metadata?.full_name || 'U')[0] || 'U').toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Page children */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed with Always Visible + Crea button) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 px-3 py-1.5 safe-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 rounded-2xl transition-all relative',
                  item.active
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                )}
              >
                {item.active && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[11px] leading-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* Always Visible Quick Create Action in Bottom Bar */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 rounded-2xl text-emerald-600 dark:text-emerald-400 cursor-pointer"
            aria-label="Nuovo Piano"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Crea</span>
          </button>
        </div>
      </nav>

      {/* Global Plan Creation Modal (accessible from any page) */}
      <PlanModal
        isOpen={isNewPlanModalOpen}
        onClose={() => setIsNewPlanModalOpen(false)}
        onSubmit={handleCreatePlan}
      />
    </div>
  );
}
