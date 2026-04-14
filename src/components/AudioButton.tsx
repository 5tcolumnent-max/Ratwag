import { useAudioFeed } from '../hooks/useAudioFeed';
import { useFeedHeartbeat } from '../hooks/useFeedHeartbeat';
import { useAuth } from '../lib/authContext';
import AudioLevelMeter from './AudioLevelMeter';

export function AudioButton() {
  const { session } = useAuth();
  const [state, controls] = useAudioFeed();

  const audioSignal = state.active
    ? Math.max(10, Math.min(100, 40 + state.level * 0.6))
    : 0;

  const heartbeat = useFeedHeartbeat({
    feedId: 'audio-mic',
    feedType: 'audio',
    feedLabel: 'Microphone Feed',
    userId: session?.user.id ?? null,
    isOnline: state.active,
    signalStrength: audioSignal,
    offlineThresholdMs: 20000,
    degradedThresholdMs: 10000,
    onReconnect: controls.start,
  });

  const handleToggle = async () => {
    if (state.active) {
      controls.stop();
    } else {
      await controls.start();
    }
  };

  const handleMonitorToggle = () => {
    if (state.monitoring) {
      controls.stopMonitor();
    } else {
      controls.startMonitor();
    }
  };

  return (
    <AudioLevelMeter
      active={state.active}
      monitoring={state.monitoring}
      level={state.level}
      error={state.error}
      heartbeat={heartbeat}
      isSecureContext={state.isSecureContext}
      devices={state.devices}
      selectedDeviceId={state.selectedDeviceId}
      onToggle={handleToggle}
      onMonitorToggle={handleMonitorToggle}
      onSelectDevice={controls.selectDevice}
      onRefreshDevices={controls.refreshDevices}
    />
  );
}
