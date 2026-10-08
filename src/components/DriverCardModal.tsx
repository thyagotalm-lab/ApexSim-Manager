import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Share2,
  Check,
  Zap,
  Shield,
  Trophy,
  Award,
  Flag,
  Sparkles,
  Gamepad2,
  Sliders,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { getSimRatingTier } from '../utils/simRating';
import { CountryFlag } from './CountryFlag';

interface DriverCardModalProps {
  initialDriver?: User | null;
  onClose: () => void;
}

type CardTheme = 'carbon' | 'crimson' | 'gold' | 'cyber' | 'monaco';
type CardLayout = 'vertical' | 'horizontal';

export const DriverCardModal: React.FC<DriverCardModalProps> = ({
  initialDriver,
  onClose,
}) => {
  const { currentUser, users } = useAuth();
  const { activeChampionship, getDriverCommunityTrophies } = useChampionships();

  // Selected driver
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    initialDriver?.id || currentUser?.id || users[0]?.id || ''
  );

  const [theme, setTheme] = useState<CardTheme>('carbon');
  const [layout, setLayout] = useState<CardLayout>('vertical');
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const driver = users.find((u) => u.id === selectedDriverId) || initialDriver || currentUser || users[0];

  if (!driver) return null;

  const stats = driver.stats || {
    races: 0,
    wins: 0,
    podiums: 0,
    poles: 0,
    fastestLaps: 0,
    points: 0,
    dnfs: 0,
    safetyRating: 'B 3.50',
    simRating: 3000,
  };

  const winRate = stats.races > 0 ? ((stats.wins / stats.races) * 100).toFixed(1) : '0.0';
  const podiumRate = stats.races > 0 ? ((stats.podiums / stats.races) * 100).toFixed(1) : '0.0';
  const tier = getSimRatingTier(stats.simRating);
  const comTrophies = getDriverCommunityTrophies(driver.id);

  // Theme definitions
  const themeStyles: Record<CardTheme, {
    bg: string;
    border: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
    gradient: string;
  }> = {
    carbon: {
      bg: 'bg-gradient-to-br from-zinc-950 via-neutral-900 to-black',
      border: 'border-red-600/40',
      accent: 'text-red-500',
      badgeBg: 'bg-red-950/80 border-red-700/60',
      badgeText: 'text-red-400',
      glow: 'shadow-[0_0_50px_rgba(220,38,38,0.25)]',
      gradient: 'from-red-600 to-amber-500',
    },
    crimson: {
      bg: 'bg-gradient-to-br from-red-950 via-slate-950 to-neutral-950',
      border: 'border-red-500/60',
      accent: 'text-red-400',
      badgeBg: 'bg-red-900/80 border-red-500',
      badgeText: 'text-red-200',
      glow: 'shadow-[0_0_50px_rgba(239,68,68,0.35)]',
      gradient: 'from-red-500 via-rose-600 to-amber-400',
    },
    gold: {
      bg: 'bg-gradient-to-br from-stone-950 via-amber-950/50 to-black',
      border: 'border-amber-500/50',
      accent: 'text-amber-400',
      badgeBg: 'bg-amber-950/90 border-amber-600/70',
      badgeText: 'text-amber-300',
      glow: 'shadow-[0_0_50px_rgba(245,158,11,0.3)]',
      gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    },
    cyber: {
      bg: 'bg-gradient-to-br from-[#050b14] via-[#0b172a] to-[#040810]',
      border: 'border-cyan-500/50',
      accent: 'text-cyan-400',
      badgeBg: 'bg-cyan-950/80 border-cyan-500/60',
      badgeText: 'text-cyan-300',
      glow: 'shadow-[0_0_50px_rgba(6,182,212,0.3)]',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
    },
    monaco: {
      bg: 'bg-gradient-to-br from-slate-950 via-blue-950/60 to-black',
      border: 'border-blue-500/40',
      accent: 'text-blue-400',
      badgeBg: 'bg-blue-950/80 border-blue-600/60',
      badgeText: 'text-blue-300',
      glow: 'shadow-[0_0_50px_rgba(59,130,246,0.3)]',
      gradient: 'from-blue-400 to-emerald-400',
    },
  };

  const currentTheme = themeStyles[theme];

  // Draw high-resolution canvas for PNG export
  const renderCardCanvas = async (): Promise<HTMLCanvasElement> => {
    const isVertical = layout === 'vertical';
    const width = isVertical ? 1080 : 1280;
    const height = isVertical ? 1440 : 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    // 1. Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (theme === 'gold') {
      bgGrad.addColorStop(0, '#1c1917');
      bgGrad.addColorStop(0.5, '#292010');
      bgGrad.addColorStop(1, '#0c0a09');
    } else if (theme === 'crimson') {
      bgGrad.addColorStop(0, '#3f0c0c');
      bgGrad.addColorStop(0.6, '#0f172a');
      bgGrad.addColorStop(1, '#05070a');
    } else if (theme === 'cyber') {
      bgGrad.addColorStop(0, '#031726');
      bgGrad.addColorStop(0.6, '#0b192e');
      bgGrad.addColorStop(1, '#02060c');
    } else if (theme === 'monaco') {
      bgGrad.addColorStop(0, '#0c1b33');
      bgGrad.addColorStop(0.6, '#081224');
      bgGrad.addColorStop(1, '#030712');
    } else {
      bgGrad.addColorStop(0, '#121215');
      bgGrad.addColorStop(0.5, '#090a0f');
      bgGrad.addColorStop(1, '#020305');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Diagonal Carbon racing stripes
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 14;
    for (let x = -height; x < width + height; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height, height);
      ctx.stroke();
    }
    ctx.restore();

    // Top racing stripe banner
    const stripeGrad = ctx.createLinearGradient(0, 0, width, 0);
    if (theme === 'gold') {
      stripeGrad.addColorStop(0, '#f59e0b');
      stripeGrad.addColorStop(0.5, '#fbbf24');
      stripeGrad.addColorStop(1, '#d97706');
    } else if (theme === 'cyber') {
      stripeGrad.addColorStop(0, '#06b6d4');
      stripeGrad.addColorStop(0.5, '#3b82f6');
      stripeGrad.addColorStop(1, '#8b5cf6');
    } else {
      stripeGrad.addColorStop(0, '#dc2626');
      stripeGrad.addColorStop(0.5, '#ef4444');
      stripeGrad.addColorStop(1, '#f59e0b');
    }
    ctx.fillStyle = stripeGrad;
    ctx.fillRect(0, 0, width, 16);

    // Glowing border frame
    ctx.strokeStyle = theme === 'gold' ? 'rgba(245, 158, 11, 0.4)' : theme === 'cyber' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Header Badge: APEX SIM RACING FEDERATION
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('APEX SIM RACING OFFICIAL LICENSE', 60, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText('SUPER LICENÇA DE PILOTO', 60, 140);

    // Avatar drawing
    const avatarX = 60;
    const avatarY = 180;
    const avatarSize = isVertical ? 260 : 220;

    // Outer avatar glow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.strokeStyle = stripeGrad;
    ctx.lineWidth = 6;
    ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = driver.avatar;
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
          resolve(true);
        };
        img.onerror = () => {
          // Fallback avatar letter
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 90px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(driver.name[0] || 'P', avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 30);
          ctx.textAlign = 'left';
          resolve(true);
        };
      });
    } catch (_) {
      // Fallback
    }

    // Driver Name & Info
    const infoX = isVertical ? 60 : 320;
    const infoY = isVertical ? 480 : 215;

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText(driver.name.toUpperCase(), infoX, infoY);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${driver.country || 'Brasil 🇧🇷'}  ·  ${tier.badgeIcon} ${tier.name}`, infoX, infoY + 44);

    let nextY = infoY + 44;
    if (driver.teamName) {
      nextY += 38;
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`🛡️ Time: ${driver.teamName}${driver.teamTag ? ` [${driver.teamTag}]` : ''}`, infoX, nextY);
    }

    if (activeChampionship) {
      nextY += 34;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Campeonato: ${activeChampionship.name} [${activeChampionship.simulator}]`, infoX, nextY);
    }

    // Rating Cards Grid (Sim Rating + Safety Rating)
    const ratingY = isVertical ? 620 : 360;
    const ratingW = isVertical ? (width - 140) / 2 : 360;

    // Sim Rating Box
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(60, ratingY, ratingW, 140);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, ratingY, ratingW, 140);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SIM RATING (ELO)', 85, ratingY + 45);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 54px monospace';
    ctx.fillText(`${stats.simRating || 3000}`, 85, ratingY + 110);

    // Safety Rating Box
    const srX = isVertical ? 60 + ratingW + 20 : 440;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(srX, ratingY, ratingW, 140);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(srX, ratingY, ratingW, 140);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SAFETY RATING', srX + 25, ratingY + 45);

    ctx.fillStyle = '#34d399';
    ctx.font = '900 54px monospace';
    ctx.fillText(stats.safetyRating || 'B 3.50', srX + 25, ratingY + 110);

    // Statistics Grid (6 metric tiles)
    const statsY = isVertical ? 800 : 530;
    const statCols = isVertical ? 3 : 6;
    const statW = (width - 120 - (statCols - 1) * 16) / statCols;
    const statH = 120;

    const comTrophies = getDriverCommunityTrophies(driver.id);

    const metrics = [
      { label: 'CORRIDAS', val: stats.races.toString() },
      { label: 'VITÓRIAS', val: stats.wins.toString() },
      { label: 'PÓDIOS', val: stats.podiums.toString() },
      { label: 'POLES', val: stats.poles.toString() },
      { label: 'VOLTAS RÁPIDAS', val: stats.fastestLaps.toString() },
      { label: 'PILOTO DO DIA', val: `${comTrophies.dotdCount}x` },
    ];

    metrics.forEach((m, idx) => {
      const col = idx % statCols;
      const row = Math.floor(idx / statCols);
      const x = 60 + col * (statW + 16);
      const y = statsY + row * (statH + 16);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(x, y, statW, statH);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, statW, statH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(m.label, x + 16, y + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px monospace';
      ctx.fillText(m.val, x + 16, y + 90);
    });

    // Footer Watermark
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GERADO EM APEX SIM MANAGER  ·  APEXSIM.COM.BR', width / 2, height - 40);
    ctx.textAlign = 'left';

    return canvas;
  };

  // Download Action
  const handleDownloadImage = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderCardCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanName = driver.name.toLowerCase().replace(/\s+/g, '_');
      link.download = `card_piloto_${cleanName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderCardCanvas();
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2500);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard write failed:', err);
      // Fallback: download instead
      handleDownloadImage();
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Text Summary for Discord/WhatsApp
  const handleCopyText = () => {
    const summary = `🏎️ **FICHA OFICIAL DE PILOTO — APEX SIM RACING**
👤 **Piloto:** ${driver.name} ${driver.country || '🇧🇷'}${driver.teamName ? `\n🛡️ **Time:** ${driver.teamName}${driver.teamTag ? ` [${driver.teamTag}]` : ''}` : ''}
🏆 **Categoria:** ${tier.badgeIcon} ${tier.name}
⚡ **Sim Rating:** ${stats.simRating} Elo
🛡️ **Safety Rating:** ${stats.safetyRating}
📊 **Estatísticas:** ${stats.races} Corridas | ${stats.wins} Vitórias (${winRate}%) | ${stats.podiums} Pódios | ${stats.poles} Poles
🎮 **Plataforma:** ${driver.gamingPlatform || 'Steam'} (ID: ${driver.gamingId || 'N/A'})
🔗 Gerado via Apex Sim Manager`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#080d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-700/60 text-red-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Gerador de Card Oficial do Piloto
              </h3>
              <p className="text-xs text-slate-400">
                Personalize, baixe em alta resolução (PNG) ou compartilhe nas redes sociais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Toolbar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Driver Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Piloto:</span>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.stats?.simRating || 3000} SR
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1">Tema:</span>
            {(['carbon', 'crimson', 'gold', 'cyber', 'monaco'] as CardTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                  theme === t
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Layout Orientation */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setLayout('vertical')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                layout === 'vertical' ? 'bg-red-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stories (9:16)
            </button>
            <button
              onClick={() => setLayout('horizontal')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                layout === 'horizontal' ? 'bg-red-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Feed (16:9)
            </button>
          </div>
        </div>

        {/* Live Card Preview Container */}
        <div className="p-4 sm:p-6 bg-[#04070e] flex items-center justify-center overflow-auto max-h-[62vh]">
          <div
            ref={cardRef}
            className={`relative rounded-2xl border-2 transition-all duration-300 p-5 sm:p-7 ${currentTheme.bg} ${currentTheme.border} ${currentTheme.glow} ${
              layout === 'vertical' ? 'w-full max-w-sm sm:max-w-md' : 'w-full max-w-2xl'
            }`}
          >
            {/* Top subtle carbon line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentTheme.gradient} rounded-t-2xl`} />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-mono text-slate-400 block font-semibold">
                  OFFICIAL DRIVER LICENSE · APEX RACING
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Super Licença de Piloto
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-red-400">
                <Gamepad2 className="w-5 h-5 text-red-500" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">APEX</span>
              </div>
            </div>

            {/* Pilot Identity Row */}
            <div className={`flex ${layout === 'vertical' ? 'flex-col sm:flex-row' : 'flex-row'} items-center gap-4 mb-5`}>
              <div className="relative shrink-0">
                <img
                  src={driver.avatar}
                  alt={driver.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-700 shadow-xl"
                />
              </div>

              <div className="min-w-0 text-center sm:text-left flex-1">
                <h4 className="text-lg sm:text-xl font-black text-white truncate font-display">
                  {driver.name}
                </h4>
                <div className="text-xs text-slate-300 flex items-center justify-center sm:justify-start gap-2 mt-0.5 flex-wrap">
                  <span className="font-semibold">{driver.country || 'Brasil 🇧🇷'}</span>
                  <span>·</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentTheme.badgeBg} ${currentTheme.badgeText}`}>
                    {tier.name}
                  </span>
                  {comTrophies.dotdCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5 text-amber-400" />
                      {comTrophies.dotdCount}x Piloto do Dia
                    </span>
                  )}
                </div>
                {driver.teamName && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-xs text-slate-200">
                    <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="font-semibold text-white truncate">{driver.teamName}</span>
                    {driver.teamTag && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[10px] font-bold text-amber-400 border border-slate-700 shadow-sm shrink-0">
                        {driver.teamTag}
                      </span>
                    )}
                  </div>
                )}
                {driver.gamingId && (
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {driver.gamingPlatform || 'Steam'}: <strong className="text-white">{driver.gamingId}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Sim Rating & Safety Rating Badges */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/40">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Sim Rating (Elo)
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-0.5">
                  {stats.simRating || 3000}
                </div>
                <div className="text-[10px] text-amber-300/80 font-medium">
                  {tier.name}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Safety Rating
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                  {stats.safetyRating || 'B 3.50'}
                </div>
                <div className="text-[10px] text-emerald-300/80 font-medium">
                  Pontos Limpos
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">CORRIDAS</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">{stats.races}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">VITÓRIAS</div>
                <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">{stats.wins}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">PÓDIOS</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">{stats.podiums}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">POLES</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">{stats.poles}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">V. RÁPIDAS</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">{stats.fastestLaps}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">WIN RATE</div>
                <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">{winRate}%</div>
              </div>
            </div>

            {/* Footer Seal */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>FEDERAÇÃO OFICIAL APEX</span>
              <span>APEXSIM.COM.BR</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Resolução máxima ideal para Instagram Stories, Feed e Discord</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Copy Text Summary */}
            <button
              onClick={handleCopyText}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Copiar texto para Discord ou WhatsApp"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            {/* Copy PNG image to clipboard */}
            <button
              onClick={handleCopyImage}
              disabled={isExporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Copiar imagem PNG para a área de transferência"
            >
              {copiedImage ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedImage ? 'Imagem Copiada!' : 'Copiar Imagem'}</span>
            </button>

            {/* Download PNG image */}
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Renderizando...' : 'Baixar Imagem (PNG)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
