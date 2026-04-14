import { useAudioFeed } from '../hooks/useAudioFeed';
import AudioLevelMeter from './AudioLevelMeter';

export function AudioButton() {
  const [state, controls] = useAudioFeed();

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
      onToggle={handleToggle}
      onMonitorToggle={handleMonitorToggle}
    />
  );
}
