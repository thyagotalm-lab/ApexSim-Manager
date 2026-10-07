import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, Download, Trash2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { downloadPdf, readPdfFile } from '../utils/pdfHelper';

interface PdfRulesUploaderProps {
  rulesPdfUrl?: string;
  rulesPdfName?: string;
  rulesPdfSize?: string;
  onChange: (data: { rulesPdfUrl?: string; rulesPdfName?: string; rulesPdfSize?: string }) => void;
  label?: string;
  subtitle?: string;
}

export const PdfRulesUploader: React.FC<PdfRulesUploaderProps> = ({
  rulesPdfUrl,
  rulesPdfName,
  rulesPdfSize,
  onChange,
  label = 'Regulamento Oficial da Liga (Arquivo PDF)',
  subtitle = 'Envie o documento oficial em PDF com o regulamento desportivo e técnico para download dos pilotos.',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileProcess = (file: File) => {
    setErrorMessage('');
    readPdfFile(
      file,
      (dataUrl, name, size) => {
        onChange({
          rulesPdfUrl: dataUrl,
          rulesPdfName: name,
          rulesPdfSize: size,
        });
      },
      (error) => {
        setErrorMessage(error);
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      rulesPdfUrl: undefined,
      rulesPdfName: undefined,
      rulesPdfSize: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rulesPdfUrl) {
      downloadPdf(rulesPdfUrl, rulesPdfName || 'regulamento_liga.pdf');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-red-400" />
          <span>{label}</span>
        </label>
        {rulesPdfUrl && (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            PDF Anexado
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-400 leading-snug">
          {subtitle}
        </p>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {rulesPdfUrl ? (
        /* Display Card when PDF is Uploaded */
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0 w-11 h-11 rounded-lg bg-red-950/80 border border-red-800/80 flex flex-col items-center justify-center text-red-400">
              <FileText className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-wider font-mono text-red-300 -mt-0.5">
                PDF
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate" title={rulesPdfName || 'Regulamento Oficial.pdf'}>
                {rulesPdfName || 'Regulamento Oficial da Liga.pdf'}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 font-medium">Pronto para download</span>
                {rulesPdfSize && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-slate-400">{rulesPdfSize}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Download / Test PDF */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Baixar e visualizar o arquivo PDF"
            >
              <Download className="w-3.5 h-3.5 text-red-400" />
              <span>Baixar PDF</span>
            </button>

            {/* Replace PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer border border-slate-700"
              title="Substituir por outro arquivo PDF"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Remove PDF */}
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 hover:text-red-400 text-slate-400 text-xs transition-colors cursor-pointer border border-slate-700 hover:border-red-800"
              title="Remover arquivo PDF do campeonato"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Drag and Drop Zone when no PDF is attached */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
            isDragging
              ? 'border-red-500 bg-red-950/20'
              : 'border-slate-700/80 hover:border-red-500/70 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-red-950/60 border border-slate-700 group-hover:border-red-800 flex items-center justify-center text-slate-400 group-hover:text-red-400 transition-colors mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div className="text-xs font-semibold text-white group-hover:text-red-300 transition-colors">
            Clique para enviar ou arraste o arquivo PDF do Regulamento
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Suporta arquivos .PDF de até 15 MB
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
