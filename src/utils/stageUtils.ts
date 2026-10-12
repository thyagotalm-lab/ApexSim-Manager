import { StageRound } from '../types';

/**
 * Parses a stage's date and optional time string into a valid Unix timestamp in milliseconds.
 * Supports:
 * - YYYY-MM-DD
 * - YYYY-MM-DDTHH:mm:ss
 * - DD/MM/YYYY
 * - Time strings like "19:00", "21:00 BRT", "14:30 GMT", etc.
 */
export const parseStageDateTime = (dateStr?: string, timeStr?: string): number => {
  if (!dateStr || typeof dateStr !== 'string') return Number.MAX_SAFE_INTEGER;

  const trimmedDate = dateStr.trim();
  let year = 0;
  let month = 0;
  let day = 0;

  // Pattern: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedDate)) {
    const parts = trimmedDate.split(/[-T ]/);
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmedDate)) {
    // Pattern: DD/MM/YYYY
    const parts = trimmedDate.split('/');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  let hours = 0;
  let minutes = 0;
  if (timeStr && typeof timeStr === 'string') {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }
  }

  if (year > 0) {
    const dt = new Date(year, month, day, hours, minutes);
    if (!isNaN(dt.getTime())) {
      return dt.getTime();
    }
  }

  const fallback = Date.parse(trimmedDate);
  return !isNaN(fallback) ? fallback : Number.MAX_SAFE_INTEGER;
};

/**
 * Formats a stage date safely in Brazilian format (DD/MM/YYYY or DD MMM YYYY).
 */
export const formatStageDateDisplay = (dateStr?: string, format: 'short' | 'full' = 'full'): string => {
  if (!dateStr || typeof dateStr !== 'string') return 'Data a definir';
  
  const trimmed = dateStr.trim();
  // If YYYY-MM-DD, parse parts directly to avoid UTC/timezone day offsets
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split(/[-T ]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dt = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(dt.getTime())) {
      if (format === 'short') {
        return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return dateStr;
};

/**
 * Sorts stages strictly in chronological order by date and time,
 * and normalizes the round numbers (roundNumber = 1, 2, 3, ...)
 * so that Etapa 1 is always the earliest chronological event.
 */
export const sortStagesChronologically = (stages: StageRound[]): StageRound[] => {
  if (!Array.isArray(stages)) return [];

  const copy = [...stages];
  copy.sort((a, b) => {
    const timeA = parseStageDateTime(a?.date, a?.time);
    const timeB = parseStageDateTime(b?.date, b?.time);
    if (timeA !== timeB) return timeA - timeB;
    return (a?.roundNumber || 0) - (b?.roundNumber || 0);
  });

  return copy.map((stage, idx) => ({
    ...stage,
    roundNumber: idx + 1,
  }));
};
