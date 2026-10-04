'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Download, Share, PlusSquare, Smartphone, CheckCircle, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check localStorage dismissal
    const isDismissed = localStorage.getItem('snaplift_pwa_dismissed') === 'true';
    setDismissed(isDismissed);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsOpen(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setIsOpen(true);
    }
  };

  const handleDismissForever = () => {
    localStorage.setItem('snaplift_pwa_dismissed', 'true');
    setDismissed(true);
    setIsOpen(false);
  };

  // If already installed standalone, don't show prompt banner
  if (isStandalone) {
    return null;
  }

  // Can show install banner if deferredPrompt is available OR if on iOS Safari and not dismissed
  const canShowInstall = Boolean(deferredPrompt || (isIOS && !isStandalone));

  if (!canShowInstall) {
    return null;
  }

  return (
    <>
      {/* Discreet Banner on Homepage/Header or bottom toast */}
      {!dismissed && (
        <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-500/20 px-4 py-2 text-xs flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-300">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              Installa <strong>SnapLift</strong> per un'esperienza a schermo intero e offline in palestra.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold text-[11px] shadow-xs hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Installa App
            </button>
            <button
              onClick={handleDismissForever}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              Ignora
            </button>
          </div>
        </div>
      )}

      {/* Guide / Install Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Installa SnapLift"
        description="Aggiungi l'app alla schermata home del tuo dispositivo per aprirla a schermo intero senza barra del browser."
        maxWidth="md"
      >
        <div className="flex flex-col gap-5 py-2">
          {isIOS ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex flex-col gap-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Come installare su iPhone / iPad (Safari):
                </h4>

                <div className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    Tocca l'icona <strong>Condividi</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-emerald-600" /> nella barra in basso di Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    Scorri le opzioni e tocca <strong>"Aggiungi alla schermata Home"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-600" />.
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    Conferma toccando <strong>"Aggiungi"</strong> in alto a destra. Troverai l'icona di SnapLift sulla tua schermata home!
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Nessun download da App Store necessario. Funziona offline.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Installando l'app avrai accesso istantaneo con un tocco, funzionamento continuo anche senza connessione internet in palestra e timer precisi.
                </p>
              </div>

              {deferredPrompt && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleInstallClick}
                  className="w-full justify-center shadow-lg shadow-emerald-500/25 font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Installa SnapLift Ora</span>
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Chiudi
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
