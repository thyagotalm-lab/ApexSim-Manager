import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, Image as ImageIcon, Check } from 'lucide-react';

export const MOTORSPORT_PRESET_AVATARS = [
  {
    name: 'Piloto Apex Pro',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Piloto Capacete Escarlate',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Piloto Scuderia GT',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Piloto Carbon Sim',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Piloto Williams Sim',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
  },
  {
    name: 'Diretor de Prova',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
  },
];

interface AvatarUploaderProps {
  currentAvatar: string;
  onAvatarChange: (avatarUrl: string) => void;
  label?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatar,
  onAvatarChange,
  label = 'Foto de Perfil',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Por favor, selecione uma imagem de até 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onAvatarChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onAvatarChange(customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-red-400" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {showUrlInput ? 'Cancelar URL' : 'Inserir Link/URL'}
        </button>
      </div>

      {/* Main Avatar Preview & Action Row */}
      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative group shrink-0">
          <img
            src={currentAvatar || MOTORSPORT_PRESET_AVATARS[0].url}
            alt="Foto do perfil"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-xl object-cover border-2 border-red-500/80 shadow-md bg-slate-950"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity cursor-pointer"
            title="Alterar foto"
          >
            <Upload className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Imagem</span>
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={() => onAvatarChange(MOTORSPORT_PRESET_AVATARS[0].url)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Redefinir foto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            JPG, PNG ou GIF do seu dispositivo (ou escolha abaixo).
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* URL Input Box (if toggled) */}
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://exemplo.com/foto.jpg"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Preset Motorsport Avatars Quick Selection */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
          <ImageIcon className="w-3 h-3 text-slate-500" />
          <span>Ou escolha um avatar temático de automobilismo:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {MOTORSPORT_PRESET_AVATARS.map((preset, idx) => {
            const isSelected = currentAvatar === preset.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onAvatarChange(preset.url)}
                className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-red-500 scale-105 shadow-md shadow-red-950'
                    : 'border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600'
                }`}
                title={preset.name}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
