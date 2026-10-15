import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-600/80 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3">
      <WifiOff className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
      <span>Modo Offline Ativo — Exibindo dados em cache do PWA</span>
    </div>
  );
};
