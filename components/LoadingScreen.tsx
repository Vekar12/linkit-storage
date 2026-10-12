import { useState, useEffect } from 'react';
import { Link2 } from 'lucide-react';

const messages = [
  'Loading your projects...',
  'Waking up the server...',
  'Almost there...',
  'Fetching your data...',
  'Just a moment...',
  'Preparing your dashboard...',
];

export default function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 3000);
    return () => { clearInterval(dotTimer); clearInterval(msgTimer); };
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
      >
        <Link2 size={28} className="text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 font-medium">{messages[msgIndex]}{dots}</p>
        <p className="text-xs text-gray-400 mt-2">This may take a few seconds on first visit</p>
      </div>
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ animation: 'loading-bar 2s ease-in-out infinite' }}
        />
      </div>
      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
