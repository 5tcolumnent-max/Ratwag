import { Component, type ReactNode } from 'react';
import { MicOff, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AudioErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-red-900/20 border-red-700/30 text-red-400">
            <MicOff className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-xs font-medium">Audio unavailable</span>
            <button
              onClick={this.handleReset}
              title="Retry"
              className="flex items-center justify-center p-0.5 rounded hover:text-red-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
