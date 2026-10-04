// Prehliadačové audio pre Gemini Live: vstup 16 kHz PCM, výstup 24 kHz PCM

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function startMicrophone(onChunk: (base64Pcm: string, level: number) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  // Prehliadač prevzorkuje mikrofón na 16 kHz
  const ctx = new AudioContext({ sampleRate: 16000 });
  await ctx.audioWorklet.addModule("/pcm-recorder-worklet.js");
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "pcm-recorder");
  node.port.onmessage = (e) => onChunk(toBase64(e.data.pcm), e.data.level);
  source.connect(node);

  return {
    setMuted(muted: boolean) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    },
    stop() {
      node.port.onmessage = null;
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}

export function createPlayer() {
  const ctx = new AudioContext({ sampleRate: 24000 });
  let nextTime = 0;
  const sources = new Set<AudioBufferSourceNode>();

  return {
    play(base64Pcm: string) {
      const bytes = Uint8Array.from(atob(base64Pcm), (c) => c.charCodeAt(0));
      const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
      const buffer = ctx.createBuffer(1, pcm.length, 24000);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 0x8000;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      nextTime = Math.max(nextTime, ctx.currentTime);
      src.start(nextTime);
      nextTime += buffer.duration;
      sources.add(src);
      src.onended = () => sources.delete(src);
    },
    // Používateľ skočil AI do reči – okamžite stíšiť
    interrupt() {
      sources.forEach((s) => s.stop());
      sources.clear();
      nextTime = 0;
    },
    get speaking() {
      return sources.size > 0;
    },
    resume() {
      return ctx.resume();
    },
    close() {
      this.interrupt();
      void ctx.close();
    },
  };
}
