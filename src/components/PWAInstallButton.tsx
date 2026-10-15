import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare, Monitor, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall, PlatformType } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'card';
  className?: string;
  onInstalledChange?: (installed: boolean) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, platform, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<PlatformType>(
    isIOS ? 'ios' : platform === 'android' ? 'android' : 'desktop'
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);

  // If already installed and variant is header, hide to keep header clean
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className={`p-4 rounded-xl bg-slate-900/80 border border-emerald-700/50 flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Aplicativo Instalado (PWA)</span>
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded">ATIVO</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ApexSim Manager está instalado e pronto para funcionar offline na sua área de trabalho/tela inicial.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const res = await install();
        if (res === 'accepted') {
          setInstallSuccessToast(true);
          setTimeout(() => setInstallSuccessToast(false), 5000);
          return;
        }
      } catch (err) {
        console.warn('Install error, opening guide:', err);
      } finally {
        setIsInstalling(false);
      }
    }
    // If not directly installable via native event (e.g. iOS or manual browser mode), open guided dialog
    setShowGuideModal(true);
  };

  return (
    <>
      {/* HEADER VARIANT */}
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-md shadow-red-950/40 transition-all cursor-pointer whitespace-nowrap active:scale-95 border border-red-500/40 ${className}`}
          title="Instalar ApexSim como aplicativo no seu dispositivo (PWA)"
        >
          <Download className="w-3.5 h-3.5 animate-pulse text-white" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
          <span className="hidden md:inline-block text-[9px] bg-red-950/80 text-red-200 border border-red-400/40 px-1 py-0.2 rounded font-mono uppercase">
            PWA
          </span>
        </button>
      )}

      {/* BANNER VARIANT */}
      {variant === 'banner' && (
        <div
          className={`p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-slate-900 to-slate-950 border border-red-700/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Instalar ApexSim Manager no seu Dispositivo</span>
                <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded">PWA</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Adicione à tela inicial do celular ou PC. Acesso instantâneo a calendários, resultados de corridas e notificações push, mesmo offline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-md shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Aplicativo</span>
          </button>
        </div>
      )}

      {/* CARD VARIANT */}
      {variant === 'card' && (
        <div className={`p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Aplicativo Progressivo (PWA)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Instale no Android, iOS, Windows ou Mac com abertura rápida sem barras de navegador.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
        </div>
      )}

      {/* UNIVERSAL INSTALLATION GUIDE MODAL */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left space-y-4">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-600/60 flex items-center justify-center shrink-0 shadow-lg">
                <Download className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Instalar ApexSim Manager</span>
                  <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded">PWA</span>
                </h3>
                <p className="text-xs text-slate-400">Escolha o seu dispositivo abaixo para ver as instruções</p>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveGuideTab('desktop')}
                className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeGuideTab === 'desktop'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>PC / Mac</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('android')}
                className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeGuideTab === 'android'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('ios')}
                className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeGuideTab === 'ios'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Share className="w-3.5 h-3.5" />
                <span>iOS (Apple)</span>
              </button>
            </div>

            {/* Step-by-step instructions according to active tab */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3 text-xs text-slate-300">
              {activeGuideTab === 'desktop' && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      1
                    </span>
                    <p className="leading-relaxed">
                      No Google Chrome ou Microsoft Edge, localize o ícone de <strong>Instalar Aplicativo</strong> <Download className="inline w-3.5 h-3.5 text-red-400 align-middle" /> no canto direito da barra de endereço URL.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Ou clique nos <strong>três pontos ⋮</strong> no canto superior do navegador e escolha <strong>&quot;Instalar ApexSim Manager&quot;</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      3
                    </span>
                    <p className="leading-relaxed">
                      O app será instalado como um aplicativo nativo no seu computador, com atalho na Área de Trabalho!
                    </p>
                  </div>
                </>
              )}

              {activeGuideTab === 'android' && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      1
                    </span>
                    <p className="leading-relaxed">
                      No Chrome do seu Android, toque no menu de <strong>três pontos ⋮</strong> no canto superior direito.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Selecione <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      3
                    </span>
                    <p className="leading-relaxed">
                      Confirme em <strong>Instalar</strong>. O ícone oficial do ApexSim aparecerá na sua gaveta de aplicativos!
                    </p>
                  </div>
                </>
              )}

              {activeGuideTab === 'ios' && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Abra o site no navegador <strong>Safari</strong> e toque no botão de <strong>Compartilhar</strong> <Share className="inline w-3.5 h-3.5 text-blue-400 align-middle" /> na barra inferior.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Role as opções para cima e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong> <PlusSquare className="inline w-3.5 h-3.5 text-emerald-400 align-middle" />.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      3
                    </span>
                    <p className="leading-relaxed">
                      Toque em <strong>Adicionar</strong> no canto superior direito para fixar o app no seu iPhone ou iPad.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Quick action button */}
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  setShowGuideModal(false);
                  await install();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Agora Direto</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {installSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950 border border-emerald-500/80 text-white shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold">ApexSim Manager instalado com sucesso!</p>
            <p className="text-[11px] text-emerald-200">Abra o app pela sua área de trabalho ou tela de início.</p>
          </div>
        </div>
      )}
    </>
  );
};
