// Zbiera vzorky z mikrofónu a posiela ich po ~100 ms ako 16-bit PCM
class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(1600);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    let sum = 0;
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      sum += s * s;
      this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.offset === this.buffer.length) {
        this.port.postMessage({ pcm: this.buffer.buffer, level: Math.sqrt(sum / channel.length) }, [
          this.buffer.buffer,
        ]);
        this.buffer = new Int16Array(1600);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PcmRecorder);
