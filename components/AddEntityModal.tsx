
import React, { useState } from 'react';
import { X, Save, Layers, Building2, Image as ImageIcon } from 'lucide-react';
import { ConsortiumEntity, EntityType, Theme } from '../types';
import { ENTITY_COLORS } from '../constants';
import { Language } from '../App';

interface AddEntityModalProps {
  onClose: () => void;
  onSubmit: (entity: Partial<ConsortiumEntity>) => void;
  parentName: string;
  lang: Language;
  theme: Theme;
}

const AddEntityModal: React.FC<AddEntityModalProps> = ({ onClose, onSubmit, parentName, lang, theme }) => {
  const [formData, setFormData] = useState<Partial<ConsortiumEntity>>({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    type: EntityType.ADMIN_POLAND,
    color: ENTITY_COLORS[0].value,
    management: [],
    location: '',
    locationEn: ''
  });
  const [imgError, setImgError] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  React.useEffect(() => {
    setImgError(false);
    setIsValidated(false);
  }, [formData.logo]);

  const handleLogoLoad = () => {
    if (formData.logo) {
      setIsValidated(true);
      setTimeout(() => setIsValidated(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
                <Layers className={theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} size={20} />
              </div>
              <div>
                <h3 className={`text-xl font-display font-bold uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {lang === 'pl' ? 'Nowy Podmiot' : 'New Entity'}
                </h3>
                <p className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'pl' ? 'Podlega pod' : 'Parent'}: {parentName}
                </p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
              <X size={20} />
            </button>
          </div>

          {/* Logo Preview Section */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div 
                className={`w-32 h-32 rounded-2xl flex items-center justify-center border-4 overflow-hidden transition-all duration-300 ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
                style={{ borderColor: formData.logo ? `${formData.color}40` : undefined }}
              >
                {formData.logo && !imgError ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={formData.logo} 
                      alt={formData.name} 
                      className="w-full h-full object-contain p-4" 
                      referrerPolicy="no-referrer"
                      onLoad={handleLogoLoad}
                      onError={() => setImgError(true)}
                    />
                    {isValidated && (
                      <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                        <span className="bg-emerald-500 text-slate-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                          {lang === 'pl' ? 'Poprawny' : 'Valid'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <Building2 size={48} style={{ color: formData.color }} className="opacity-40" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 shadow-lg border-2 border-slate-900">
                <ImageIcon size={14} />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'pl' ? 'Nazwa (PL)' : 'Name (PL)'}
                </label>
                <input 
                  autoFocus
                  type="text" 
                  required
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all ${
                    theme === 'dark' 
                    ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'pl' ? 'Nazwa (EN)' : 'Name (EN)'}
                </label>
                <input 
                  type="text" 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all ${
                    theme === 'dark' 
                    ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  value={formData.nameEn}
                  onChange={e => setFormData({...formData, nameEn: e.target.value})}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'pl' ? 'Opis (PL)' : 'Description (PL)'}
                </label>
                <textarea 
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none h-20 ${
                    theme === 'dark' 
                    ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Typ</label>
                  <select 
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer ${
                      theme === 'dark' 
                      ? 'bg-slate-900/50 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as EntityType})}
                  >
                    {Object.values(EntityType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Lokalizacja</label>
                  <input 
                    type="text" 
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all ${
                      theme === 'dark' 
                      ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'pl' ? 'URL Logo' : 'Logo URL'}
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="url" 
                    className={`w-full border rounded-lg pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all ${
                      theme === 'dark' 
                      ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                    placeholder="https://..."
                    value={formData.logo || ''}
                    onChange={e => setFormData({...formData, logo: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Kolor Podmiotu</label>
                <div className="flex gap-3 flex-wrap">
                  {ENTITY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-6 h-6 rounded-full transition-all duration-300 ${
                        formData.color === color.value 
                          ? `ring-2 ring-offset-2 ${theme === 'dark' ? 'ring-offset-[#0f172a]' : 'ring-offset-white'} ring-cyan-500 scale-125` 
                          : 'hover:scale-110 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all ${
                  theme === 'dark' 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {lang === 'pl' ? 'Anuluj' : 'Cancel'}
              </button>
              <button 
                type="submit"
                className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {lang === 'pl' ? 'Zatwierdź' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEntityModal;
