import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Video,
  Upload,
  Play,
  Square,
  Camera,
  Mic,
  MicOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileVideo,
  Brain,
  Hand,
  Eye,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

type FeedStatus = 'idle' | 'loading' | 'active' | 'analyzing' | 'complete' | 'error';
type AnalysisMode = 'vsr' | 'slr' | 'combined';

interface AnalysisResult {
  mode: AnalysisMode;
  confidence: number;
  transcript?: string;
  signs?: SignDetection[];
  frames_processed: number;
  latency_ms: number;
  timestamp: string;
}

interface SignDetection {
  sign: string;
  confidence: number;
  frame_start: number;
  frame_end: number;
  handedness: 'left' | 'right' | 'both';
}

const MOCK_VSR_RESULTS: AnalysisResult[] = [
  {
    mode: 'vsr',
    confidence: 94.2,
    transcript: 'Perimeter breach detected at sector seven. Requesting immediate extraction.',
    frames_processed: 342,
    latency_ms: 218,
    timestamp: new Date().toISOString(),
  },
  {
    mode: 'vsr',
    confidence: 87.8,
    transcript: 'Asset secured. Moving to secondary position. Maintain radio silence.',
    frames_processed: 198,
    latency_ms: 156,
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
];

const MOCK_SLR_RESULTS: SignDetection[] = [
  { sign: 'DANGER', confidence: 96.1, frame_start: 12, frame_end: 28, handedness: 'right' },
  { sign: 'EVACUATE', confidence: 91.4, frame_start: 35, frame_end: 58, handedness: 'both' },
  { sign: 'ACKNOWLEDGE', confidence: 88.7, frame_start: 62, frame_end: 74, handedness: 'right' },
  { sign: 'HOSTILE', confidence: 83.2, frame_start: 80, frame_end: 99, handedness: 'left' },
];

function StatusDot({ status }: { status: FeedStatus }) {
  const map: Record<FeedStatus, string> = {
    idle: 'bg-slate-600',
    loading: 'bg-amber-400 animate-pulse',
    active: 'bg-emerald-400 animate-pulse',
    analyzing: 'bg-sky-400 animate-pulse',
    complete: 'bg-emerald-400',
    error: 'bg-red-400',
  };
  return <div className={`w-2 h-2 rounded-full ${map[status]}`} />;
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 shrink-0 w-8 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

function LiveVideoPanel({ label, status, stream, onMockAnalyze, mirrored = false }: {
  label: string;
  status: FeedStatus;
  stream: MediaStream | null;
  onMockAnalyze: () => void;
  mirrored?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center gap-3">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_30px,rgba(148,163,184,0.02)_30px,rgba(148,163,184,0.02)_31px)]" />

      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        />
      )}

      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <StatusDot status={stream ? 'active' : status} />
        <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest drop-shadow">{label}</span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        {stream && <span className="text-[10px] font-bold text-red-400 bg-red-900/60 border border-red-700/60 px-1.5 py-0.5 rounded animate-pulse backdrop-blur-sm">● LIVE</span>}
        {!stream && status === 'analyzing' && <span className="text-[10px] font-bold text-sky-400 bg-sky-900/60 border border-sky-700/60 px-1.5 py-0.5 rounded backdrop-blur-sm">ANALYZING</span>}
      </div>

      {!stream && status === 'idle' && (
        <>
          <Video className="w-10 h-10 text-slate-700" />
          <p className="text-xs text-slate-600">Feed not initialized</p>
          <button
            onClick={onMockAnalyze}
            className="text-[10px] text-sky-400 border border-sky-700/40 px-3 py-1 rounded hover:bg-sky-900/20 transition-all"
          >
            Simulate Feed Input
          </button>
        </>
      )}
      {!stream && (status === 'loading' || status === 'analyzing') && (
        <>
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          <p className="text-xs text-sky-400 font-mono">
            {status === 'loading' ? 'Initializing stream...' : 'Processing frames...'}
          </p>
        </>
      )}
      {!stream && status === 'complete' && (
        <>
          <CheckCircle className="w-8 h-8 text-emerald-400" />
          <p className="text-xs text-emerald-400 font-mono">Analysis complete</p>
        </>
      )}
      {!stream && status === 'error' && (
        <>
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-xs text-red-400 font-mono">Feed error — check connection</p>
        </>
      )}

      {stream && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent z-10" />
      )}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent z-10" />
    </div>
  );
}

function VSRPanel({ results }: { results: AnalysisResult[] }) {
  return (
    <div className="space-y-3">
      {results.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">No transcriptions yet. Simulate a feed to begin.</p>
      ) : (
        results.map((r, i) => (
          <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-widest">VSR Output</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                <span>{r.frames_processed} frames</span>
                <span>{r.latency_ms}ms</span>
                <Clock className="w-3 h-3" />
                <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <blockquote className="text-sm text-slate-200 leading-relaxed border-l-2 border-sky-600/50 pl-3 italic">
              "{r.transcript}"
            </blockquote>
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Lip-sync confidence</p>
              <ConfidenceBar value={r.confidence} color="bg-sky-500" />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SLRPanel({ detections }: { detections: SignDetection[] }) {
  return (
    <div className="space-y-2">
      {detections.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">No sign detections yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 text-[10px] text-slate-600 uppercase tracking-widest px-3 py-1">
            <span>Sign</span>
            <span>Conf.</span>
            <span>Frames</span>
          </div>
          {detections.map((d, i) => (
            <div key={i} className="bg-slate-800/20 border border-slate-700/20 rounded-lg px-3 py-2.5 grid grid-cols-3 items-center gap-1 md:gap-2">
              <div className="flex items-center gap-2">
                <Hand className={`w-3 h-3 shrink-0 ${d.handedness === 'both' ? 'text-amber-400' : d.handedness === 'left' ? 'text-sky-400' : 'text-emerald-400'}`} />
                <span className="text-xs font-bold text-slate-200 font-mono">{d.sign}</span>
              </div>
              <ConfidenceBar value={d.confidence} color={d.confidence >= 90 ? 'bg-emerald-500' : d.confidence >= 80 ? 'bg-amber-500' : 'bg-slate-500'} />
              <span className="text-[10px] font-mono text-slate-500">{d.frame_start}–{d.frame_end}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const MOCK_SLR_DETECTIONS = MOCK_SLR_RESULTS;

export default function ForensicLayer() {
  const { session } = useAuth();
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('idle');
  const [mode, setMode] = useState<AnalysisMode>('combined');
  const [micActive, setMicActive] = useState(false);
  const [vsrResults, setVsrResults] = useState<AnalysisResult[]>([]);
  const [slrDetections, setSlrDetections] = useState<SignDetection[]>([]);
  const [activePanel, setActivePanel] = useState<'vsr' | 'slr'>('vsr');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [primaryStream, setPrimaryStream] = useState<MediaStream | null>(null);
  const [secondaryStream, setSecondaryStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [primaryDeviceId, setPrimaryDeviceId] = useState<string>('');
  const [secondaryDeviceId, setSecondaryDeviceId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const logToAudit = useCallback(async (action: string, detail: string) => {
    if (!session) return;
    await supabase.from('audit_log_entries').insert({
      user_id: session.user.id,
      module: 'ForensicLayer',
      action,
      detail,
      severity: 'info',
    });
  }, [session]);

  useEffect(() => {
    async function enumerateCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(cameras);
        if (cameras[0]) setPrimaryDeviceId(cameras[0].deviceId);
        if (cameras[1]) setSecondaryDeviceId(cameras[1].deviceId);
      } catch {
        setCameraError('Camera access denied or unavailable.');
      }
    }
    enumerateCameras();
  }, []);

  const startPrimaryFeed = useCallback(async () => {
    setCameraError(null);
    try {
      if (primaryStream) {
        primaryStream.getTracks().forEach(t => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: primaryDeviceId ? { deviceId: { exact: primaryDeviceId } } : true,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPrimaryStream(stream);
      void logToAudit('LIVE_FEED_START', `Primary camera feed activated`);
    } catch {
      setCameraError('Could not access primary camera.');
      void logToAudit('LIVE_FEED_ERROR', 'Primary camera access failed');
    }
  }, [primaryDeviceId, primaryStream, logToAudit]);

  const startSecondaryFeed = useCallback(async () => {
    setCameraError(null);
    try {
      if (secondaryStream) {
        secondaryStream.getTracks().forEach(t => t.stop());
      }
      const deviceId = secondaryDeviceId || (availableCameras[1]?.deviceId ?? availableCameras[0]?.deviceId);
      if (!deviceId) {
        setCameraError('No secondary camera detected.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      setSecondaryStream(stream);
      void logToAudit('LIVE_FEED_START', 'Secondary camera feed activated');
    } catch {
      setCameraError('Could not access secondary camera.');
    }
  }, [secondaryDeviceId, secondaryStream, availableCameras, logToAudit]);

  const stopAllFeeds = useCallback(() => {
    if (primaryStream) primaryStream.getTracks().forEach(t => t.stop());
    if (secondaryStream) secondaryStream.getTracks().forEach(t => t.stop());
    setPrimaryStream(null);
    setSecondaryStream(null);
    void logToAudit('LIVE_FEED_STOP', 'All live feeds terminated');
  }, [primaryStream, secondaryStream, logToAudit]);

  useEffect(() => {
    return () => {
      if (primaryStream) primaryStream.getTracks().forEach(t => t.stop());
      if (secondaryStream) secondaryStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    void logToAudit('VIDEO_UPLOAD', `File ingested: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
  };

  const simulateFeed = async () => {
    setFeedStatus('loading');
    await logToAudit('FEED_START', `Analysis mode: ${mode}`);
    await new Promise(r => setTimeout(r, 800));
    setFeedStatus('active');
    await new Promise(r => setTimeout(r, 1200));
    setFeedStatus('analyzing');
    await new Promise(r => setTimeout(r, 1800));

    if (mode === 'vsr' || mode === 'combined') {
      const result = MOCK_VSR_RESULTS[Math.floor(Math.random() * MOCK_VSR_RESULTS.length)];
      setVsrResults(prev => [{ ...result, timestamp: new Date().toISOString() }, ...prev].slice(0, 5));
    }
    if (mode === 'slr' || mode === 'combined') {
      const shuffled = [...MOCK_SLR_DETECTIONS].sort(() => Math.random() - 0.5).slice(0, 4);
      setSlrDetections(shuffled);
    }

    setFeedStatus('complete');
    await logToAudit('FEED_COMPLETE', `Analysis finished — mode: ${mode}`);
    setTimeout(() => setFeedStatus('idle'), 3000);
  };

  const handleStop = async () => {
    setFeedStatus('idle');
    await logToAudit('FEED_STOP', 'Feed manually terminated');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Eye className="w-3 h-3" /> Analysis Mode
          </p>
          <div className="flex flex-col gap-1.5">
            {(['vsr', 'slr', 'combined'] as AnalysisMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                  mode === m
                    ? 'bg-sky-900/40 border-sky-700/50 text-sky-300'
                    : 'bg-slate-800/30 border-slate-700/20 text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'vsr' && <Brain className="w-3.5 h-3.5" />}
                {m === 'slr' && <Hand className="w-3.5 h-3.5" />}
                {m === 'combined' && <Zap className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wide">
                  {m === 'vsr' ? 'Visual Speech (VSR)' : m === 'slr' ? 'Sign Language (SLR)' : 'Combined'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Video className="w-3 h-3" /> Feed Controls
          </p>
          <div className="space-y-2">
            {availableCameras.length > 0 && (
              <div className="space-y-1.5">
                <button
                  onClick={startPrimaryFeed}
                  disabled={!!primaryStream}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-800/40 border border-emerald-700/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-800/60 transition-all disabled:opacity-40"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {primaryStream ? 'Primary Live' : 'Start Primary Cam'}
                </button>
                {availableCameras.length > 1 && (
                  <button
                    onClick={startSecondaryFeed}
                    disabled={!!secondaryStream}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-800/30 border border-emerald-700/30 text-emerald-400 text-xs font-medium hover:bg-emerald-800/50 transition-all disabled:opacity-40"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {secondaryStream ? 'Secondary Live' : 'Start Secondary Cam'}
                  </button>
                )}
                {(primaryStream || secondaryStream) && (
                  <button
                    onClick={stopAllFeeds}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700/30 text-red-400 text-xs font-medium hover:bg-red-900/50 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop All Feeds
                  </button>
                )}
                <div className="border-t border-slate-700/30 pt-2" />
              </div>
            )}
            <button
              onClick={simulateFeed}
              disabled={feedStatus === 'analyzing' || feedStatus === 'loading'}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-700/40 border border-sky-600/40 text-sky-300 text-xs font-semibold hover:bg-sky-700/60 transition-all disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              Simulate Analysis
            </button>
            <button
              onClick={handleStop}
              disabled={feedStatus === 'idle'}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30 text-slate-400 text-xs font-medium hover:text-slate-200 transition-all disabled:opacity-40"
            >
              <Square className="w-3.5 h-3.5" />
              Stop Analysis
            </button>
            <button
              onClick={() => { setMicActive(m => !m); void logToAudit('MIC_TOGGLE', micActive ? 'Microphone disabled' : 'Microphone enabled'); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                micActive ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-slate-700/20 border-slate-700/20 text-slate-500 hover:text-slate-300'
              }`}
            >
              {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              {micActive ? 'Audio Active' : 'Audio Disabled'}
            </button>
            {cameraError && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400">{cameraError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Upload className="w-3 h-3" /> Video Ingest
          </p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border border-dashed border-slate-600/40 rounded-lg p-4 text-center cursor-pointer hover:border-sky-600/40 hover:bg-sky-900/10 transition-all"
          >
            <FileVideo className="w-5 h-5 text-slate-600 mx-auto mb-2" />
            {uploadedFile ? (
              <>
                <p className="text-xs text-emerald-400 font-medium truncate">{uploadedFile.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500">Drop or click to upload</p>
                <p className="text-[10px] text-slate-600 mt-0.5">MP4, MOV, AVI supported</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          {uploadedFile && (
            <button
              onClick={simulateFeed}
              className="w-full mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 text-xs font-medium hover:bg-emerald-900/50 transition-all"
            >
              <Brain className="w-3.5 h-3.5" />
              Analyze Upload
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Camera className="w-3 h-3" /> Primary Feed
            </p>
            {availableCameras.length > 1 && (
              <select
                value={primaryDeviceId}
                onChange={e => setPrimaryDeviceId(e.target.value)}
                className="text-[9px] bg-slate-800/40 border border-slate-700/30 rounded px-1.5 py-1 text-slate-500 focus:outline-none max-w-[120px] truncate"
              >
                {availableCameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${i + 1}`}</option>
                ))}
              </select>
            )}
          </div>
          <LiveVideoPanel
            label="FEED-01 PRIMARY"
            status={feedStatus}
            stream={primaryStream}
            onMockAnalyze={simulateFeed}
            mirrored
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Camera className="w-3 h-3" /> Secondary Feed
            </p>
            {availableCameras.length > 1 && (
              <select
                value={secondaryDeviceId}
                onChange={e => setSecondaryDeviceId(e.target.value)}
                className="text-[9px] bg-slate-800/40 border border-slate-700/30 rounded px-1.5 py-1 text-slate-500 focus:outline-none max-w-[120px] truncate"
              >
                {availableCameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${i + 1}`}</option>
                ))}
              </select>
            )}
          </div>
          <LiveVideoPanel
            label="FEED-02 SECONDARY"
            status={feedStatus === 'active' ? 'idle' : feedStatus}
            stream={secondaryStream}
            onMockAnalyze={simulateFeed}
          />
        </div>
      </div>

      <div className="bg-slate-800/10 border border-slate-700/30 rounded-xl">
        <div className="flex border-b border-slate-700/30">
          {(['vsr', 'slr'] as const).map(panel => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
                activePanel === panel
                  ? 'text-sky-400 border-sky-500'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {panel === 'vsr' ? <><Brain className="w-3.5 h-3.5" /> Visual Speech Recognition</> : <><Hand className="w-3.5 h-3.5" /> Sign Language Recognition</>}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activePanel === 'vsr' && <VSRPanel results={vsrResults} />}
          {activePanel === 'slr' && <SLRPanel detections={slrDetections} />}
        </div>
      </div>
    </div>
  );
}
