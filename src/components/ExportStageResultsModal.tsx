import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Share2,
  Trophy,
  Zap,
  Award,
  Loader2,
  Flag,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Championship, RaceResultItem, StageRound } from '../types';
import { getTeamCode, getTeamsBySimulator } from '../data/f1Teams';
import { useAuth } from '../context/AuthContext';

interface ExportStageResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: StageRound | null;
  championship: Championship;
  initialRaceType?: 'main' | 'sprint';
}

type AspectRatioOption = '18:9' | '9:18';

export const ExportStageResultsModal: React.FC<ExportStageResultsModalProps> = ({
  isOpen,
  onClose,
  stage,
  championship,
  initialRaceType = 'main',
}) => {
  const { users } = useAuth();
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('18:9');
  const [raceType, setRaceType] = useState<'main' | 'sprint'>(
    initialRaceType || (stage?.hasSprint && !stage?.results?.length && stage?.sprintResults?.length ? 'sprint' : 'main')
  );
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const officialTeams = getTeamsBySimulator(championship.simulator);
  const getTeamColor = useCallback(
    (teamName: string) => {
      const found = officialTeams.find((t) => t.name === teamName || t.shortName === teamName);
      return found ? found.color : '#e10600';
    },
    [officialTeams]
  );

  // Sync raceType when stage changes or modal opens
  useEffect(() => {
    if (stage) {
      if (initialRaceType) {
        setRaceType(initialRaceType);
      } else if (stage.hasSprint && !stage.results?.length && stage.sprintResults?.length) {
        setRaceType('sprint');
      } else {
        setRaceType('main');
      }
    }
  }, [stage, initialRaceType]);

  // Results list for selected race type
  const activeResults: RaceResultItem[] = (
    raceType === 'sprint' ? stage?.sprintResults : stage?.results
  ) || [];

  // Sort finishing grid: FINISHED by finishPosition, then DNF, DNS, DSQ
  const sortedFinishGrid = [...activeResults].sort((a, b) => {
    const statusWeight = (s: string) => {
      if (s === 'FINISHED') return 1;
      if (s === 'DNF') return 2;
      if (s === 'DSQ') return 3;
      if (s === 'DNS') return 4;
      return 5;
    };
    const diffStatus = statusWeight(a.status) - statusWeight(b.status);
    if (diffStatus !== 0) return diffStatus;
    return (a.finishPosition || 99) - (b.finishPosition || 99);
  });

  // Resolve Pole Position Driver & Lap Time
  const poleDriverId = raceType === 'sprint' ? stage?.sprintPoleDriverId || stage?.poleDriverId : stage?.poleDriverId;
  const poleDriverResult =
    activeResults.find((r) => r.hasPole) ||
    (poleDriverId ? activeResults.find((r) => r.driverId === poleDriverId) : undefined) ||
    activeResults.find((r) => r.gridPosition === 1);

  const poleDriverUser = poleDriverResult
    ? users.find((u) => u.id === poleDriverResult.driverId || u.name.toLowerCase().trim() === poleDriverResult.driverName.toLowerCase().trim())
    : undefined;

  const poleDriverName = poleDriverUser?.name || poleDriverResult?.driverName || 'Não Informado';
  const poleTeamName = poleDriverResult?.teamName || '';
  const poleCarNumber = poleDriverResult?.number || poleDriverUser?.racingNumber || 0;
  const poleTime =
    (raceType === 'sprint' ? stage?.sprintPoleTime : stage?.poleTime) ||
    (poleDriverResult?.hasPole && poleDriverResult?.totalTime ? poleDriverResult.totalTime : '') ||
    'Tempo Não Registrado';

  // Resolve Fastest Lap Driver & Lap Time
  const flDriverId = raceType === 'sprint' ? stage?.sprintFastestLapDriverId || stage?.fastestLapDriverId : stage?.fastestLapDriverId;
  const flDriverResult =
    activeResults.find((r) => r.hasFastestLap) ||
    (flDriverId ? activeResults.find((r) => r.driverId === flDriverId) : undefined);

  const flDriverUser = flDriverResult
    ? users.find((u) => u.id === flDriverResult.driverId || u.name.toLowerCase().trim() === flDriverResult.driverName.toLowerCase().trim())
    : undefined;

  const flDriverName = flDriverUser?.name || flDriverResult?.driverName || 'Não Informado';
  const flTeamName = flDriverResult?.teamName || '';
  const flCarNumber = flDriverResult?.number || flDriverUser?.racingNumber || 0;
  const flTime =
    (raceType === 'sprint' ? stage?.sprintFastestLapTime : stage?.fastestLapTime) ||
    (flDriverResult?.hasFastestLap && flDriverResult?.totalTime ? flDriverResult.totalTime : '') ||
    'Tempo Não Registrado';

  // Helper to split name in First and SURNAME (Formula 1 broadcast signature)
  const formatF1Name = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { first: '', last: parts[0].toUpperCase() };
    const first = parts.slice(0, -1).join(' ').toUpperCase();
    const last = parts[parts.length - 1].toUpperCase();
    return { first, last };
  };

  // Draw High-Resolution Broadcast Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions:
    // 18:9 -> 2160 x 1080 px (Ultra HD Widescreen)
    // 9:18 -> 1080 x 2160 px (Ultra HD Mobile / Stories / Reels)
    const width = aspectRatio === '18:9' ? 2160 : 1080;
    const height =
      aspectRatio === '18:9'
        ? 1080
        : Math.max(2160, 520 + Math.max(sortedFinishGrid.length, 12) * 72 + 100);

    canvas.width = width;
    canvas.height = height;

    // 1. Base F1 Broadcast Background: Charcoal (#15151e)
    ctx.fillStyle = '#15151e';
    ctx.fillRect(0, 0, width, height);

    // 2. F1 Carbon Fiber Weave Pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
    ctx.lineWidth = 1;
    for (let i = -height; i < width + height; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Official F1 Red Top Border Strip
    ctx.fillStyle = '#e10600';
    ctx.fillRect(0, 0, width, 10);

    // Draw F1 Logo Parallelogram Badge
    const drawF1BrandBadge = (x: number, y: number, h: number = 44) => {
      ctx.save();
      const w = 110;
      ctx.fillStyle = '#e10600';
      ctx.beginPath();
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - 12, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'italic 900 28px "Arial Black", Impact, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('F1', x + w / 2 - 2, y + h / 2 + 1);
      ctx.restore();
    };

    // Helper: Rounded Rectangle
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, strokeW: number = 1) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      ctx.restore();
    };

    // ==============================================================
    // 18:9 WIDESCREEN BROADCAST LAYOUT (2160 x 1080)
    // ==============================================================
    if (aspectRatio === '18:9') {
      const marginX = 70;
      let topY = 40;

      // 1. Top Ribbon
      drawF1BrandBadge(marginX, topY, 44);

      ctx.font = 'italic 800 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('FORMULA 1®', marginX + 130, topY + 22);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#949498';
      ctx.fillText(
        `APEXSIM · SIMULADOR: ${championship.simulator.toUpperCase()} · ${championship.category.toUpperCase()}`,
        marginX + 280,
        topY + 22
      );

      // Round on Top Right
      ctx.textAlign = 'right';
      ctx.font = 'italic 800 18px system-ui, sans-serif';
      ctx.fillStyle = '#e10600';
      ctx.fillText(
        `ROUND ${stage.roundNumber} / ${championship.stages.length} · ${stage.trackCountry.toUpperCase()}`,
        width - marginX,
        topY + 22
      );
      ctx.textAlign = 'left';

      topY += 56;

      // 2. Stage Main Title
      ctx.font = 'italic 900 44px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      const raceTitleText =
        raceType === 'sprint'
          ? `SPRINT RACE RESULTS · ${stage.trackName.toUpperCase()}`
          : `RACE RESULTS · ${stage.trackName.toUpperCase()}`;
      ctx.fillText(raceTitleText, marginX, topY + 32);

      // Subtitle
      ctx.font = 'bold 17px monospace';
      ctx.fillStyle = '#e10600';
      ctx.fillText('OFFICIAL CLASSIFICATION', marginX, topY + 62);

      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(
        ` · ${championship.name.toUpperCase()} · ${stage.circuitLength || ''} · ${stage.weather.toUpperCase()} · ${stage.date} ${stage.time}`,
        marginX + 240,
        topY + 62
      );

      // Red Dividing Line
      ctx.strokeStyle = '#e10600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(marginX, topY + 76);
      ctx.lineTo(width - marginX, topY + 76);
      ctx.stroke();

      topY += 92;

      // 3. Highlight Cards Bar (Pole Position & Fastest Lap)
      const cardW = (width - marginX * 2 - 30) / 2;
      const cardH = 92;

      // --- CARD 1: POLE POSITION ---
      const poleX = marginX;
      drawRoundedRect(poleX, topY, cardW, cardH, 10, 'rgba(234, 179, 8, 0.08)', 'rgba(234, 179, 8, 0.4)', 2);

      // Left Gold Accent Bar
      ctx.fillStyle = '#eab308';
      ctx.fillRect(poleX, topY, 8, cardH);

      // Card Header
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#eab308';
      ctx.fillText('🏁 POLE POSITION (QUALIFYING)', poleX + 22, topY + 24);

      // Driver Name & Number
      const poleF1 = formatF1Name(poleDriverName);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#eab308';
      ctx.fillText(`#${poleCarNumber || '—'}`, poleX + 22, topY + 54);

      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${poleF1.first} `, poleX + 66, topY + 54);
      const poleFirstW = ctx.measureText(`${poleF1.first} `).width;

      ctx.font = 'italic 900 24px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(poleF1.last, poleX + 66 + poleFirstW, topY + 54);

      // Team & Pole Time on right
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(poleTeamName || 'Equipe Oficial', poleX + 22, topY + 76);

      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#eab308';
      ctx.fillText('TEMPO DA POLE', poleX + cardW - 22, topY + 32);

      ctx.font = 'italic 900 24px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(poleTime, poleX + cardW - 22, topY + 62);
      ctx.textAlign = 'left';

      // --- CARD 2: FASTEST LAP ---
      const flX = marginX + cardW + 30;
      drawRoundedRect(flX, topY, cardW, cardH, 10, 'rgba(168, 85, 247, 0.08)', 'rgba(168, 85, 247, 0.4)', 2);

      // Left Purple Accent Bar
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(flX, topY, 8, cardH);

      // Card Header
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#c084fc';
      ctx.fillText('⚡ VOLTA MAIS RÁPIDA (FASTEST LAP)', flX + 22, topY + 24);

      // Driver Name & Number
      const flF1 = formatF1Name(flDriverName);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`#${flCarNumber || '—'}`, flX + 22, topY + 54);

      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${flF1.first} `, flX + 66, topY + 54);
      const flFirstW = ctx.measureText(`${flF1.first} `).width;

      ctx.font = 'italic 900 24px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(flF1.last, flX + 66 + flFirstW, topY + 54);

      // Team & FL Time on right
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(flTeamName || 'Equipe Oficial', flX + 22, topY + 76);

      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#c084fc';
      ctx.fillText('MELHOR TEMPO', flX + cardW - 22, topY + 32);

      ctx.font = 'italic 900 24px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(flTime, flX + cardW - 22, topY + 62);
      ctx.textAlign = 'left';

      // 4. Two-Column Race Results Grid
      topY += cardH + 24;

      const gridColW = (width - marginX * 2 - 30) / 2;
      const totalDrivers = sortedFinishGrid.length;
      const colSplit = Math.ceil(totalDrivers / 2);
      const col1Drivers = sortedFinishGrid.slice(0, colSplit);
      const col2Drivers = sortedFinishGrid.slice(colSplit);

      const rowH = 48;

      // Table Header Drawer Helper
      const drawTableHeader = (x: number, y: number, colWidth: number) => {
        ctx.fillStyle = '#0f1017';
        ctx.fillRect(x, y, colWidth, 32);

        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = '#949498';
        ctx.fillText('POS', x + 16, y + 20);
        ctx.fillText('Nº', x + 62, y + 20);
        ctx.fillText('PILOTO / EQUIPE', x + 110, y + 20);

        ctx.textAlign = 'right';
        ctx.fillText('DIFERENÇA / STATUS', x + colWidth - 110, y + 20);
        ctx.fillText('PTS', x + colWidth - 20, y + 20);
        ctx.textAlign = 'left';

        ctx.strokeStyle = '#2d2d3a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 32);
        ctx.lineTo(x + colWidth, y + 32);
        ctx.stroke();
      };

      drawTableHeader(marginX, topY, gridColW);
      drawTableHeader(marginX + gridColW + 30, topY, gridColW);

      topY += 36;

      // Render Driver Row in Column
      const renderDriverRow = (item: RaceResultItem, index: number, x: number, y: number, colWidth: number) => {
        const u = users.find((user) => user.id === item.driverId || user.name.toLowerCase().trim() === item.driverName.toLowerCase().trim());
        const dName = u?.name || item.driverName;
        const f1Name = formatF1Name(dName);
        const teamColor = getTeamColor(item.teamName);
        const pos = item.finishPosition || index + 1;

        // Alternate Row Background
        const isOdd = index % 2 === 1;
        ctx.fillStyle = isOdd ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x, y, colWidth, rowH);

        // Left Team Color Accent Bar
        ctx.fillStyle = teamColor;
        ctx.fillRect(x, y, 5, rowH);

        // Position Badge
        let posBg = '#1f2029';
        let posFg = '#ffffff';
        if (pos === 1 && item.status === 'FINISHED') {
          posBg = '#eab308';
          posFg = '#000000';
        } else if (pos === 2 && item.status === 'FINISHED') {
          posBg = '#94a3b8';
          posFg = '#000000';
        } else if (pos === 3 && item.status === 'FINISHED') {
          posBg = '#b45309';
          posFg = '#ffffff';
        }

        drawRoundedRect(x + 12, y + 10, 36, 28, 6, posBg);
        ctx.font = 'italic 900 15px system-ui, sans-serif';
        ctx.fillStyle = posFg;
        ctx.textAlign = 'center';
        ctx.fillText(`${pos}`, x + 30, y + 29);
        ctx.textAlign = 'left';

        // Car Number
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`#${item.number}`, x + 58, y + 29);

        // Driver First & SURNAME
        ctx.font = 'normal 15px system-ui, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`${f1Name.first} `, x + 106, y + 23);
        const fWidth = ctx.measureText(`${f1Name.first} `).width;

        ctx.font = 'italic 800 17px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(f1Name.last, x + 106 + fWidth, y + 23);

        // Badges: Pole and Fastest Lap
        let badgeOffset = x + 106 + fWidth + ctx.measureText(f1Name.last).width + 10;
        if (item.hasPole || item.driverId === poleDriverId) {
          drawRoundedRect(badgeOffset, y + 11, 46, 16, 4, '#eab308');
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.fillStyle = '#000000';
          ctx.fillText('POLE', badgeOffset + 8, y + 23);
          badgeOffset += 52;
        }
        if (item.hasFastestLap || item.driverId === flDriverId) {
          drawRoundedRect(badgeOffset, y + 11, 28, 16, 4, '#a855f7');
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('FL', badgeOffset + 7, y + 23);
        }

        // Subline: Team Name + Code
        const code = getTeamCode(item.teamName, championship.simulator);
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`[${code}] ${item.teamName}`, x + 106, y + 40);

        // Interval / Gap / Status on Right
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px monospace';
        if (item.status === 'FINISHED') {
          ctx.fillStyle = pos === 1 ? '#eab308' : '#94a3b8';
          const gapText = pos === 1 ? 'VENCEDOR' : item.gap || '+ INTERVAL';
          ctx.fillText(gapText, x + colWidth - 95, y + 29);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillText(item.status, x + colWidth - 95, y + 29);
        }

        // Points Awarded
        const pts = item.pointsAwarded || 0;
        ctx.font = 'italic 900 16px system-ui, sans-serif';
        ctx.fillStyle = pts > 0 ? '#ffffff' : '#64748b';
        ctx.fillText(pts > 0 ? `+${pts}` : '0', x + colWidth - 20, y + 29);
        ctx.textAlign = 'left';

        // Bottom separator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + rowH);
        ctx.lineTo(x + colWidth, y + rowH);
        ctx.stroke();
      };

      // Draw Column 1
      col1Drivers.forEach((item, idx) => {
        renderDriverRow(item, idx, marginX, topY + idx * rowH, gridColW);
      });

      // Draw Column 2
      col2Drivers.forEach((item, idx) => {
        renderDriverRow(item, colSplit + idx, marginX + gridColW + 30, topY + idx * rowH, gridColW);
      });

      // 5. Official Broadcast Bottom Footer
      const footerY = height - 26;
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#e10600';
      ctx.fillText('APEXSIM MANAGER · PLATAFORMA OFICIAL DE AUTOMOBILISMO VIRTUAL', marginX, footerY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#949498';
      ctx.fillText('OFFICIAL BROADCAST GRAPHICS · 18:9 ULTRA HD', width - marginX, footerY);
      ctx.textAlign = 'left';
    } else {
      // ==============================================================
      // 9:18 VERTICAL STORIES LAYOUT (1080 x 2160)
      // Matches Formula 1 Instagram/Stories Post-Race Graphics
      // ==============================================================
      const marginX = 40;
      let topY = 40;

      // 1. Top Ribbon
      drawF1BrandBadge(marginX, topY, 44);

      ctx.font = 'italic 800 20px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('FORMULA 1®', marginX + 130, topY + 22);

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#949498';
      ctx.fillText(`APEXSIM · ${championship.simulator.toUpperCase()}`, marginX + 275, topY + 22);

      ctx.textAlign = 'right';
      ctx.font = 'italic 800 17px system-ui, sans-serif';
      ctx.fillStyle = '#e10600';
      ctx.fillText(`ROUND ${stage.roundNumber} / ${championship.stages.length}`, width - marginX, topY + 22);
      ctx.textAlign = 'left';

      topY += 60;

      // 2. Stage Main Title
      ctx.font = 'italic 900 42px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      const raceTitleText =
        raceType === 'sprint'
          ? `SPRINT RACE RESULTS`
          : `OFFICIAL RACE RESULTS`;
      ctx.fillText(raceTitleText, marginX, topY + 32);

      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillStyle = '#e10600';
      ctx.fillText(stage.trackName.toUpperCase(), marginX, topY + 68);

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        `${stage.trackCountry.toUpperCase()} · ${stage.circuitLength || ''} · ${stage.weather.toUpperCase()} · ${stage.date}`,
        marginX,
        topY + 95
      );

      // Red Dividing Line
      ctx.strokeStyle = '#e10600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(marginX, topY + 110);
      ctx.lineTo(width - marginX, topY + 110);
      ctx.stroke();

      topY += 128;

      // 3. Highlight Cards (Pole Position & Fastest Lap) Side-by-Side
      const cardW = (width - marginX * 2 - 20) / 2;
      const cardH = 100;

      // Pole Card
      drawRoundedRect(marginX, topY, cardW, cardH, 10, 'rgba(234, 179, 8, 0.08)', 'rgba(234, 179, 8, 0.4)', 2);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(marginX, topY, 8, cardH);

      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#eab308';
      ctx.fillText('🏁 POLE POSITION', marginX + 20, topY + 24);

      const poleF1 = formatF1Name(poleDriverName);
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#eab308';
      ctx.fillText(`#${poleCarNumber || '—'}`, marginX + 20, topY + 52);

      ctx.font = 'italic 900 20px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(poleF1.last, marginX + 58, topY + 52);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(poleTime, marginX + 20, topY + 80);

      // Fastest Lap Card
      const flX = marginX + cardW + 20;
      drawRoundedRect(flX, topY, cardW, cardH, 10, 'rgba(168, 85, 247, 0.08)', 'rgba(168, 85, 247, 0.4)', 2);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(flX, topY, 8, cardH);

      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#c084fc';
      ctx.fillText('⚡ VOLTA MAIS RÁPIDA', flX + 20, topY + 24);

      const flF1 = formatF1Name(flDriverName);
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`#${flCarNumber || '—'}`, flX + 20, topY + 52);

      ctx.font = 'italic 900 20px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(flF1.last, flX + 58, topY + 52);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(flTime, flX + 20, topY + 80);

      topY += cardH + 26;

      // 4. Single-Column Full Vertical Finishing Grid
      const tableW = width - marginX * 2;
      const rowH = 68;

      // Table Header
      ctx.fillStyle = '#0f1017';
      ctx.fillRect(marginX, topY, tableW, 36);

      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#949498';
      ctx.fillText('POS', marginX + 18, topY + 23);
      ctx.fillText('Nº', marginX + 70, topY + 23);
      ctx.fillText('PILOTO / EQUIPE', marginX + 120, topY + 23);

      ctx.textAlign = 'right';
      ctx.fillText('GAP / STATUS', marginX + tableW - 120, topY + 23);
      ctx.fillText('PTS', marginX + tableW - 24, topY + 23);
      ctx.textAlign = 'left';

      topY += 40;

      // Render Each Driver Row
      sortedFinishGrid.forEach((item, index) => {
        const u = users.find((user) => user.id === item.driverId || user.name.toLowerCase().trim() === item.driverName.toLowerCase().trim());
        const dName = u?.name || item.driverName;
        const f1Name = formatF1Name(dName);
        const teamColor = getTeamColor(item.teamName);
        const pos = item.finishPosition || index + 1;
        const y = topY + index * rowH;

        // Alternate Row Background
        ctx.fillStyle = index % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(marginX, y, tableW, rowH);

        // Team Color Bar
        ctx.fillStyle = teamColor;
        ctx.fillRect(marginX, y, 6, rowH);

        // Pos Badge
        let posBg = '#1f2029';
        let posFg = '#ffffff';
        if (pos === 1 && item.status === 'FINISHED') {
          posBg = '#eab308';
          posFg = '#000000';
        } else if (pos === 2 && item.status === 'FINISHED') {
          posBg = '#94a3b8';
          posFg = '#000000';
        } else if (pos === 3 && item.status === 'FINISHED') {
          posBg = '#b45309';
          posFg = '#ffffff';
        }

        drawRoundedRect(marginX + 14, y + 14, 42, 40, 8, posBg);
        ctx.font = 'italic 900 20px system-ui, sans-serif';
        ctx.fillStyle = posFg;
        ctx.textAlign = 'center';
        ctx.fillText(`${pos}`, marginX + 35, y + 41);
        ctx.textAlign = 'left';

        // Car Number
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`#${item.number}`, marginX + 68, y + 41);

        // Driver First & SURNAME
        ctx.font = 'normal 18px system-ui, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`${f1Name.first} `, marginX + 120, y + 32);
        const fWidth = ctx.measureText(`${f1Name.first} `).width;

        ctx.font = 'italic 800 21px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(f1Name.last, marginX + 120 + fWidth, y + 32);

        // Badges: Pole and Fastest Lap
        let badgeOffset = marginX + 120 + fWidth + ctx.measureText(f1Name.last).width + 12;
        if (item.hasPole || item.driverId === poleDriverId) {
          drawRoundedRect(badgeOffset, y + 16, 52, 20, 5, '#eab308');
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillStyle = '#000000';
          ctx.fillText('POLE', badgeOffset + 10, y + 31);
          badgeOffset += 60;
        }
        if (item.hasFastestLap || item.driverId === flDriverId) {
          drawRoundedRect(badgeOffset, y + 16, 32, 20, 5, '#a855f7');
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('FL', badgeOffset + 9, y + 31);
        }

        // Subline: Team Name + Code
        const code = getTeamCode(item.teamName, championship.simulator);
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`[${code}] ${item.teamName}`, marginX + 120, y + 55);

        // Interval / Gap / Status on Right
        ctx.textAlign = 'right';
        ctx.font = 'bold 16px monospace';
        if (item.status === 'FINISHED') {
          ctx.fillStyle = pos === 1 ? '#eab308' : '#94a3b8';
          const gapText = pos === 1 ? 'VENCEDOR' : item.gap || '+ INTERVAL';
          ctx.fillText(gapText, marginX + tableW - 110, y + 41);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillText(item.status, marginX + tableW - 110, y + 41);
        }

        // Points Awarded
        const pts = item.pointsAwarded || 0;
        ctx.font = 'italic 900 20px system-ui, sans-serif';
        ctx.fillStyle = pts > 0 ? '#ffffff' : '#64748b';
        ctx.fillText(pts > 0 ? `+${pts}` : '0', marginX + tableW - 24, y + 41);
        ctx.textAlign = 'left';

        // Bottom separator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginX, y + rowH);
        ctx.lineTo(marginX + tableW, y + rowH);
        ctx.stroke();
      });

      // 5. Official Broadcast Bottom Footer
      const footerY = height - 28;
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#e10600';
      ctx.fillText('APEXSIM MANAGER · PLATAFORMA OFICIAL DE AUTOMOBILISMO VIRTUAL', marginX, footerY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#949498';
      ctx.fillText('OFFICIAL BROADCAST GRAPHICS · 9:18 STORIES', width - marginX, footerY);
      ctx.textAlign = 'left';
    }
  }, [
    aspectRatio,
    championship,
    stage,
    raceType,
    sortedFinishGrid,
    poleDriverName,
    poleTeamName,
    poleCarNumber,
    poleTime,
    poleDriverId,
    flDriverName,
    flTeamName,
    flCarNumber,
    flTime,
    flDriverId,
    getTeamColor,
    users,
  ]);

  // Re-draw canvas whenever aspect ratio, race type or data changes
  useEffect(() => {
    if (isOpen && stage) {
      const timer = setTimeout(() => {
        drawCanvas();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, aspectRatio, raceType, stage, drawCanvas]);

  if (!isOpen || !stage) return null;

  // Handle Download Image (PNG in Ultra HD)
  const handleDownload = () => {
    setIsExporting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        setIsExporting(false);
        return;
      }

      const cleanTrack = stage.trackName.replace(/\s+/g, '_').toLowerCase();
      const fileName = `resultado_etapa_${stage.roundNumber}_${cleanTrack}_${raceType}_${aspectRatio.replace(':', 'x')}.png`;
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao exportar imagem:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Copy to Clipboard
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          const dataUrl = canvas.toDataURL('image/png');
          await navigator.clipboard.writeText(dataUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0b101b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                Exportar Gráfico Oficial dos Resultados da Etapa
              </h3>
              <p className="text-xs text-slate-400">
                Etapa {stage.roundNumber}: {stage.trackName} · {championship.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Aspect Ratio Selector, Sprint/Main Toggle & Actions */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setAspectRatio('18:9')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  aspectRatio === '18:9'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>18:9 (Horizontal / Widescreen)</span>
              </button>

              <button
                onClick={() => setAspectRatio('9:18')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  aspectRatio === '9:18'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:18 (Vertical / Stories)</span>
              </button>
            </div>

            {/* Race Type Selector (If stage has sprint) */}
            {stage.hasSprint && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setRaceType('main')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    raceType === 'main'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Corrida Principal</span>
                </button>
                <button
                  onClick={() => setRaceType('sprint')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    raceType === 'sprint'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Corrida Sprint</span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Copiar imagem para área de transferência"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Imagem</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-red-950 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Baixado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PNG em Alta Resolução</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Canvas Preview Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#060910] flex items-center justify-center min-h-[380px]">
          <div className="relative flex flex-col items-center">
            {/* Visual Canvas Display */}
            <div
              className={`border border-slate-800 rounded-xl shadow-2xl overflow-hidden bg-slate-950 transition-all ${
                aspectRatio === '18:9'
                  ? 'w-full max-w-[820px] aspect-[18/9]'
                  : 'w-[280px] sm:w-[340px] aspect-[9/18]'
              }`}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5 text-center font-mono">
              Resolução gerada: {aspectRatio === '18:9' ? '2160 x 1080 px (Ultra HD Widescreen)' : '1080 x 2160 px (Ultra HD Stories / Vertical)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
