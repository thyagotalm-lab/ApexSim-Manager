/**
 * Utility functions for handling Championship PDF Regulations
 */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadPdf(url: string, filename: string = 'regulamento_oficial.pdf'): void {
  if (!url) return;
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function readPdfFile(
  file: File,
  onSuccess: (dataUrl: string, name: string, formattedSize: string) => void,
  onError: (errorMsg: string) => void
): void {
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    onError('Por favor, selecione exclusivamente um arquivo no formato PDF (.pdf).');
    return;
  }

  // Maximum size 15MB
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    onError('O arquivo PDF selecionado é muito grande. O limite máximo permitido é 15 MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    if (result) {
      onSuccess(result, file.name, formatFileSize(file.size));
    } else {
      onError('Não foi possível ler o arquivo PDF. Tente novamente.');
    }
  };
  reader.onerror = () => {
    onError('Erro ao processar o arquivo PDF.');
  };
  reader.readAsDataURL(file);
}
