// Sound system for NeuroLearn Pro

let ctx = null;
let enabled = true;

export function setSoundEnabled(val) {
  enabled = val;
}

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function playTone(freq, duration, type = 'sine', gain = 0.3) {
  if (!enabled) return;
  try {
    const ac = getCtx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gainNode.gain.setValueAtTime(gain, ac.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch (e) {}
}

export function playCorrect() {
  if (!enabled) return;
  playTone(523, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 200);
}

export function playSessionComplete() {
  if (!enabled) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => {
    setTimeout(() => playTone(note, 0.3, 'sine', 0.25), i * 150);
  });
  setTimeout(() => {
    [1047, 1175, 1319, 1568].forEach((note, i) => {
      setTimeout(() => playTone(note, 0.4, 'sine', 0.2), i * 100);
    });
  }, 700);
}

export function playBlockComplete() {
  if (!enabled) return;
  playTone(440, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(550, 0.15, 'sine', 0.2), 150);
  setTimeout(() => playTone(660, 0.25, 'sine', 0.2), 300);
}

export function playHover() {
  if (!enabled) return;
  playTone(880, 0.05, 'sine', 0.05);
}
