import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioFeedState {
  active: boolean;
  monitoring: boolean;
  level: number;
  error: string | null;
}

export interface AudioFeedControls {
  start: () => Promise<void>;
  stop: () => void;
  startMonitor: () => void;
  stopMonitor: () => void;
}

export function useAudioFeed(): [AudioFeedState, AudioFeedControls] {
  const [active, setActive] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const stopMonitor = useCallback(() => {
    if (monitorGainRef.current) {
      monitorGainRef.current.disconnect();
      monitorGainRef.current = null;
    }
    setMonitoring(false);
  }, []);

  const startMonitor = useCallback(() => {
    const ctx = audioContextRef.current;
    const source = sourceRef.current;
    if (!ctx || !source || monitorGainRef.current) return;

    const gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(ctx.destination);
    monitorGainRef.current = gain;
    setMonitoring(true);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    stopMonitor();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    sourceRef.current = null;
    analyserRef.current = null;
    setActive(false);
    setLevel(0);
  }, [stopMonitor]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const sum = data.reduce((acc, v) => acc + v, 0);
        const avg = sum / data.length;
        setLevel(Math.min(100, (avg / 128) * 100));
        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
      setActive(true);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (monitorGainRef.current) monitorGainRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return [{ active, monitoring, level, error }, { start, stop, startMonitor, stopMonitor }];
}
