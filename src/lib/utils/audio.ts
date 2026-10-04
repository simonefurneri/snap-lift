/**
 * Web Audio API synthesizer for countdown alerts
 * Works offline in PWA with zero external mp3 dependencies.
 */

export function playTimerCompleteBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Play 3 clean high-pitch beeps
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playTone(880, now, 0.15); // A5
    playTone(880, now + 0.2, 0.15); // A5
    playTone(1174.66, now + 0.4, 0.35); // D6
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
