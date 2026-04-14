import { Volume2 } from 'lucide-react';

export function AudioButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: '#FFD700',
        color: '#000',
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}
    >
      <Volume2 size={20} />
      <span>Audio Output</span>
    </button>
  );
}
