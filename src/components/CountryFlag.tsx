import React, { useState } from 'react';

// Country name to ISO 3166-1 alpha-2 mapping
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // Portuguese names
  'brasil': 'br',
  'brazil': 'br',
  'itália': 'it',
  'italia': 'it',
  'italy': 'it',
  'bélgica': 'be',
  'belgica': 'be',
  'belgium': 'be',
  'reino unido': 'gb',
  'grã-bretanha': 'gb',
  'inglaterra': 'gb',
  'uk': 'gb',
  'great britain': 'gb',
  'estados unidos': 'us',
  'eua': 'us',
  'usa': 'us',
  'austrália': 'au',
  'australia': 'au',
  'japão': 'jp',
  'japao': 'jp',
  'japan': 'jp',
  'china': 'cn',
  'mônaco': 'mc',
  'monaco': 'mc',
  'espanha': 'es',
  'spain': 'es',
  'canadá': 'ca',
  'canada': 'ca',
  'áustria': 'at',
  'austria': 'at',
  'hungria': 'hu',
  'hungary': 'hu',
  'holanda': 'nl',
  'países baixos': 'nl',
  'paises baixos': 'nl',
  'netherlands': 'nl',
  'azerbaijão': 'az',
  'azerbaijao': 'az',
  'azerbaijan': 'az',
  'singapura': 'sg',
  'singapore': 'sg',
  'méxico': 'mx',
  'mexico': 'mx',
  'bahrein': 'bh',
  'bahrain': 'bh',
  'arábia saudita': 'sa',
  'arabia saudita': 'sa',
  'saudi arabia': 'sa',
  'catar': 'qa',
  'qatar': 'qa',
  'emirados árabes': 'ae',
  'emirados arabes': 'ae',
  'emirados árabes unidos': 'ae',
  'uae': 'ae',
  'portugal': 'pt',
  'frança': 'fr',
  'franca': 'fr',
  'france': 'fr',
  'alemanha': 'de',
  'germany': 'de',
  'argentina': 'ar',
  'chile': 'cl',
  'uruguai': 'uy',
  'uruguay': 'uy',
  'colômbia': 'co',
  'colombia': 'co',
};

/**
 * Extracts 2-letter ISO country code from emoji flag (regional indicator symbols).
 * On Windows, emoji flags like 🇧🇷 render as "BR" text letters. This extracts the exact code.
 */
export function getCountryCode(flagOrCountry?: string, countryNameFallback?: string): string {
  if (!flagOrCountry && !countryNameFallback) return 'br';

  const input = (flagOrCountry || countryNameFallback || '').trim();

  // 1. Direct 2-letter ISO code
  if (/^[a-zA-Z]{2}$/.test(input)) {
    return input.toLowerCase();
  }

  // 2. Decode from Unicode Regional Indicator emoji (e.g. 🇧🇷 -> br)
  const codePoints: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0);
    if (cp && cp >= 0x1F1E6 && cp <= 0x1F1FF) {
      codePoints.push(cp);
    }
  }
  if (codePoints.length >= 2) {
    const char1 = String.fromCharCode(codePoints[0] - 0x1F1E6 + 65);
    const char2 = String.fromCharCode(codePoints[1] - 0x1F1E6 + 65);
    return (char1 + char2).toLowerCase();
  }

  // 3. Match from country name in lookup table
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [key, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      return code;
    }
  }

  // 4. Try fallback country name if provided
  if (countryNameFallback && countryNameFallback !== flagOrCountry) {
    return getCountryCode(countryNameFallback);
  }

  return 'un'; // Unknown / UN flag fallback
}

interface CountryFlagProps {
  flag?: string;
  country?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  title?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  flag,
  country,
  size = 'sm',
  className = '',
  title,
}) => {
  const code = getCountryCode(flag, country);
  const [hasError, setHasError] = useState(false);

  // Dimensions based on standard 4:3 flag ratio
  const sizeClasses = {
    xs: 'w-4 h-3',
    sm: 'w-5 h-3.5',
    md: 'w-6 h-4.5',
    lg: 'w-7 h-5',
    xl: 'w-9 h-6.5',
  };

  const displayName = title || country || code.toUpperCase();

  if (hasError || !code) {
    // Elegant fallback badge showing 2 uppercase letters if image fails
    return (
      <span
        title={displayName}
        className={`inline-flex items-center justify-center font-bold text-[9px] uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 rounded-[3px] select-none ${sizeClasses[size]} ${className}`}
      >
        {code.toUpperCase().slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={`Bandeira de ${displayName}`}
      title={displayName}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`inline-block object-cover rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.4)] border border-white/15 shrink-0 align-middle ${sizeClasses[size]} ${className}`}
    />
  );
};
