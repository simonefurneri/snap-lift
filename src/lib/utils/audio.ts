/**
 * Web Audio API synthesizer for countdown alerts
 * Works offline in PWA with zero external mp3 dependencies.
 * Includes iOS WebKit AudioContext auto-unlock on user gesture.
 */

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx
      .resume()
      .then(() => {
        // Play an imperceptible 1-sample silent buffer to unlock the iOS audio pipeline
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isAudioUnlocked = true;
      })
      .catch(() => {});
  } else if (ctx.state === 'running') {
    isAudioUnlocked = true;
  }
}

// Auto-register touch/click listeners to warm up audio on first user tap
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
  const handleFirstInteraction = () => {
    unlockAudio();
    if (isAudioUnlocked) {
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handleFirstInteraction));
    }
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleFirstInteraction, { capture: true, passive: true })
  );
}

export async function playTimerCompleteBeep() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Play 3 clean high-pitch beeps (A5 -> A5 -> D6)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playTone(880, now, 0.15); // A5 (880 Hz)
    playTone(880, now + 0.2, 0.15); // A5 (880 Hz)
    playTone(1174.66, now + 0.4, 0.35); // D6 (1174 Hz)
  } catch (e) {
    console.warn('Audio feedback error', e);
  }
}

export function triggerVibration(pattern: number[] = [200, 100, 200]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}
