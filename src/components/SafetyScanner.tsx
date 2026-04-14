import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Microscope,
  Upload,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FileImage,
  Activity,
  Shield,
  Zap,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Camera,
  Square,
  Video,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import { useAudioFeed } from '../hooks/useAudioFeed';
import AudioLevelMeter from './AudioLevelMeter';

type HazardLevel = 'low' | 'medium' | 'high' | 'critical';
type ScanStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
type GramStain = 'positive' | 'negative' | 'unknown';
type Shape = 'coccus' | 'bacillus' | 'spirillum' | 'vibrio' | 'unknown';

interface ScanResult {
  id: string;
  scanId: string;
  sampleLabel: string;
  imageName: string;
  hazardLevel: HazardLevel;
  confidencePct: number;
  pathogenDetected: boolean;
  pathogenClass: string;
  morphologySignatures: string[];
  gramStain: GramStain;
  motility: string;
  shape: Shape;
  notes: string;
  analyst: string;
  status: string;
  scannedAt: string;
}

const MOCK_RESULTS: Omit<ScanResult, 'id' | 'scanId' | 'imageName' | 'scannedAt'>[] = [
  {
    sampleLabel: 'SWAB-A3',
    hazardLevel: 'high',
    confidencePct: 91,
    pathogenDetected: true,
    pathogenClass: 'Staphylococcus aureus (MRSA variant)',
    morphologySignatures: ['Gram-positive cocci in clusters', 'Beta-hemolytic colonies', 'Catalase positive', 'Coagulase positive'],
    gramStain: 'positive',
    motility: 'non-motile',
    shape: 'coccus',
    notes: 'High antibiotic resistance profile detected. Immediate containment recommended.',
    analyst: 'Auto-ML v3.2',
    status: 'confirmed',
  },
  {
    sampleLabel: 'FLUID-B7',
    hazardLevel: 'medium',
    confidencePct: 78,
    pathogenDetected: true,
    pathogenClass: 'Pseudomonas aeruginosa',
    morphologySignatures: ['Gram-negative rod', 'Polar flagella', 'Pyocyanin pigmentation', 'Aerobic growth'],
    gramStain: 'negative',
    motility: 'motile',
    shape: 'bacillus',
    notes: 'Environmental isolate — opportunistic pathogen risk for immunocompromised individuals.',
    analyst: 'Auto-ML v3.2',
    status: 'confirmed',
  },
  {
    sampleLabel: 'SURFACE-C1',
    hazardLevel: 'low',
    confidencePct: 96,
    pathogenDetected: false,
    pathogenClass: '',
    morphologySignatures: ['Gram-positive rods', 'Spore-forming', 'Non-pathogenic Bacillus spp.'],
    gramStain: 'positive',
    motility: 'motile',
    shape: 'bacillus',
    notes: 'Benign environmental flora. No hazard detected.',
    analyst: 'Auto-ML v3.2',
    status: 'clear',
  },
];

function hazardConfig(level: HazardLevel) {
  switch (level) {
    case 'critical': return {
      color: 'text-red-300 bg-red-900/40 border-red-700/60',
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      badge: 'bg-red-900/40 border-red-600/60 text-red-300',
      bar: 'bg-red-500',
      glow: 'shadow-red-900/30 shadow-lg border-red-700/50',
    };
    case 'high': return {
      color: 'text-orange-300 bg-orange-900/30 border-orange-700/50',
      icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
      badge: 'bg-orange-900/30 border-orange-600/50 text-orange-300',
      bar: 'bg-orange-500',
      glow: 'shadow-orange-900/20 shadow border-orange-700/40',
    };
    case 'medium': return {
      color: 'text-amber-300 bg-amber-900/20 border-amber-700/40',
      icon: <Info className="w-4 h-4 text-amber-400" />,
      badge: 'bg-amber-900/20 border-amber-600/40 text-amber-300',
      bar: 'bg-amber-500',
      glow: 'border-amber-700/30',
    };
    default: return {
      color: 'text-emerald-300 bg-emerald-900/10 border-emerald-700/30',
      icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      badge: 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300',
      bar: 'bg-emerald-500',
      glow: 'border-emerald-700/20',
    };
  }
}

function MorphologyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-700/20 rounded-lg px-3 py-2">
      <p className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</p>
      <p className="text-xs text-slate-300 font-medium mt-0.5 capitalize">{value}</p>
    </div>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = hazardConfig(result.hazardLevel);

  return (
    <div className={`bg-slate-800/20 border rounded-xl overflow-hidden transition-all ${cfg.glow}`}>
      <div
        className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-3 md:py-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`p-1.5 md:p-2 rounded-lg border shrink-0 ${cfg.color}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white font-mono">{result.sampleLabel}</span>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">{result.scanId}</span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 truncate">
            {result.pathogenDetected ? result.pathogenClass : 'No pathogen detected'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500">Conf.</p>
            <p className="text-xs font-bold font-mono text-slate-300">{result.confidencePct}%</p>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border tracking-wider ${cfg.badge}`}>
            {result.hazardLevel}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/20 px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${cfg.bar} transition-all`} style={{ width: `${result.confidencePct}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-400">{result.confidencePct}% confidence</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MorphologyCell label="Gram Stain" value={result.gramStain} />
            <MorphologyCell label="Shape" value={result.shape} />
            <MorphologyCell label="Motility" value={result.motility} />
            <MorphologyCell label="Status" value={result.status} />
          </div>

          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Morphological Signatures
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.morphologySignatures.map((sig, i) => (
                <span key={i} className="text-[10px] px-2 py-1 rounded bg-slate-700/30 border border-slate-600/20 text-slate-300">
                  {sig}
                </span>
              ))}
            </div>
          </div>

          {result.notes && (
            <div className={`border rounded-xl p-3 ${result.hazardLevel === 'high' || result.hazardLevel === 'critical' ? 'bg-red-900/10 border-red-700/20' : 'bg-slate-800/30 border-slate-700/20'}`}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Analyst Notes</p>
              <p className="text-xs text-slate-300 leading-relaxed">{result.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-700/20">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{result.analyst}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(result.scannedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ImagePlaceholder({ scanning, file, stream }: { scanning: boolean; file: File | null; stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-900/60 border border-slate-700/30 rounded-xl overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: '200px' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.03)_0%,transparent_70%)]" />

      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
      )}

      {stream && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-bold text-red-400 bg-red-900/70 border border-red-700/60 px-1.5 py-0.5 rounded animate-pulse backdrop-blur-sm">● LIVE</span>
        </div>
      )}

      {scanning && (
        <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center space-y-3 z-10">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-sky-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-sky-600/50 animate-pulse" />
            <Microscope className="w-8 h-8 text-sky-400 absolute inset-0 m-auto" />
          </div>
          <p className="text-xs text-sky-400 font-mono animate-pulse">Analyzing morphology...</p>
          <div className="w-48 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ animation: 'scan 2s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {!stream && !scanning && file && (
        <div className="text-center space-y-2">
          <FileImage className="w-10 h-10 text-sky-400 mx-auto" />
          <p className="text-xs text-slate-300 font-medium">{file.name}</p>
          <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB · Ready for analysis</p>
        </div>
      )}

      {!stream && !scanning && !file && (
        <div className="text-center space-y-2">
          <Microscope className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-xs text-slate-600">No micro-imagery loaded</p>
          <p className="text-[10px] text-slate-700">Upload or use live camera below</p>
        </div>
      )}
    </div>
  );
}

export default function SafetyScanner() {
  const { session } = useAuth();
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sampleLabel, setSampleLabel] = useState('');
  const [filterHazard, setFilterHazard] = useState('all');
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioState, audioControls] = useAudioFeed();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (liveStream) liveStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setLiveStream(stream);
    } catch {
      setCameraError('Camera access denied or unavailable.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (liveStream) liveStream.getTracks().forEach(t => t.stop());
    setLiveStream(null);
  }, [liveStream]);

  useEffect(() => {
    if (!session) return;
    async function loadResults() {
      const { data } = await supabase
        .from('safety_scan_results')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('scanned_at', { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        setResults(data.map(r => ({
          id: r.id,
          scanId: r.scan_id,
          sampleLabel: r.sample_label,
          imageName: r.image_name,
          hazardLevel: r.hazard_level as HazardLevel,
          confidencePct: r.confidence_pct,
          pathogenDetected: r.pathogen_detected,
          pathogenClass: r.pathogen_class,
          morphologySignatures: r.morphology_signatures,
          gramStain: r.gram_stain as GramStain,
          motility: r.motility,
          shape: r.shape as Shape,
          notes: r.notes,
          analyst: r.analyst,
          status: r.status,
          scannedAt: r.scanned_at,
        })));
      }
    }
    loadResults();
  }, [session]);

  const logToAudit = useCallback(async (action: string, detail: string, severity = 'info') => {
    if (!session) return;
    await supabase.from('audit_log_entries').insert({
      user_id: session.user.id,
      module: 'SafetyScanner',
      action,
      detail,
      severity,
    });
  }, [session]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    logToAudit('IMAGE_UPLOAD', `Micro-imagery uploaded: ${file.name}`);
  };

  const runAnalysis = async () => {
    if (!uploadedFile && !sampleLabel && !liveStream) return;
    setScanStatus('uploading');
    await new Promise(r => setTimeout(r, 600));
    setScanStatus('processing');
    await new Promise(r => setTimeout(r, 2200));

    const template = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
    const scanId = `SCAN-${Date.now().toString(36).toUpperCase()}`;
    const label = sampleLabel || (uploadedFile?.name?.split('.')[0] || 'SAMPLE-X');

    const newResult: ScanResult = {
      id: crypto.randomUUID(),
      scanId,
      imageName: uploadedFile?.name || (liveStream ? 'live-capture.frame' : 'simulated-input.tif'),
      scannedAt: new Date().toISOString(),
      ...template,
      sampleLabel: label,
      confidencePct: template.confidencePct + Math.round((Math.random() - 0.5) * 8),
    };

    if (session) {
      await supabase.from('safety_scan_results').insert({
        user_id: session.user.id,
        scan_id: scanId,
        sample_label: label,
        image_name: newResult.imageName,
        image_size_bytes: uploadedFile?.size || 0,
        hazard_level: newResult.hazardLevel,
        confidence_pct: newResult.confidencePct,
        pathogen_detected: newResult.pathogenDetected,
        pathogen_class: newResult.pathogenClass,
        morphology_signatures: newResult.morphologySignatures,
        gram_stain: newResult.gramStain,
        motility: newResult.motility,
        shape: newResult.shape,
        notes: newResult.notes,
        analyst: newResult.analyst,
        status: newResult.status,
      });
    }

    setResults(prev => [newResult, ...prev]);
    setScanStatus('complete');
    await logToAudit(
      'SCAN_COMPLETE',
      `Sample: ${label} | Hazard: ${newResult.hazardLevel.toUpperCase()} | Pathogen: ${newResult.pathogenDetected ? newResult.pathogenClass : 'none'}`,
      newResult.hazardLevel === 'high' || newResult.hazardLevel === 'critical' ? 'warning' : 'info'
    );

    setTimeout(() => {
      setScanStatus('idle');
      setUploadedFile(null);
      setSampleLabel('');
    }, 2000);
  };

  const filtered = results.filter(r => filterHazard === 'all' || r.hazardLevel === filterHazard);

  const counts = {
    total: results.length,
    high: results.filter(r => r.hazardLevel === 'high' || r.hazardLevel === 'critical').length,
    medium: results.filter(r => r.hazardLevel === 'medium').length,
    clear: results.filter(r => !r.pathogenDetected).length,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Scans Run</p>
          <p className="text-2xl font-bold text-white mt-1">{counts.total}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">High / Critical</p>
          <p className={`text-2xl font-bold mt-1 ${counts.high > 0 ? 'text-red-400' : 'text-slate-600'}`}>{counts.high}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Medium Risk</p>
          <p className={`text-2xl font-bold mt-1 ${counts.medium > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{counts.medium}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Clear Samples</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{counts.clear}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Upload className="w-3 h-3" /> Sample Input
            </p>

            <ImagePlaceholder scanning={scanStatus === 'processing'} file={uploadedFile} stream={liveStream} />

            <div className="flex gap-2">
              {!liveStream ? (
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 text-xs font-medium hover:bg-slate-700/60 hover:text-white transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Use Live Camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 text-xs font-medium hover:bg-red-900/50 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop Camera
                </button>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30 text-slate-400 text-xs font-medium hover:text-slate-200 transition-all"
                title="Upload image file"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>
            {cameraError && (
              <p className="text-[10px] text-red-400 bg-red-900/20 border border-red-700/20 rounded-lg px-3 py-2">{cameraError}</p>
            )}

            <AudioLevelMeter
              active={audioState.active}
              level={audioState.level}
              error={audioState.error}
              onToggle={() => {
                if (audioState.active) {
                  audioControls.stop();
                } else {
                  void audioControls.start();
                }
              }}
            />

            <input
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-600/60"
              placeholder="Sample label (e.g. SWAB-A3)"
              value={sampleLabel}
              onChange={e => setSampleLabel(e.target.value)}
            />

            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-slate-600/40 rounded-lg p-3 text-center cursor-pointer hover:border-sky-600/40 hover:bg-sky-900/10 transition-all"
            >
              <FileImage className="w-4 h-4 text-slate-600 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500">Upload micro-imagery</p>
              <p className="text-[9px] text-slate-700 mt-0.5">TIFF, PNG, JPEG · 1–100 MP</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <button
              onClick={runAnalysis}
              disabled={scanStatus === 'processing' || scanStatus === 'uploading' || (!uploadedFile && !sampleLabel && !liveStream)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-700/50 border border-sky-600/40 text-sky-300 text-xs font-bold hover:bg-sky-700/70 transition-all disabled:opacity-40"
            >
              {scanStatus === 'uploading' || scanStatus === 'processing' ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
              ) : (
                <><Zap className="w-3.5 h-3.5" /> Run Pathogen Detection</>
              )}
            </button>

            <div className="bg-slate-900/40 border border-slate-700/20 rounded-lg p-3 space-y-1.5">
              <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Detection Engine</p>
              {[
                ['Model', 'BioML-Pathogen v3.2'],
                ['Stain Analysis', 'Gram/Ziehl-Neelsen'],
                ['Morphology', 'CNN · 98.4% accuracy'],
                ['DB Reference', 'NCBI + CDC strains'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px]">
                  <span className="text-slate-600">{k}</span>
                  <span className="text-slate-400 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> Analysis Results
            </p>
            <select
              className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-2 py-1.5 text-[10px] text-slate-400 focus:outline-none"
              value={filterHazard}
              onChange={e => setFilterHazard(e.target.value)}
            >
              <option value="all">All Hazard Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Microscope className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{results.length === 0 ? 'No scans completed. Upload an image to begin.' : 'No results match the filter.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => (
                <ResultCard key={r.id} result={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
