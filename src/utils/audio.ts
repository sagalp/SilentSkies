/**
 * Web Audio API synthesizer for UI clicks and ambient soundscape.
 * Requires zero external audio files.
 */

let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientNoiseSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Plays a soft cyber-nature click sound effect */
export function playUiClick(enabled: boolean = true, volume: number = 0.35) {
  if (!enabled || volume <= 0) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

    const targetGain = 0.22 * Math.min(Math.max(volume, 0.01), 1.0);
    gain.gain.setValueAtTime(targetGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

/** Plays a crisp telemetry tick sound effect when scrubbing sliders */
export function playSliderTick(enabled: boolean = true, volume: number = 0.35) {
  if (!enabled || volume <= 0) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.02);

    const targetGain = 0.18 * Math.min(Math.max(volume, 0.01), 1.0);
    gain.gain.setValueAtTime(targetGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.022);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

/** Starts or stops the ambient wind breeze soundscape */
export function updateAmbientSound(enabled: boolean, volume: number) {
  try {
    const ctx = getAudioContext();

    if (!enabled) {
      if (ambientGain) {
        ambientGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        setTimeout(() => {
          if (ambientNoiseSource) {
            ambientNoiseSource.stop();
            ambientNoiseSource.disconnect();
            ambientNoiseSource = null;
          }
        }, 500);
      }
      return;
    }

    if (!ambientNoiseSource) {
      // Create 5 seconds of pink noise buffer
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      ambientNoiseSource = ctx.createBufferSource();
      ambientNoiseSource.buffer = buffer;
      ambientNoiseSource.loop = true;

      // Lowpass filter for deep wind breeze
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;

      // LFO for slow wind swelling
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.15; // 0.15 Hz slow swell
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(filter.frequency);
      lfo.start();

      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
      ambientGain.gain.linearRampToValueAtTime(volume * 0.15, ctx.currentTime + 1.2);

      ambientNoiseSource.connect(filter);
      filter.connect(ambientGain);
      ambientGain.connect(ctx.destination);

      ambientNoiseSource.start();
    } else if (ambientGain) {
      ambientGain.gain.linearRampToValueAtTime(volume * 0.15, ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Ignore audio restrictions
  }
}
