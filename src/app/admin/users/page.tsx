'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminService, AdminUser } from '@/lib/services/adminService';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  WifiOff,
  ChevronLeft,
  AlertTriangle,
  Mail,
  Calendar,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dialog state for actions
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectUserTarget, setRejectUserTarget] = useState<AdminUser | null>(null);
  const [revokeUserTarget, setRevokeUserTarget] = useState<AdminUser | null>(null);
  const [approveUserTarget, setApproveUserTarget] = useState<AdminUser | null>(null);

  // Network connection listener
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadUsers = async (showSpinner = true) => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setLoading(false);
      return;
    }

    try {
      if (showSpinner) setLoading(true);
      else setIsRefreshing(true);

      const data = await adminService.getUsers();
      setPendingUsers(data.pending || []);
      setApprovedUsers(data.approved || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
      showToast(err.message || 'Errore durante il caricamento degli utenti', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || (profile && !profile.is_admin)) {
        router.replace('/plans');
        return;
      }
      if (profile?.is_admin) {
        loadUsers();
      }
    }
  }, [authLoading, user, profile, router]);

  // Approve action
  const handleConfirmApprove = async () => {
    if (!approveUserTarget) return;
    setActionLoading(true);
    try {
      await adminService.approveUser(approveUserTarget.id);
      showToast(`Account ${approveUserTarget.email || 'utente'} approvato con successo!`);
      // Move from pending to approved locally
      setPendingUsers((prev) => prev.filter((u) => u.id !== approveUserTarget.id));
      setApprovedUsers((prev) => [
        {
          ...approveUserTarget,
          is_approved: true,
          approved_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setApproveUserTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Errore durante l\'approvazione', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject / Delete action
  const handleConfirmReject = async () => {
    if (!rejectUserTarget) return;
    setActionLoading(true);
    try {
      await adminService.rejectUser(rejectUserTarget.id);
      showToast(`Account ${rejectUserTarget.email || 'utente'} rifiutato ed eliminato.`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== rejectUserTarget.id));
      setApprovedUsers((prev) => prev.filter((u) => u.id !== rejectUserTarget.id));
      setRejectUserTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Errore durante il rifiuto', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke action
  const handleConfirmRevoke = async () => {
    if (!revokeUserTarget) return;
    setActionLoading(true);
    try {
      await adminService.revokeUser(revokeUserTarget.id);
      showToast(`Approvazione revocata per ${revokeUserTarget.email || 'utente'}.`);
      // Move from approved to pending locally
      setApprovedUsers((prev) => prev.filter((u) => u.id !== revokeUserTarget.id));
      setPendingUsers((prev) => [
        {
          ...revokeUserTarget,
          is_approved: false,
          approved_at: null,
        },
        ...prev,
      ]);
      setRevokeUserTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Errore durante la revoca', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists based on search
  const filteredPending = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pendingUsers;
    return pendingUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q)
    );
  }, [pendingUsers, searchQuery]);

  const filteredApproved = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return approvedUsers;
    return approvedUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q)
    );
  }, [approvedUsers, searchQuery]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/D';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (authLoading || (loading && isOnline)) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Caricamento pannello amministrazione...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 sm:right-6 left-4 sm:left-auto max-w-sm ml-auto z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold text-white backdrop-blur-md',
                toastMessage.type === 'success' ? 'bg-emerald-600/95' : 'bg-red-600/95'
              )}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0"
              aria-label="Torna al profilo"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  Gestione Utenti
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Approva nuovi utenti, revoca permessi e gestisci gli accessi a SnapLift.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(false)}
              disabled={isRefreshing || !isOnline}
              className="min-h-[40px] text-xs font-semibold"
            >
              <RotateCcw className={cn('w-3.5 h-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
              <span>Aggiorna</span>
            </Button>
          </div>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center gap-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm"
          >
            <WifiOff className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <span className="font-bold">Sei offline. </span>
              La gestione e l&apos;approvazione utenti richiede una connessione a Internet attiva per sincronizzarsi con il database Supabase.
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadUsers(true)}
              className="shrink-0 text-xs"
            >
              Riprova
            </Button>
          </motion.div>
        )}

        {/* Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Tabs */}
          <div className="flex p-1 bg-slate-200/80 dark:bg-zinc-800/80 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'pending'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>In attesa</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-black',
                  pendingUsers.length > 0
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                )}
              >
                {pendingUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'approved'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Approvati</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {approvedUsers.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cerca per email o nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Tab Content: IN ATTESA */}
        {activeTab === 'pending' && (
          <div className="flex flex-col gap-3">
            {filteredPending.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Nessun utente in attesa di approvazione
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                  Tutte le richieste di registrazione sono state elaborate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPending.map((pendingUser) => (
                  <motion.div
                    key={pendingUser.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-zinc-900/90 border border-amber-500/30 dark:border-amber-500/20 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-lg flex items-center justify-center shrink-0 border border-amber-500/20">
                        {((pendingUser.display_name || pendingUser.email || 'U')[0] || 'U').toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                            {pendingUser.email || 'Email non presente'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
                            In attesa
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                          {pendingUser.display_name && (
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {pendingUser.display_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Registrato il {formatDate(pendingUser.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions for Pending User */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setApproveUserTarget(pendingUser)}
                        className="flex-1 sm:flex-none min-h-[42px] px-4 font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                        <span>Approva</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejectUserTarget(pendingUser)}
                        className="flex-1 sm:flex-none min-h-[42px] px-4 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        <span>Rifiuta</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: APPROVATI */}
        {activeTab === 'approved' && (
          <div className="flex flex-col gap-3">
            {filteredApproved.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
                <Users className="w-8 h-8 text-zinc-400 mb-2" />
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Nessun utente approvato trovato
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Non ci sono utenti che corrispondono alla ricerca.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredApproved.map((approvedUser) => {
                  const isSelf = approvedUser.id === user?.id;

                  return (
                    <motion.div
                      key={approvedUser.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-lg flex items-center justify-center shrink-0 border border-emerald-500/20">
                          {((approvedUser.display_name || approvedUser.email || 'U')[0] || 'U').toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                              {approvedUser.email || 'Email non presente'}
                            </span>
                            {approvedUser.is_admin && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shrink-0">
                                Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
                                Tu
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                            {approvedUser.display_name && (
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {approvedUser.display_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Approvato il {formatDate(approvedUser.approved_at || approvedUser.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions for Approved User */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                        {isSelf ? (
                          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 px-3 py-1.5">
                            Account corrente
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeUserTarget(approvedUser)}
                            className="flex-1 sm:flex-none min-h-[42px] px-4 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1.5" />
                            <span>Revoca</span>
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Dialog: APPROVA */}
        <ConfirmDialog
          isOpen={Boolean(approveUserTarget)}
          onClose={() => setApproveUserTarget(null)}
          onConfirm={handleConfirmApprove}
          title="Conferma Approvazione"
          message={`Vuoi approvare l'accesso per l'utente ${approveUserTarget?.email || ''}? L'utente potrà accedere a tutte le funzionalità di SnapLift.`}
          confirmLabel="Approva Utente"
          cancelLabel="Annulla"
          isDanger={false}
          isLoading={actionLoading}
        />

        {/* Confirmation Dialog: RIFIUTA */}
        <ConfirmDialog
          isOpen={Boolean(rejectUserTarget)}
          onClose={() => setRejectUserTarget(null)}
          onConfirm={handleConfirmReject}
          title="Rifiuta ed Elimina Account"
          message={`Sei sicuro di voler rifiutare la richiesta di ${rejectUserTarget?.email || ''}? L'account verrà eliminato definitivamente con tutti i dati correlati.`}
          confirmLabel="Rifiuta ed Elimina"
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={actionLoading}
        />

        {/* Confirmation Dialog: REVOCA */}
        <ConfirmDialog
          isOpen={Boolean(revokeUserTarget)}
          onClose={() => setRevokeUserTarget(null)}
          onConfirm={handleConfirmRevoke}
          title="Revoca Approvazione"
          message={`Sei sicuro di voler revocare l'accesso a ${revokeUserTarget?.email || ''}? L'utente non potrà più accedere né creare schede o sessioni finché non verrà ri-approvato.`}
          confirmLabel="Revoca Accesso"
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={actionLoading}
        />
      </div>
    </AppLayout>
  );
}
