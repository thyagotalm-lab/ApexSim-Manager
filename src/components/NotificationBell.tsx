import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Trophy,
  Scale,
  UserCheck,
  Megaphone,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification } from '../types';

interface NotificationBellProps {
  onNavigateToTab?: (tab: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToTab }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'results' | 'stewards'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'results') return n.type === 'RACE_RESULT';
    if (activeFilter === 'stewards') return n.type === 'STEWARDS_PROTEST' || n.type === 'STEWARDS_VERDICT';
    return true;
  });

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'RACE_RESULT':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'STEWARDS_PROTEST':
      case 'STEWARDS_VERDICT':
        return <Scale className="w-4 h-4 text-red-400" />;
      case 'REGISTRATION_STATUS':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'STAGE_REMINDER':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'CHAMPIONSHIP_ANNOUNCEMENT':
      default:
        return <Megaphone className="w-4 h-4 text-purple-400" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const time = new Date(isoString).getTime();
      const diffMinutes = Math.floor((now - time) / 60000);

      if (diffMinutes < 1) return 'Agora';
      if (diffMinutes < 60) return `Há ${diffMinutes} min`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Há ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ontem';
      return `Há ${diffDays} dias`;
    } catch (_) {
      return '';
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.linkTab && onNavigateToTab) {
      onNavigateToTab(n.linkTab);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
        title="Central de Notificações"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-400 animate-wiggle' : 'text-slate-400'}`} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#090d16]/95 backdrop-blur-xl border border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-950 text-red-400 border border-red-800/80 rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Marcar todas como lidas"
                >
                  <Check className="w-3 h-3" />
                  <span className="hidden sm:inline">Lidas</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Limpar todas as notificações"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto text-[11px]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === 'unread'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter('results')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === 'results'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Resultados
            </button>
            <button
              onClick={() => setActiveFilter('stewards')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === 'stewards'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Comissários
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="font-medium text-slate-400">Tudo em dia!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeFilter === 'unread'
                    ? 'Você não tem notificações não lidas.'
                    : 'Nenhuma notificação encontrada neste filtro.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 transition-colors cursor-pointer flex items-start gap-3 relative ${
                    n.read
                      ? 'bg-transparent hover:bg-slate-900/60 text-slate-400'
                      : 'bg-red-950/20 hover:bg-red-950/30 text-slate-200'
                  }`}
                >
                  {/* Icon badge */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold truncate ${n.read ? 'text-slate-300' : 'text-white'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0 whitespace-nowrap font-mono">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {n.message}
                    </p>

                    {n.linkTab && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                        <span>Acessar aba</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
