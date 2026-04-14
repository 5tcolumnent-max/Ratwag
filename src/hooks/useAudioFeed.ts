import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface AudioFeedState {
  active: boolean;
  monitoring: boolean;
  level: number;
  error: string | null;
  isSecureContext: boolean;
  devices: AudioDevice[];
  selectedDeviceId: string | null;
}

export interface AudioFeedControls {
  start: () => Promise<void>;
  stop: () => void;
  startMonitor: () => void;
  stopMonitor: () => void;
  selectDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
}

function isSecure(): boolean {
  return (
    window.isSecureContext ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  );
}

async function enumerateAudioDevices(): Promise<AudioDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter(d => d.kind === 'audioinput')
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${i + 1}`,
    }));
}

export function useAudioFeed(): [AudioFeedState, AudioFeedControls] {
  const [active, setActive] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const secure = isSecure();

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const refreshDevices = useCallback(async () => {
    const found = await enumerateAudioDevices();
    setDevices(found);
    if (found.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(found[0].deviceId);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!secure) return;
    void refreshDevices();

    const handler = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', handler);
  }, [secure, refreshDevices]);

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
    if (!secure) {
      setError('HTTPS required — media access is blocked on non-secure connections.');
      return;
    }

    setError(null);

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48000,
    };

    if (selectedDeviceId && selectedDeviceId !== 'default') {
      audioConstraints.deviceId = { exact: selectedDeviceId };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;

      const found = await enumerateAudioDevices();
      setDevices(found);

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
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Allow access in your browser settings.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError('No microphone found. Connect a device and try again.');
      } else if (e.name === 'OverconstrainedError') {
        setError('Selected microphone is unavailable. Choose a different device.');
      } else {
        setError('Microphone access failed. Check browser permissions and connection security.');
      }
    }
  }, [secure, selectedDeviceId]);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (active) {
      stop();
    }
  }, [active, stop]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (monitorGainRef.current) monitorGainRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return [
    { active, monitoring, level, error, isSecureContext: secure, devices, selectedDeviceId },
    { start, stop, startMonitor, stopMonitor, selectDevice, refreshDevices },
  ];
}
