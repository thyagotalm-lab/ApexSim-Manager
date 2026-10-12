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
  Users,
  Shield,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Championship, DriverStanding } from '../types';
import { getTeamCode, getTeamsBySimulator } from '../data/f1Teams';
import { toBlob, toPng } from 'html-to-image';

interface ConstructorStandingItem {
  rank: number;
  teamName: string;
  totalPoints: number;
  wins: number;
  podiums: number;
  gap: string;
  driverNames: string[];
}

interface ExportStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drivers' | 'constructors';
  championship: Championship;
  driverStandings?: DriverStanding[];
  constructorStandings?: ConstructorStandingItem[];
}

type AspectRatioOption = '18:9' | '9:18';

export const ExportStandingsModal: React.FC<ExportStandingsModalProps> = ({
  isOpen,
  onClose,
  type,
  championship,
  driverStandings = [],
  constructorStandings = [],
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('18:9');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const officialTeams = getTeamsBySimulator(championship.simulator);
  const getTeamColor = (teamName: string) => {
    const found = officialTeams.find((t) => t.name === teamName || t.shortName === teamName);
    return found ? found.color : '#e10600';
  };

  const completedStagesCount = championship.stages.filter(
    (s) => s.status === 'Concluída' && s.results && s.results.length > 0
  ).length;

  const isDriver = type === 'drivers';
  const title = isDriver
    ? 'Classificação Oficial de Pilotos'
    : 'Campeonato Mundial de Construtores';

  // Draw high-resolution canvas with Official Formula 1 broadcast visual identity
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions:
    // 18:9 -> 2160 x 1080 px (Ultra HD Widescreen)
    // 9:18 -> 1080 x 2160 px (Ultra HD Mobile / Stories)
    const listTotal = isDriver ? driverStandings.length : constructorStandings.length;
    const remainingCountEst = Math.max(0, listTotal - 1);
    const width = aspectRatio === '18:9' ? 2160 : 1080;
    const height =
      aspectRatio === '18:9'
        ? 1080
        : Math.max(2160, 420 + remainingCountEst * 54 + 90);

    canvas.width = width;
    canvas.height = height;

    // 1. Base F1 Broadcast Background: Authentic F1 Charcoal (#15151e)
    ctx.fillStyle = '#15151e';
    ctx.fillRect(0, 0, width, height);

    // 2. F1 Carbon Fiber Weave Micro-pattern
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

    // Helper: Split driver name into First and SURNAME (signature F1 TV broadcast style)
    const formatF1Name = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return { first: '', last: parts[0].toUpperCase() };
      const first = parts.slice(0, -1).join(' ').toUpperCase();
      const last = parts[parts.length - 1].toUpperCase();
      return { first, last };
    };

    // Helper: Draw Official F1 Logo Badge with angled racing cut
    const drawF1BrandBadge = (x: number, y: number, h: number = 44) => {
      ctx.save();
      const w = 110;
      // Angled parallelogram badge
      ctx.fillStyle = '#e10600';
      ctx.beginPath();
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - 12, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();

      // Bold italic F1 text
      ctx.font = 'italic 900 28px "Arial Black", Impact, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('F1', x + w / 2 - 2, y + h / 2 + 1);
      ctx.restore();
    };

    if (aspectRatio === '18:9') {
      // ==============================================================
      // 18:9 WIDESCREEN BROADCAST LAYOUT (2160 x 1080)
      // Matches the official Formula 1 Sunday Post-Race TV Graphic
      // ==============================================================

      const marginX = 80;
      let topY = 48;

      // Top F1 Header Ribbon
      drawF1BrandBadge(marginX, topY, 46);

      // Official Series Tag
      ctx.font = 'italic 800 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('FORMULA 1®', marginX + 130, topY + 22);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#949498';
      ctx.fillText(
        `APEXSIM CHAMPIONSHIP · SIMULADOR: ${championship.simulator.toUpperCase()}`,
        marginX + 280,
        topY + 22
      );

      // Round Badge on Right
      ctx.textAlign = 'right';
      ctx.font = 'italic 800 18px system-ui, sans-serif';
      ctx.fillStyle = '#e10600';
      ctx.fillText(
        `ROUND ${completedStagesCount} / ${championship.stages.length}`,
        width - marginX,
        topY + 22
      );
      ctx.textAlign = 'left';

      topY += 60;

      // Championship Title (Official F1 TV Typography: Bold, Condensed, Italic)
      ctx.font = 'italic 900 52px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      const mainHeaderTitle = isDriver
        ? "DRIVERS' WORLD CHAMPIONSHIP STANDINGS"
        : "CONSTRUCTORS' WORLD CHAMPIONSHIP STANDINGS";
      ctx.fillText(mainHeaderTitle, marginX, topY + 36);

      // Subtitle with league name
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#e10600';
      ctx.fillText('OFFICIAL CLASSIFICATION', marginX, topY + 70);

      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(` · ${championship.name.toUpperCase()}`, marginX + 260, topY + 70);

      // Dividing Red/White Chevron Line
      ctx.strokeStyle = '#e10600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(marginX, topY + 86);
      ctx.lineTo(marginX + 240, topY + 86);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + 250, topY + 86);
      ctx.lineTo(width - marginX, topY + 86);
      ctx.stroke();

      // Data preparation: Left Column and Right Column for all drivers / constructors
      const list = isDriver ? driverStandings : constructorStandings;
      const colWidth = (width - marginX * 2 - 50) / 2;
      const startContentY = topY + 130;
      const itemsPerCol = Math.max(1, Math.ceil(list.length / 2));
      const footerY = height - 42;
      const availableContentH = footerY - 20 - startContentY;
      const rowHeight = Math.min(65, Math.max(38, Math.floor(availableContentH / itemsPerCol)));
      const hScale = Math.min(1, rowHeight / 65);

      // Column Header Bars (F1 Broadcast Style)
      const drawF1ColHeader = (x: number) => {
        ctx.fillStyle = '#1c1c24';
        ctx.fillRect(x, startContentY - 32, colWidth, 26);

        ctx.font = 'italic 900 13px system-ui, sans-serif';
        ctx.fillStyle = '#949498';
        ctx.fillText('POS', x + 16, startContentY - 15);
        ctx.fillText(isDriver ? 'DRIVER' : 'CONSTRUCTOR', x + 85, startContentY - 15);
        ctx.fillText('TEAM', x + colWidth - 250, startContentY - 15);
        ctx.textAlign = 'right';
        ctx.fillText('PTS', x + colWidth - 85, startContentY - 15);
        ctx.fillText('GAP', x + colWidth - 18, startContentY - 15);
        ctx.textAlign = 'left';
      };

      drawF1ColHeader(marginX);
      if (list.length > itemsPerCol) {
        drawF1ColHeader(marginX + colWidth + 50);
      }

      list.forEach((item, index) => {
        const colIndex = index < itemsPerCol ? 0 : 1;
        const rowIndex = index < itemsPerCol ? index : index - itemsPerCol;
        const colX = marginX + colIndex * (colWidth + 50);
        const rowY = startContentY + rowIndex * rowHeight;
        const rowBoxH = rowHeight - (hScale < 0.8 ? 4 : 6);

        const isP1 = item.rank === 1 && item.totalPoints > 0;
        const isPointsPaying = item.rank <= 10;

        // F1 TV Row Container
        ctx.fillStyle = isP1
          ? '#221919'
          : index % 2 === 0
          ? '#1e1e27'
          : '#181822';

        ctx.fillRect(colX, rowY, colWidth, rowBoxH);

        // Leader highlight border
        if (isP1) {
          ctx.strokeStyle = '#e10600';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(colX, rowY, colWidth, rowBoxH);
        }

        // 1. Position Block (F1 Angled Chevron / Block)
        const posBoxW = Math.round(46 * Math.max(0.75, hScale));
        ctx.fillStyle = isP1 ? '#e10600' : isPointsPaying ? '#292936' : '#191921';
        ctx.fillRect(colX, rowY, posBoxW, rowBoxH);

        const posFontSize = Math.round(22 * Math.max(0.75, hScale));
        ctx.font = `italic 900 ${posFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(item.rank), colX + posBoxW / 2, rowY + rowBoxH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // 2. Vibrant Official Team Color Vertical Stripe (F1 signature)
        const teamName = isDriver
          ? (item as DriverStanding).teamName
          : (item as ConstructorStandingItem).teamName;
        const teamColor = getTeamColor(teamName);

        ctx.fillStyle = teamColor;
        ctx.fillRect(colX + posBoxW + 4, rowY + 3, 6, Math.max(8, rowBoxH - 6));

        // 3. Driver Name / Constructor Name
        const nameX = colX + posBoxW + 18;

        if (isDriver) {
          const dItem = item as DriverStanding;
          const { first, last } = formatF1Name(dItem.driverName);

          const firstFontSize = Math.round(18 * Math.max(0.72, hScale));
          const lastFontSize = Math.round(21 * Math.max(0.72, hScale));
          const subFontSize = Math.round(13 * Math.max(0.7, hScale));

          // First name regular, SURNAME extra-bold
          ctx.font = `400 ${firstFontSize}px system-ui, sans-serif`;
          ctx.fillStyle = '#b5b5be';
          const nameY = rowY + Math.round(rowBoxH * 0.54);
          ctx.fillText(first, nameX, nameY);

          const firstWidth = first ? ctx.measureText(first + ' ').width : 0;
          ctx.font = `italic 900 ${lastFontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(last, nameX + firstWidth, nameY);

          // Car Number & Team
          const isRes = dItem.isReserve || dItem.teamName.toLowerCase().includes('reserva');
          const teamLabel = isRes ? 'RESERVA' : dItem.teamName.toUpperCase();
          const teamCode = isRes ? 'RES' : getTeamCode(dItem.teamName, championship.simulator);

          if (rowBoxH >= 44) {
            const subY = rowY + Math.round(rowBoxH * 0.84);
            ctx.font = `italic 800 ${subFontSize}px monospace`;
            ctx.fillStyle = '#e10600';
            ctx.fillText(`#${dItem.number}`, nameX, subY);

            ctx.fillStyle = isRes ? '#f59e0b' : '#71717a';
            ctx.fillText(` · ${teamLabel}`, nameX + 32, subY);
          }

          // Team Code Pill
          ctx.fillStyle = isRes ? '#451a03' : '#272733';
          const pillH = Math.max(20, Math.round(26 * hScale));
          const pillY = rowY + (rowBoxH - pillH) / 2;
          ctx.fillRect(colX + colWidth - 250, pillY, 52, pillH);
          ctx.font = 'italic 900 13px monospace';
          ctx.fillStyle = '#ffd700';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(teamCode, colX + colWidth - 224, pillY + pillH / 2);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        } else {
          const cItem = item as ConstructorStandingItem;
          const teamCode = getTeamCode(cItem.teamName, championship.simulator);

          const teamFontSize = Math.round(22 * Math.max(0.72, hScale));
          ctx.font = `italic 900 ${teamFontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          const nameY = rowY + Math.round(rowBoxH * 0.54);
          ctx.fillText(cItem.teamName.toUpperCase(), nameX, nameY);

          if (rowBoxH >= 44) {
            const subY = rowY + Math.round(rowBoxH * 0.84);
            ctx.font = '13px monospace';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`[${teamCode}]`, nameX, subY);

            ctx.fillStyle = '#a1a1aa';
            const driverListStr = cItem.driverNames.slice(0, 2).join(' · ') || 'Sem pilotos';
            ctx.fillText(` · ${driverListStr.toUpperCase()}`, nameX + 54, subY);
          }

          // Wins indicator
          ctx.font = 'bold 13px monospace';
          ctx.fillStyle = '#949498';
          ctx.fillText(`${item.wins} VIT · ${item.podiums} PÓD`, colX + colWidth - 250, rowY + rowBoxH / 2 + 5);
        }

        // 4. Points Box
        const ptsBoxW = Math.round(65 * Math.max(0.75, hScale));
        const ptsBoxX = colX + colWidth - 110;
        const ptsBoxH = Math.max(22, rowBoxH - 16);
        const ptsBoxY = rowY + (rowBoxH - ptsBoxH) / 2;
        ctx.fillStyle = isP1 ? '#e10600' : '#14141c';
        ctx.fillRect(ptsBoxX, ptsBoxY, ptsBoxW, ptsBoxH);

        const ptsFontSize = Math.round(22 * Math.max(0.72, hScale));
        ctx.font = `italic 900 ${ptsFontSize}px "Arial Black", Impact, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(item.totalPoints), ptsBoxX + ptsBoxW / 2, rowY + rowBoxH / 2);
        ctx.textBaseline = 'alphabetic';

        // 5. Gap Column
        ctx.font = 'italic 800 13px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isP1 ? '#ffd700' : '#949498';
        const gapText = item.gap === 'Líder' ? 'LEAD' : item.gap.replace('pts', '').trim();
        ctx.fillText(gapText, colX + colWidth - 14, rowY + rowBoxH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      });

      // Bottom F1 Broadcast Footer Bar
      ctx.strokeStyle = '#e10600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, footerY - 14);
      ctx.lineTo(width - marginX, footerY - 14);
      ctx.stroke();

      ctx.font = 'italic 800 13px monospace';
      ctx.fillStyle = '#949498';
      ctx.fillText('FIA FORMULA ONE WORLD CHAMPIONSHIP™ · APEXSIM OFFICIAL TIMING SYSTEM', marginX, footerY + 8);

      ctx.textAlign = 'right';
      const dateStr = new Date().toLocaleDateString('pt-BR');
      ctx.fillText(`CLASSIFICAÇÃO HOMOLOGADA · ${dateStr} · 18:9 ULTRA HD`, width - marginX, footerY + 8);
      ctx.textAlign = 'left';
    } else {
      // ==============================================================
      // 9:18 STORIES / MOBILE BROADCAST LAYOUT (1080 x 2160)
      // Matches the Official Formula 1 Social Media & Instagram Story
      // ==============================================================

      const marginX = 50;
      let curY = 65;

      // Top F1 Brand Badge
      drawF1BrandBadge(marginX, curY, 52);

      ctx.font = 'italic 900 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('FORMULA 1®', marginX + 135, curY + 28);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#949498';
      ctx.fillText(`SIMULADOR: ${championship.simulator.toUpperCase()}`, marginX + 135, curY + 50);

      ctx.textAlign = 'right';
      ctx.font = 'italic 800 20px system-ui, sans-serif';
      ctx.fillStyle = '#e10600';
      ctx.fillText(`ROUND ${completedStagesCount} / ${championship.stages.length}`, width - marginX, curY + 36);
      ctx.textAlign = 'left';

      curY += 80;

      // Championship Title
      ctx.font = 'italic 900 48px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      const mobileTitle = isDriver
        ? "DRIVERS' CHAMPIONSHIP"
        : "CONSTRUCTORS' CHAMPIONSHIP";
      ctx.fillText(mobileTitle, marginX, curY + 30);

      curY += 50;
      ctx.font = 'italic 800 20px monospace';
      ctx.fillStyle = '#e10600';
      ctx.fillText('OFFICIAL FIA STANDINGS', marginX, curY + 16);

      ctx.fillStyle = '#a1a1aa';
      let champSub = championship.name.toUpperCase();
      if (champSub.length > 28) champSub = champSub.slice(0, 27) + '…';
      ctx.fillText(` · ${champSub}`, marginX + 260, curY + 16);

      curY += 32;

      // Red/White Chevron Divider
      ctx.strokeStyle = '#e10600';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(marginX, curY);
      ctx.lineTo(marginX + 200, curY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + 210, curY);
      ctx.lineTo(width - marginX, curY);
      ctx.stroke();

      curY += 28;

      // 1. Leader Spotlight Card (P1)
      const list = isDriver ? driverStandings : constructorStandings;
      const p1 = list.find((d) => d.rank === 1);
      const remainingList = list.filter((i) => i.rank !== 1);
      const remCount = remainingList.length;

      // Adjust P1 card height & gap based on remaining drivers count
      const p1CardHeight = remCount > 20 ? 125 : remCount > 14 ? 138 : 160;
      const gapAfterP1 = remCount > 20 ? 10 : remCount > 14 ? 14 : 22;

      if (p1) {
        const p1TeamName = isDriver
          ? (p1 as DriverStanding).teamName
          : (p1 as ConstructorStandingItem).teamName;
        const p1TeamColor = getTeamColor(p1TeamName);

        // F1 Card Box
        ctx.fillStyle = '#1c1b24';
        ctx.fillRect(marginX, curY, width - marginX * 2, p1CardHeight);

        // Top Gold/Red Leader Ribbon
        ctx.fillStyle = '#e10600';
        ctx.fillRect(marginX, curY, width - marginX * 2, 8);

        // Left Accent Team Color Bar
        ctx.fillStyle = p1TeamColor;
        ctx.fillRect(marginX, curY + 8, 12, p1CardHeight - 8);

        // Pos 1 Badge
        const posSize = p1CardHeight >= 150 ? 75 : 62;
        const posBadgeY = curY + (p1CardHeight - posSize) / 2 + 4;
        ctx.fillStyle = '#e10600';
        ctx.fillRect(marginX + 24, posBadgeY, posSize, posSize);

        const posFont = p1CardHeight >= 150 ? 48 : 40;
        ctx.font = `italic 900 ${posFont}px "Arial Black", Impact, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1', marginX + 24 + posSize / 2, posBadgeY + posSize / 2 + 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Tag: CHAMPIONSHIP LEADER
        const tagY = curY + (p1CardHeight >= 150 ? 44 : 36);
        ctx.font = 'italic 900 16px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('★ CHAMPIONSHIP LEADER', marginX + 118, tagY);

        // Name
        const nameX = marginX + 118;
        const nameY = curY + (p1CardHeight >= 150 ? 80 : 70);
        const subY = curY + (p1CardHeight >= 150 ? 114 : 98);

        if (isDriver) {
          const { first, last } = formatF1Name((p1 as DriverStanding).driverName);
          const firstFont = p1CardHeight >= 150 ? 26 : 22;
          const lastFont = p1CardHeight >= 150 ? 34 : 28;

          ctx.font = `400 ${firstFont}px system-ui, sans-serif`;
          ctx.fillStyle = '#b5b5be';
          ctx.fillText(first, nameX, nameY);

          const fW = first ? ctx.measureText(first + ' ').width : 0;
          ctx.font = `italic 900 ${lastFont}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(last, nameX + fW, nameY);

          // Number & Team Code
          const p1Code = getTeamCode(p1TeamName, championship.simulator);
          ctx.font = 'italic 900 17px monospace';
          ctx.fillStyle = '#e10600';
          ctx.fillText(`#${(p1 as DriverStanding).number}`, nameX, subY);

          ctx.fillStyle = '#949498';
          ctx.fillText(` · ${p1TeamName.toUpperCase()} [${p1Code}]`, nameX + 45, subY);
        } else {
          const cFont = p1CardHeight >= 150 ? 36 : 28;
          ctx.font = `italic 900 ${cFont}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(p1TeamName.toUpperCase(), nameX, nameY);

          const p1Code = getTeamCode(p1TeamName, championship.simulator);
          ctx.font = 'italic 900 17px monospace';
          ctx.fillStyle = '#ffd700';
          ctx.fillText(`[${p1Code}] · ${p1.wins} VITÓRIAS · ${p1.podiums} PÓDIOS`, nameX, subY);
        }

        // Points Box on Right
        const ptsBoxW = 120;
        const ptsBoxX = width - marginX - ptsBoxW - 20;
        const ptsBoxH = p1CardHeight >= 150 ? 75 : 62;
        const ptsBoxY = curY + (p1CardHeight - ptsBoxH) / 2 + 4;
        ctx.fillStyle = '#121219';
        ctx.fillRect(ptsBoxX, ptsBoxY, ptsBoxW, ptsBoxH);

        const ptsFont = p1CardHeight >= 150 ? 46 : 38;
        ctx.font = `italic 900 ${ptsFont}px "Arial Black", Impact, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p1.totalPoints), ptsBoxX + ptsBoxW / 2, ptsBoxY + ptsBoxH / 2 - 8);

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#e10600';
        ctx.fillText('PTS', ptsBoxX + ptsBoxW / 2, ptsBoxY + ptsBoxH / 2 + 18);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        curY += p1CardHeight + gapAfterP1;
      }

      // 2. All remaining drivers/constructors in adaptive horizontal strips
      const footerY = height - 50;
      const availableSpaceForRows = footerY - 25 - curY;
      const rowH = remCount > 0
        ? Math.min(88, Math.max(46, Math.floor(availableSpaceForRows / remCount)))
        : 88;
      const scale = Math.min(1, rowH / 88);

      remainingList.forEach((item, idx) => {
        const rowY = curY + idx * rowH;
        const isPointsPaying = item.rank <= 10;
        const isP2 = item.rank === 2;
        const isP3 = item.rank === 3;
        const rowBoxH = rowH - (scale < 0.8 ? 5 : 8);

        // Container strip
        ctx.fillStyle = isP2
          ? '#20202c'
          : isP3
          ? '#1e1c26'
          : idx % 2 === 0
          ? '#181822'
          : '#14141c';

        ctx.fillRect(marginX, rowY, width - marginX * 2, rowBoxH);

        // Position Block
        const posW = Math.round(56 * Math.max(0.72, scale));
        ctx.fillStyle = isP2
          ? '#2b2b3a'
          : isP3
          ? '#29221f'
          : isPointsPaying
          ? '#222230'
          : '#181822';

        ctx.fillRect(marginX, rowY, posW, rowBoxH);

        const posFontSize = Math.round(28 * Math.max(0.72, scale));
        ctx.font = `italic 900 ${posFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = isP2 ? '#e2e8f0' : isP3 ? '#f59e0b' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(item.rank), marginX + posW / 2, rowY + rowBoxH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Team Color Bar
        const teamName = isDriver
          ? (item as DriverStanding).teamName
          : (item as ConstructorStandingItem).teamName;
        const teamColor = getTeamColor(teamName);

        ctx.fillStyle = teamColor;
        ctx.fillRect(marginX + posW + 4, rowY + 3, 6, Math.max(8, rowBoxH - 6));

        // Name
        const nameX = marginX + posW + Math.round(20 * Math.max(0.7, scale));
        if (isDriver) {
          const dItem = item as DriverStanding;
          const { first, last } = formatF1Name(dItem.driverName);

          const firstFontSize = Math.round(22 * Math.max(0.72, scale));
          const lastFontSize = Math.round(26 * Math.max(0.72, scale));
          const subFontSize = Math.round(15 * Math.max(0.7, scale));

          const nameLineY = rowY + Math.round(rowBoxH * 0.45);
          ctx.font = `400 ${firstFontSize}px system-ui, sans-serif`;
          ctx.fillStyle = '#b5b5be';
          ctx.fillText(first, nameX, nameLineY);

          const fW = first ? ctx.measureText(first + ' ').width : 0;
          ctx.font = `italic 900 ${lastFontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(last, nameX + fW, nameLineY);

          // Subline: Number & Team Code
          const isRes = dItem.isReserve || dItem.teamName.toLowerCase().includes('reserva');
          const teamLabel = isRes ? 'RESERVA' : dItem.teamName.toUpperCase();
          const teamCode = isRes ? 'RES' : getTeamCode(dItem.teamName, championship.simulator);

          if (rowBoxH >= 42) {
            const subLineY = rowY + Math.round(rowBoxH * 0.77);
            ctx.font = `italic 800 ${subFontSize}px monospace`;
            ctx.fillStyle = '#e10600';
            ctx.fillText(`#${dItem.number}`, nameX, subLineY);

            ctx.fillStyle = isRes ? '#f59e0b' : '#a1a1aa';
            ctx.fillText(` · ${teamLabel} [${teamCode}]`, nameX + 38, subLineY);
          }
        } else {
          const cItem = item as ConstructorStandingItem;
          const teamCode = getTeamCode(cItem.teamName, championship.simulator);

          const teamFontSize = Math.round(26 * Math.max(0.72, scale));
          ctx.font = `italic 900 ${teamFontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = '#ffffff';
          const nameLineY = rowY + Math.round(rowBoxH * 0.45);
          ctx.fillText(cItem.teamName.toUpperCase(), nameX, nameLineY);

          if (rowBoxH >= 42) {
            const subLineY = rowY + Math.round(rowBoxH * 0.77);
            const subFontSize = Math.round(15 * Math.max(0.7, scale));
            ctx.font = `${subFontSize}px monospace`;
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`[${teamCode}]`, nameX, subLineY);

            ctx.fillStyle = '#949498';
            const driverListStr = cItem.driverNames.slice(0, 2).join(' · ') || 'Sem pilotos';
            ctx.fillText(` · ${driverListStr.toUpperCase()}`, nameX + 54, subLineY);
          }
        }

        // Points Box
        const pBoxW = Math.round(90 * Math.max(0.72, scale));
        const pBoxX = width - marginX - pBoxW - 14;
        const pBoxH = Math.max(26, rowBoxH - (scale < 0.8 ? 14 : 24));
        const pBoxY = rowY + (rowBoxH - pBoxH) / 2;
        ctx.fillStyle = '#101018';
        ctx.fillRect(pBoxX, pBoxY, pBoxW, pBoxH);

        const ptsFontSize = Math.round(30 * Math.max(0.7, scale));
        ctx.font = `italic 900 ${ptsFontSize}px "Arial Black", Impact, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(item.totalPoints), pBoxX + pBoxW / 2, rowY + rowBoxH / 2 - (scale >= 0.78 ? 4 : 0));

        if (scale >= 0.78) {
          ctx.font = `italic 800 ${Math.max(10, Math.round(11 * scale))}px monospace`;
          ctx.fillStyle = '#949498';
          ctx.fillText('PTS', pBoxX + pBoxW / 2, rowY + rowBoxH / 2 + 14);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Gap
        const gapFontSize = Math.round(14 * Math.max(0.72, scale));
        ctx.font = `italic 800 ${gapFontSize}px monospace`;
        ctx.fillStyle = '#a1a1aa';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.gap, pBoxX - 16, rowY + rowBoxH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      });

      // Bottom F1 Stories Footer
      ctx.strokeStyle = '#e10600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, footerY - 20);
      ctx.lineTo(width - marginX, footerY - 20);
      ctx.stroke();

      ctx.font = 'italic 900 16px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('FORMULA 1® TIMING', marginX, footerY + 6);

      ctx.textAlign = 'right';
      ctx.font = 'italic 800 14px monospace';
      ctx.fillStyle = '#949498';
      ctx.fillText('OFFICIAL BROADCAST GRAPHICS · 9:18 STORIES', width - marginX, footerY + 6);
      ctx.textAlign = 'left';
    }
  }, [
    aspectRatio,
    championship,
    constructorStandings,
    driverStandings,
    isDriver,
    completedStagesCount,
    getTeamColor,
  ]);

  // Re-draw canvas whenever aspect ratio or data changes
  useEffect(() => {
    if (isOpen) {
      // Allow DOM to settle before rendering
      const timer = setTimeout(() => {
        drawCanvas();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, aspectRatio, drawCanvas]);

  if (!isOpen) return null;

  // Handle Download Image (PNG in Ultra HD)
  const handleDownload = () => {
    setIsExporting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        setIsExporting(false);
        return;
      }

      const fileName = `${championship.name.replace(/\s+/g, '_').toLowerCase()}_${type}_${aspectRatio.replace(':', 'x')}.png`;
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
          // Fallback if browser blocks direct image copying
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
      <div className="relative w-full max-w-4xl bg-[#0b101b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                Exportar Gráfico Oficial em Alta Resolução
              </h3>
              <p className="text-xs text-slate-400">
                {title} · {championship.name}
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

        {/* Toolbar: Aspect Ratio Selector & Action Buttons */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
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
              <span>18:9 (Widescreen / Wallpaper)</span>
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
              <span>9:18 (Stories / TikTok / Reels)</span>
            </button>
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
                  <span>Baixar PNG em Alta Qualidade</span>
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
                  ? 'w-full max-w-[760px] aspect-[18/9]'
                  : 'w-[280px] sm:w-[320px] aspect-[9/18]'
              }`}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </div>

            <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>
                Renderização em resolução Ultra HD (
                {aspectRatio === '18:9' ? '2160 × 1080 px' : '1080 × 2160 px'}
                ) pronta para postagens e transmissões.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
