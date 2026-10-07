import React, { useState } from 'react';
import { FileText, Download, ExternalLink, ShieldCheck, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { downloadPdf } from '../utils/pdfHelper';

interface PdfRulesDownloadCardProps {
  rulesPdfUrl?: string;
  rulesPdfName?: string;
  rulesPdfSize?: string;
  rulesDoc?: string;
  championshipName: string;
  simulator?: string;
  variant?: 'full' | 'compact' | 'overview';
}

export const PdfRulesDownloadCard: React.FC<PdfRulesDownloadCardProps> = ({
  rulesPdfUrl,
  rulesPdfName,
  rulesPdfSize,
  rulesDoc,
  championshipName,
  simulator,
  variant = 'overview',
}) => {
  const [isDocExpanded, setIsDocExpanded] = useState<boolean>(false);

  const filename = rulesPdfName || `Regulamento_${championshipName.replace(/\s+/g, '_')}.pdf`;

  const handleDownload = () => {
    if (rulesPdfUrl) {
      downloadPdf(rulesPdfUrl, filename);
    }
  };

  const handleOpenNewTab = () => {
    if (rulesPdfUrl) {
      window.open(rulesPdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // If there's neither a PDF nor rules text, return null or a prompt
  if (!rulesPdfUrl && !rulesDoc) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {rulesPdfUrl ? (
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title={`Baixar ${filename}`}
          >
            <Download className="w-3.5 h-3.5 text-red-400" />
            <span>Baixar Regulamento (PDF)</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-900/40 bg-gradient-to-br from-red-950/20 via-slate-900/90 to-slate-950 p-4 sm:p-5 relative overflow-hidden shadow-xl">
      {/* Background ambient red glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Info Column */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="relative shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-950 p-0.5 shadow-lg shadow-red-950/50">
            <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex flex-col items-center justify-center text-red-400">
              <FileText className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase tracking-wider font-mono text-red-300 -mt-1">
                PDF
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-950/60 border border-red-800/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-red-400" />
                Regulamento Oficial da Liga
              </span>
              {simulator && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {simulator}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-white font-display mt-1 truncate">
              {rulesPdfName || `Regulamento Desportivo & Técnico: ${championshipName}`}
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Documento Oficial Homologado</span>
              {rulesPdfSize && (
                <>
                  <span>·</span>
                  <span className="font-mono text-slate-300 font-semibold">{rulesPdfSize}</span>
                </>
              )}
              {rulesPdfUrl && (
                <>
                  <span>·</span>
                  <span className="text-emerald-400 font-medium">Download Disponível</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          {rulesPdfUrl ? (
            <>
              <button
                type="button"
                onClick={handleDownload}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-950 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Regulamento (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Abrir PDF em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          ) : rulesDoc ? (
            <div className="text-xs text-amber-400 font-medium bg-amber-950/30 border border-amber-800/50 px-3 py-1.5 rounded-xl">
              Regulamento em texto
            </div>
          ) : null}

          {rulesDoc && (
            <button
              type="button"
              onClick={() => setIsDocExpanded(!isDocExpanded)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Ver texto explicativo das regras"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{isDocExpanded ? 'Ocultar' : 'Texto'}</span>
              {isDocExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Rules Doc text if available */}
      {rulesDoc && isDocExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in fade-in duration-200">
          <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-red-400" />
            <span>Resumo / Diretrizes Desportivas Registradas:</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
            {rulesDoc}
          </div>
        </div>
      )}
    </div>
  );
};
