// Sound, synthesised with WebAudio: no audio files, no network. The context
// is created on the first user gesture (browsers block audio before that),
// and M toggles mute. Every sound is a short oscillator envelope.

export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, duration, type, volume, when = 0, slideTo = null) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function noiseBurst(duration, volume, when = 0) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime + when;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Two-note chime when a relic is pocketed. */
    pickup() {
      tone(660, 0.14, 'sine', 0.5);
      tone(990, 0.22, 'sine', 0.5, 0.09);
    },
    /** Dissonant sting when a guard spots Wren. */
    alert() {
      tone(220, 0.3, 'sawtooth', 0.35, 0, 180);
      tone(233, 0.3, 'sawtooth', 0.3, 0.02, 190);
    },
    /** A guard got curious: a short questioning blip. */
    suspicious() {
      tone(520, 0.12, 'triangle', 0.35, 0, 640);
    },
    /** The pebble's clink on marble. */
    pebble() {
      tone(1900, 0.05, 'square', 0.18);
      tone(1500, 0.07, 'square', 0.14, 0.06);
      noiseBurst(0.05, 0.12, 0.02);
    },
    /** Caught: a low thud. */
    caught() {
      tone(90, 0.4, 'sine', 0.6, 0, 45);
      noiseBurst(0.18, 0.2);
    },
    /** Level cleared: a small rising arpeggio. */
    levelDone() {
      tone(523, 0.16, 'sine', 0.45);
      tone(659, 0.16, 'sine', 0.45, 0.12);
      tone(784, 0.16, 'sine', 0.45, 0.24);
      tone(1047, 0.3, 'sine', 0.5, 0.36);
    },
    /** The whole job done: the same arpeggio, one octave up and slower. */
    win() {
      tone(784, 0.2, 'sine', 0.45);
      tone(988, 0.2, 'sine', 0.45, 0.16);
      tone(1175, 0.2, 'sine', 0.45, 0.32);
      tone(1568, 0.45, 'sine', 0.5, 0.48);
    },
  };
}
