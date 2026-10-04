'use client';

import React, { useState, useEffect } from 'react';
import { syncEngine, SyncEngineStatus } from '@/lib/services/syncEngine';
import { Cloud, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';

export function SyncIndicator({ showLabel = false }: { showLabel?: boolean }) {
  const [status, setStatus] = useState<SyncEngineStatus>({
    state: 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = () => {
    syncEngine.processQueue();
  };

  if (status.state === 'synced' && status.pendingCount === 0) {
    return (
      <div
        className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold select-none shrink-0"
        title="Tutti i dati sono sincronizzati con il server"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        {showLabel && <span>Sincronizzato</span>}
      </div>
    );
  }

  if (status.state === 'syncing') {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse cursor-pointer shrink-0"
        title="Sincronizzazione in corso..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        {showLabel && <span>Sincronizzo ({status.pendingCount})...</span>}
      </button>
    );
  }

  if (status.state === 'pending') {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer shrink-0 relative"
        title={`${status.pendingCount} serie in attesa di sincronizzazione. Tocca per inviare.`}
      >
        <Cloud className="w-3.5 h-3.5" />
        {status.pendingCount > 0 && !showLabel && (
          <span className="text-[10px] font-black">{status.pendingCount}</span>
        )}
        {showLabel && <span>In attesa ({status.pendingCount})</span>}
      </button>
    );
  }

  // Error / Offline
  return (
    <button
      type="button"
      onClick={handleManualSync}
      className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/25 transition-colors cursor-pointer shrink-0"
      title="Connessione offline o errore. Tocca per riprovare."
    >
      <CloudOff className="w-3.5 h-3.5" />
      {showLabel && <span>Offline ({status.pendingCount})</span>}
    </button>
  );
}
