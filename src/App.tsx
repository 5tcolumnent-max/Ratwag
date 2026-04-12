import { Shield, RefreshCw } from 'lucide-react';
import { useAuth } from './lib/authContext';
import { AuthPage } from './components/AuthPage';
import SovereignShell from './components/SovereignShell';

function App() {
  const { session, loading: authLoading, isPasswordRecovery } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Shield className="w-10 h-10 text-sky-400" />
            <RefreshCw className="w-4 h-4 text-sky-600 absolute -bottom-1 -right-1 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 tracking-wide">Initializing Sovereign 3.0...</p>
        </div>
      </div>
    );
  }

  if (!session || isPasswordRecovery) {
    return <AuthPage />;
  }

  return <SovereignShell />;
}

export default App;
