class SoundManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
  }

  init() {
    if (this.context) return;
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.3;
  }

  playTone(freq, type, duration) {
    if (!this.context) this.init();
    if (this.context.state === 'suspended') {
        this.context.resume();
    }
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playHover() {
    this.playTone(800, 'sine', 0.1);
  }

  playSwitch() {
    if (!this.context) this.init();
    if (this.context.state === 'suspended') this.context.resume();
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.frequency.setValueAtTime(200, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.context.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.context.currentTime + 0.3);
  }

  playSuccess() {
    if (!this.context) this.init();
    const now = this.context.currentTime;
    [440, 554, 659].forEach((freq, i) => {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
    });
  }
  
  playExit() {
      this.playTone(300, 'triangle', 0.2);
  }
}

export const soundManager = new SoundManager();
