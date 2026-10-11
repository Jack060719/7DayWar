/**
 * Ashen Covenant — original procedural score and sound design.
 * No samples, network requests, dependencies, or recognizable borrowed themes.
 * Call unlock() directly in a pointer/touch/key event; see README.md.
 */

const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const EPS = 0.0001;

// Four-bar sentences form eight-bar questions/answers. Rests are intentional.
// Each tuple is [beat within bar, MIDI pitch, length in beats].
const TOWN_MELODY = [
  [], [[2,69,1.6]], [[0,74,1.4],[1.75,77,.7],[3,76,.8]], [[0,74,2.5]],
  [[.5,72,1.5],[2.5,69,.9]], [[0,67,2],[2.75,69,.7]], [[0,65,1.7],[2,64,.8]], [[0,62,2.7]],
  [[1,69,1.2],[2.5,72,.8]], [[0,74,1.4],[2,77,1.4]], [[0,79,2],[2.75,77,.7]], [[0,76,2.8]],
  [[.5,74,1.5],[2.5,72,.9]], [[0,69,1.8],[2.5,67,.8]], [[0,65,2],[2.5,69,.7]], [[0,74,2.8]],
  [[1,77,1.3],[2.75,81,.8]], [[0,79,1.5],[2,77,1.3]], [[.5,76,1.2],[2.5,72,1]], [[0,74,2.5]],
  [[0,72,1.4],[1.75,69,.8],[3,67,.7]], [[0,65,2.5]], [[1,67,1],[2.5,69,1]], [[0,72,2.6]],
  [[1,74,1.5],[3,77,.6]], [[0,76,1.4],[2,74,1.2]], [[.5,72,1.5],[2.5,69,.9]], [[0,67,2.5]],
  [[.5,65,1.7],[2.75,64,.8]], [[0,62,2]], [[1,65,1.2],[2.5,64,.8]], [[0,62,2.5]],
];
const WILD_MELODY = [
  [[1,69,2]], [], [[.5,72,1.5],[2.5,74,.8]], [[0,76,2.5]],
  [[1,74,1.2],[2.5,71,1]], [[0,69,2.3]], [[1,67,1.6]], [[0,64,2.5]],
  [[.5,65,1.5],[2.5,69,1]], [[0,72,2.3]], [[1,74,1.4],[3,76,.7]], [[0,77,2.6]],
  [[.5,76,1.2],[2,74,1.5]], [[0,71,2.3]], [[.5,69,1.2],[2,67,1.5]], [[0,69,2.8]],
  [], [[1,76,1.3],[2.5,79,.8]], [[0,77,1.7],[2.5,76,1]], [[0,74,2.6]],
  [[1,72,1.3],[2.5,71,1]], [[0,69,2.5]], [[1,65,1.2],[2.5,67,1]], [[0,64,2.8]],
  [[.5,69,1.7]], [[1,72,1],[2.5,74,1]], [[0,76,2.5]], [[1,74,1.8]],
  [[.5,71,1.3],[2.5,69,1]], [[0,67,2.5]], [[1,64,1.2],[2.5,65,.8]], [[0,62,2.6]],
];
const DUNGEON_MELODY = [
  [], [[1.5,62,2]], [], [[.5,65,1.7],[2.75,63,.8]],
  [[0,62,2.6]], [], [[1,60,1.8]], [[0,57,2.5]],
  [], [[1,62,1.5],[3,65,.7]], [[0,67,2.4]], [],
  [[.5,65,1.5],[2.5,63,1]], [[0,62,2.8]], [], [[1,57,2]],
  [[1,58,2]], [], [[.5,63,1.6],[2.75,65,.8]], [[0,62,2.8]],
  [], [[1,60,1.5],[3,58,.7]], [[0,57,2.2]], [],
];

// Open voicings leave room for the melody and game sounds.
const CHORDS = {
  dm: [38, 57, 62, 65], bb: [34, 53, 62, 65], f: [41, 57, 60, 65],
  c: [36, 55, 60, 64], am: [33, 52, 57, 60], g: [31, 55, 59, 62],
  gm: [31, 55, 58, 62], eb: [39, 58, 63, 67], a: [33, 52, 57, 61],
};

function compose(region, bpm, title, progression, melody) {
  const events = [];
  const add = (beat, note, duration, instrument, velocity, pan) => {
    events.push({ beat, note, duration, instrument, velocity, pan });
  };
  for (let bar = 0; bar < melody.length; bar++) {
    const chord = CHORDS[progression[Math.floor(bar / 2)]];
    const beat = bar * 4;
    const phraseEnd = bar % 8 === 7;
    // Quiet low bow, joined by two upper voices on alternate bars.
    if (bar % 2 === 0) {
      add(beat, chord[0], 7.7, 'cello', region === 'dungeon' ? .18 : .13, -.13);
      add(beat + .08, chord[2] - 12, 7.5, 'strings', .075, -.37);
      add(beat + .16, chord[3] - 12, 7.3, 'strings', .064, .38);
    }
    // The harp changes register and pattern across the four sentences.
    if (region !== 'dungeon') {
      const pattern = bar % 4;
      const notes = pattern === 0 ? [[0,1],[1.5,2],[3,3]]
        : pattern === 1 ? [[.5,2],[2.5,3]]
          : pattern === 2 ? [[0,1],[2,3],[3.25,2]] : [[.5,2],[2.25,1]];
      for (const [offset, index] of notes) {
        if (phraseEnd && offset > 1) continue;
        const octave = bar >= 16 && bar < 24 && index > 1 ? 12 : 0;
        add(beat + offset + .018 * (bar % 3), chord[index] + octave, 2.3,
          'harp', region === 'wild' ? .105 : .14, -.46 + index * .19);
      }
    } else if (bar % 3 === 0) {
      add(beat + 1.25, chord[1], 3, 'harp', .08, -.4);
      if (bar % 6 === 0) add(beat + 3, chord[2], 3.5, 'bell', .04, .45);
    }
    for (const [offset, note, duration] of melody[bar]) {
      add(beat + offset + .035, note, duration, 'flute',
        region === 'dungeon' ? .11 : .155, .11);
    }
    // One distant hand-bell at a structural turn, never a driving beat.
    if (region === 'town' && (bar === 8 || bar === 24)) {
      add(beat + .1, chord[2] + 12, 4, 'bell', .045, -.28);
    }
  }
  events.sort((a, b) => a.beat - b.beat);
  return Object.freeze({ region, bpm, title, beats: melody.length * 4,
    events: Object.freeze(events.map(Object.freeze)) });
}

export const SCORES = Object.freeze({
  town: compose('town', 58, 'Hearth under Ash',
    ['dm','bb','f','c','dm','f','bb','dm','f','c','bb','am','dm','c','bb','dm'], TOWN_MELODY),
  wild: compose('wild', 54, 'The Waking Road',
    ['dm','c','g','am','bb','f','g','dm','c','dm','bb','am','dm','g','am','dm'], WILD_MELODY),
  dungeon: compose('dungeon', 48, 'Beneath the Reliquary',
    ['dm','eb','dm','am','gm','eb','dm','am','bb','eb','dm','am'], DUNGEON_MELODY),
});

const INSTRUMENTS = Object.freeze({
  harp: { harmonics: [1,.42,.20,.11,.06,.025], attack: .006, release: 1.1, cutoff: 2600, decay: true },
  flute: { harmonics: [1,.15,.11,.025,.014], attack: .14, release: .32, cutoff: 2700, vibrato: 4.8 },
  strings: { harmonics: [1,.27,.16,.10,.065,.04,.025,.012], attack: .8, release: 1.25, cutoff: 1600, vibrato: 3.5 },
  cello: { harmonics: [1,.36,.15,.075,.04,.022], attack: .65, release: 1.15, cutoff: 850, vibrato: 2.7 },
  bell: { harmonics: [1,.10,.32,.055,.11,.026], attack: .004, release: 1.8, cutoff: 3400, decay: true },
  sine: { harmonics: [1,.08], attack: .008, release: .18, cutoff: 1800 },
});

function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * One instance per game. Constructor is silent and creates no AudioContext.
 * Options: enabled (true), volume (0.65), musicVolume (0.65), effectsVolume (0.8).
 * contextFactory is an optional test hook, not required by the game.
 */
export class AshenAudio {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.region = 'town';
    this.volume = clamp(Number.isFinite(options.volume) ? options.volume : .65, 0, 1);
    this.musicVolume = clamp(Number.isFinite(options.musicVolume) ? options.musicVolume : .65, 0, 1);
    this.effectsVolume = clamp(Number.isFinite(options.effectsVolume) ? options.effectsVolume : .8, 0, 1);
    this._factory = options.contextFactory ?? (() => {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      return Context ? new Context({ latencyHint: 'interactive' }) : null;
    });
    this._doc = options.document ?? globalThis.document;
    this._page = options.window ?? globalThis.window;
    this._context = null;
    this._disposed = false;
    this._unlocked = false;
    this._manualPause = false;
    this._timer = null;
    this._voices = new Set();
    this._primers = new Set();
    this._graph = [];
    this._cursor = 0;
    this._cycle = 0;
    this._epoch = 0;
    this._resumeBeat = 0;
    this._lastEffect = new Map();
    this._hidden = this._doc?.visibilityState === 'hidden';
    this._onVisibility = () => {
      this._hidden = this._doc?.visibilityState === 'hidden';
      if (this._hidden) this._pauseContext();
      else this._resumeIfAllowed();
    };
    this._onPageHide = () => { this._hidden = true; this._pauseContext(); };
    this._onPageShow = () => {
      this._hidden = this._doc?.visibilityState === 'hidden';
      this._resumeIfAllowed();
    };
    this._doc?.addEventListener('visibilitychange', this._onVisibility);
    this._page?.addEventListener('pagehide', this._onPageHide);
    this._page?.addEventListener('pageshow', this._onPageShow);
  }

  get unlocked() { return this._unlocked; }
  get running() { return this._canRun() && this._context?.state === 'running' && this._timer !== null; }

  /** Invoke directly from a trusted gesture, with no await before this call. */
  async unlock() {
    if (this._disposed) return false;
    try {
      if (!this._context) {
        this._context = this._factory();
        if (!this._context) return false;
        this._buildGraph();
        this._onStateChange = () => {
          if (this._context?.state !== 'running') {
            this._stopScheduler(true);
            for (const voice of [...this._voices]) this._destroyVoice(voice);
          }
          else if (this._canRun()) this._startScheduler();
        };
        this._context.addEventListener('statechange', this._onStateChange);
      }
      this._manualPause = false;
      // Both resume() and the silent source are issued in the original gesture.
      const resumed = this._context.resume();
      const primer = this._context.createBufferSource();
      primer.buffer = this._context.createBuffer(1, 1, this._context.sampleRate);
      primer.connect(this._context.destination);
      this._primers.add(primer);
      primer.onended = () => { primer.disconnect(); primer.onended = null; this._primers.delete(primer); };
      primer.start();
      await resumed;
      if (this._disposed) return false;
      this._unlocked = this._context.state === 'running';
      if (this._canRun()) this._startScheduler();
      else this._pauseContext();
      return this._unlocked;
    } catch {
      // A later user gesture can retry; failure never breaks the game loop.
      return false;
    }
  }

  setEnabled(enabled) {
    if (this._disposed) return;
    this.enabled = Boolean(enabled);
    if (this.enabled) {
      this._manualPause = false;
      this._resumeIfAllowed();
    } else this._pauseContext();
  }

  setRegion(region) {
    if (!Object.hasOwn(SCORES, region) || this._disposed) return false;
    if (this.region === region) return true;
    this._stopScheduler(false);
    // Existing notes release gently; room tails are retained through the change.
    for (const voice of this._voices) if (voice.kind === 'music') this._release(voice, .55);
    this.region = region;
    this._resumeBeat = 0;
    if (this._canRun() && this._context?.state === 'running') this._startScheduler();
    return true;
  }

  setVolume(volume) {
    if (!Number.isFinite(volume) || this._disposed) return;
    this.volume = clamp(volume, 0, 1);
    if (this._master) this._master.gain.setTargetAtTime(this.volume, this._context.currentTime, .035);
  }

  setMusicVolume(volume) {
    if (!Number.isFinite(volume) || this._disposed) return;
    this.musicVolume = clamp(volume, 0, 1);
    if (this._music) this._music.gain.setTargetAtTime(this.musicVolume, this._context.currentTime, .06);
  }

  setEffectsVolume(volume) {
    if (!Number.isFinite(volume) || this._disposed) return;
    this.effectsVolume = clamp(volume, 0, 1);
    if (this._effects) this._effects.gain.setTargetAtTime(this.effectsVolume, this._context.currentTime, .035);
  }

  /** Explicit pause is sticky until unlock() or setEnabled(true). */
  suspend() {
    if (this._disposed) return;
    this._manualPause = true;
    this._pauseContext();
  }

  async dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._stopScheduler(false);
    for (const voice of [...this._voices]) this._destroyVoice(voice);
    this._clearPrimers();
    this._doc?.removeEventListener('visibilitychange', this._onVisibility);
    this._page?.removeEventListener('pagehide', this._onPageHide);
    this._page?.removeEventListener('pageshow', this._onPageShow);
    this._context?.removeEventListener('statechange', this._onStateChange);
    for (const node of this._graph) { try { node.disconnect(); } catch {} }
    this._graph.length = 0;
    this._lastEffect.clear();
    if (this._context && this._context.state !== 'closed') {
      try { await this._context.close(); } catch {}
    }
    this._noiseBuffer = null;
    this._waves = null;
    this._context = null;
    this._unlocked = false;
  }

  _canRun() { return !this._disposed && this.enabled && this._unlocked && !this._hidden && !this._manualPause; }

  _resumeIfAllowed() {
    if (!this._canRun() || !this._context) return;
    if (this._context.state === 'running') { this._startScheduler(); return; }
    // Safari may require a fresh gesture after an interruption; unlock() retries.
    try {
      this._context.resume().then(() => {
        if (this._canRun()) this._startScheduler();
        else this._pauseContext();
      }).catch(() => {});
    } catch {}
  }

  _pauseContext() {
    this._stopScheduler(true);
    for (const voice of [...this._voices]) this._destroyVoice(voice);
    this._clearPrimers();
    if (this._context && this._context.state !== 'closed') {
      try {
        this._context.suspend().then(() => {
          // A fast hide/show or mute/unmute may overtake the async suspension.
          if (this._canRun()) this._resumeIfAllowed();
        }).catch(() => {});
      } catch {}
    }
  }

  _clearPrimers() {
    for (const source of this._primers) {
      source.onended = null;
      try { source.stop(); source.disconnect(); } catch {}
    }
    this._primers.clear();
  }

  _buildGraph() {
    const ctx = this._context;
    const keep = node => { this._graph.push(node); return node; };
    this._master = keep(ctx.createGain());
    this._master.gain.value = this.volume;
    this._music = keep(ctx.createGain()); this._music.gain.value = this.musicVolume;
    this._effects = keep(ctx.createGain()); this._effects.gain.value = this.effectsVolume;
    this._music.connect(this._master); this._effects.connect(this._master);
    const compressor = keep(ctx.createDynamicsCompressor());
    compressor.threshold.value = -14; compressor.knee.value = 12;
    compressor.ratio.value = 5; compressor.attack.value = .006; compressor.release.value = .3;
    this._master.connect(compressor); compressor.connect(ctx.destination);
    const room = keep(ctx.createConvolver());
    const roomTone = keep(ctx.createBiquadFilter());
    roomTone.type = 'lowpass'; roomTone.frequency.value = 2900; roomTone.Q.value = .3;
    this._musicSend = keep(ctx.createGain()); this._musicSend.gain.value = .26;
    this._effectsSend = keep(ctx.createGain()); this._effectsSend.gain.value = .13;
    this._music.connect(this._musicSend); this._effects.connect(this._effectsSend);
    this._musicSend.connect(room); this._effectsSend.connect(room);
    room.connect(roomTone); roomTone.connect(this._master);
    // Small stereo stone-room impulse, generated locally, not a sampled space.
    const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 1.65), ctx.sampleRate);
    const random = randomSource(0x41c0ffee);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) {
        smooth = smooth * .65 + (random() * 2 - 1) * .35;
        data[i] = smooth * Math.exp(-i / ctx.sampleRate * 4.3);
      }
      for (const delay of [.031, .073, .113, .191]) {
        data[Math.floor((delay + channel * .007) * ctx.sampleRate)] += .4 * Math.exp(-delay * 5);
      }
    }
    room.buffer = impulse;
    this._noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noise = this._noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i++) noise[i] = random() * 2 - 1;
    this._waves = {};
    for (const [name, instrument] of Object.entries(INSTRUMENTS)) {
      const imaginary = new Float32Array([0, ...instrument.harmonics]);
      this._waves[name] = ctx.createPeriodicWave(new Float32Array(imaginary.length), imaginary);
    }
  }

  _startScheduler() {
    if (this._timer !== null || !this._canRun() || this._context.state !== 'running') return;
    const score = SCORES[this.region];
    this._resumeBeat %= score.beats;
    this._cursor = score.events.findIndex(event => event.beat >= this._resumeBeat);
    if (this._cursor < 0) { this._cursor = 0; this._resumeBeat = 0; }
    this._cycle = 0;
    this._epoch = this._context.currentTime + .08 - this._resumeBeat * 60 / score.bpm;
    this._timer = setInterval(() => this._tick(), 60);
    this._tick();
  }

  _stopScheduler(remember) {
    if (this._timer === null) return;
    if (remember && this._context) {
      const score = SCORES[this.region];
      const beat = Math.max(0, (this._context.currentTime - this._epoch) * score.bpm / 60);
      // Restart the current bar after an interruption; no missed-note playback.
      this._resumeBeat = (Math.floor(beat / 4) * 4) % score.beats;
    }
    clearInterval(this._timer); this._timer = null;
  }

  _tick() {
    if (!this._canRun() || this._context?.state !== 'running') { this._stopScheduler(true); return; }
    const ctx = this._context;
    const score = SCORES[this.region];
    const seconds = 60 / score.bpm;
    for (const voice of this._voices) if (voice.end < ctx.currentTime - .1) this._destroyVoice(voice);
    let next = this._epoch + (this._cycle * score.beats + score.events[this._cursor].beat) * seconds;
    if (next < ctx.currentTime - .15) {
      // A throttled event loop must not drain its backlog into a burst of notes.
      const beat = Math.max(0, (ctx.currentTime - this._epoch) / seconds);
      this._cycle = Math.floor(beat / score.beats);
      this._cursor = score.events.findIndex(event => event.beat >= beat % score.beats);
      if (this._cursor < 0) { this._cursor = 0; this._cycle++; }
      next = this._epoch + (this._cycle * score.beats + score.events[this._cursor].beat) * seconds;
    }
    let budget = 20;
    while (next < ctx.currentTime + .22 && budget-- > 0) {
      const event = score.events[this._cursor];
      if (next >= ctx.currentTime - .025) {
        this._tone(event.instrument, event.note, Math.max(next, ctx.currentTime + .003),
          event.duration * seconds, event.velocity, event.pan, 'music');
      }
      if (++this._cursor >= score.events.length) { this._cursor = 0; this._cycle++; }
      next = this._epoch + (this._cycle * score.beats + score.events[this._cursor].beat) * seconds;
    }
  }

  _roomForVoice(kind) {
    // Hard cap includes scheduled, playing, and releasing voices.
    // Reserve eight slots for feedback so combat cannot silence every string.
    const music = [...this._voices].filter(voice => voice.kind === 'music');
    if (kind === 'music' && music.length >= 24) this._destroyVoice(music[0]);
    if (this._voices.size >= 32) {
      const old = [...this._voices].find(voice => voice.kind === kind) ?? this._voices.values().next().value;
      this._destroyVoice(old);
    }
  }

  _voice(nodes, sources, envelope, end, kind) {
    const voice = { nodes, sources, envelope, end, kind, destroyed: false };
    this._voices.add(voice);
    // The first source is always the audible carrier and outlives modulation.
    sources[0].onended = () => this._destroyVoice(voice);
    return voice;
  }

  _destroyVoice(voice) {
    if (!voice || voice.destroyed) return;
    voice.destroyed = true;
    for (const source of voice.sources) {
      source.onended = null;
      try { source.stop(); } catch {}
    }
    for (const node of voice.nodes) { try { node.disconnect(); } catch {} }
    this._voices.delete(voice);
  }

  _release(voice, duration) {
    if (voice.destroyed) return;
    const now = this._context.currentTime;
    const gain = voice.envelope.gain;
    if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now);
    else { gain.cancelScheduledValues(now); gain.setValueAtTime(Math.max(EPS, gain.value), now); }
    gain.linearRampToValueAtTime(0, now + duration);
    for (const source of voice.sources) { try { source.stop(now + duration + .02); } catch {} }
    voice.end = now + duration + .02;
  }

  _tone(instrumentName, note, when, length, velocity, pan, kind = 'sfx', endNote) {
    this._roomForVoice(kind);
    const ctx = this._context;
    const instrument = INSTRUMENTS[instrumentName];
    const carrier = ctx.createOscillator();
    carrier.setPeriodicWave(this._waves[instrumentName]);
    carrier.frequency.setValueAtTime(hz(note), when);
    if (endNote !== undefined) carrier.frequency.exponentialRampToValueAtTime(hz(endNote), when + length);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = .4;
    filter.frequency.setValueAtTime(instrument.cutoff, when);
    if (instrument.decay) filter.frequency.exponentialRampToValueAtTime(Math.max(450, hz(note) * 1.8), when + length);
    const envelope = ctx.createGain();
    const nodes = [carrier, filter, envelope]; const sources = [carrier];
    // A gently detuned second bow adds width without a heavyweight chorus.
    if (instrumentName === 'strings' || instrumentName === 'cello') {
      const second = ctx.createOscillator(); second.setPeriodicWave(this._waves[instrumentName]);
      second.frequency.setValueAtTime(hz(note), when);
      if (endNote !== undefined) second.frequency.exponentialRampToValueAtTime(hz(endNote), when + length);
      carrier.detune.value = -3; second.detune.value = 3;
      second.connect(filter); nodes.push(second); sources.push(second);
      velocity *= .55;
    }
    const attack = Math.min(instrument.attack, length * .25);
    const end = when + length + instrument.release;
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(velocity, when + attack);
    if (instrument.decay) {
      envelope.gain.exponentialRampToValueAtTime(Math.max(EPS, velocity * .035), when + length);
    } else {
      envelope.gain.linearRampToValueAtTime(velocity * .8, when + Math.max(attack, length * .7));
      envelope.gain.setValueAtTime(velocity * .8, when + length);
    }
    envelope.gain.exponentialRampToValueAtTime(EPS, end);
    envelope.gain.linearRampToValueAtTime(0, end + .025);
    carrier.connect(filter); filter.connect(envelope);
    let tail = envelope;
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner(); panner.pan.value = clamp(pan, -1, 1);
      nodes.push(panner); envelope.connect(panner); tail = panner;
    }
    tail.connect(kind === 'music' ? this._music : this._effects);
    if (instrument.vibrato) {
      const vibrato = ctx.createOscillator(); vibrato.frequency.value = instrument.vibrato;
      const depth = ctx.createGain(); depth.gain.setValueAtTime(0, when);
      depth.gain.linearRampToValueAtTime(instrumentName === 'flute' ? 7 : 4.5, when + attack + .45);
      vibrato.connect(depth); depth.connect(carrier.detune);
      if (sources.length > 1) depth.connect(sources[1].detune);
      nodes.push(vibrato, depth); sources.push(vibrato);
    }
    this._voice(nodes, sources, envelope, end + .04, kind);
    for (const source of sources) { source.start(when); source.stop(end + .04); }
  }

  _noise(when, length, velocity, frequency, endFrequency, attack = .005) {
    this._roomForVoice('sfx');
    const ctx = this._context;
    const source = ctx.createBufferSource(); source.buffer = this._noiseBuffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = .7;
    filter.frequency.setValueAtTime(frequency, when);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, when + length);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(velocity, when + attack);
    envelope.gain.exponentialRampToValueAtTime(EPS, when + length);
    source.connect(filter); filter.connect(envelope); envelope.connect(this._effects);
    this._voice([source, filter, envelope], [source], envelope, when + length + .02, 'sfx');
    source.start(when); source.stop(when + length + .02);
  }

  /** Returns false when muted, locked, throttled, suspended, or name is unknown. */
  play(name) {
    const cooldown = { hit:.075, miss:.12, cast:.22, loot:.3, fusionSuccess:.8, fusionFail:.8, death:1.5 };
    if (!Object.hasOwn(cooldown, name) || !this._canRun() || this._context?.state !== 'running') return false;
    const now = this._context.currentTime;
    if (now - (this._lastEffect.get(name) ?? -Infinity) < cooldown[name]) return false;
    this._lastEffect.set(name, now);
    const at = now + .004;
    const tone = (instrument, note, offset, duration, gain, pan = 0, endNote) =>
      this._tone(instrument, note, at + offset, duration, gain, pan, 'sfx', endNote);
    if (name === 'hit') {
      this._noise(at, .16, .42, 1300, 260);
      tone('sine', 45, 0, .1, .25, 0, 30);
    } else if (name === 'miss') {
      this._noise(at, .24, .22, 700, 2100, .055);
    } else if (name === 'cast') {
      this._noise(at, .65, .15, 500, 2300, .16);
      tone('bell', 62, .06, .45, .105, -.2);
      tone('flute', 74, .18, .5, .09, .2);
    } else if (name === 'loot') {
      tone('harp', 81, 0, .38, .18, -.12);
      tone('bell', 86, .13, .55, .095, .15);
    } else if (name === 'fusionSuccess') {
      [50,57,62,65,69].forEach((note, index) => tone('bell', note, index * .13, 1.3, .085, (index - 2) * .16));
      tone('strings', 74, .42, 1.5, .1);
    } else if (name === 'fusionFail') {
      this._noise(at, .85, .16, 1200, 140, .07);
      tone('cello', 46, 0, .9, .14, -.12, 38);
      tone('bell', 63, .09, .45, .06, .15);
    } else if (name === 'death') {
      this._noise(at, 1.5, .17, 900, 110, .15);
      tone('cello', 50, 0, 2.2, .19, -.2, 38);
      tone('strings', 57, .18, 1.8, .11, .2, 50);
    }
    return true;
  }
}

export default AshenAudio;
