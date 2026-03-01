
import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Trash2, UserPlus, ShieldCheck, Shield, User, Building2, Image as ImageIcon, Mail } from 'lucide-react';
import { ConsortiumEntity, EntityType, Person, Theme } from '../types';
import { ENTITY_COLORS } from '../constants';
import { Language } from '../App';

interface EditEntityModalProps {
  entity: ConsortiumEntity;
  allPeopleNames: string[];
  onClose: () => void;
  onSubmit: (entity: ConsortiumEntity, shouldClose?: boolean) => void;
  onDelete?: (id: string) => void;
  lang: Language;
  theme: Theme;
}

const EditEntityModal: React.FC<EditEntityModalProps> = ({ 
  entity, allPeopleNames, onClose, onSubmit, onDelete, lang, theme 
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'management'>('basic');
  const [formData, setFormData] = useState<ConsortiumEntity>({ 
    ...entity,
    management: entity.management.map(m => ({ ...m })) 
  });
  const [imgError, setImgError] = useState(false);
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [formData.logo]);

  // Auto-save logo link when it's valid and loaded
  useEffect(() => {
    const isImgBBViewer = formData.logo?.includes('ibb.co/') && !formData.logo?.includes('i.ibb.co/');
    if (formData.logo && !imgError && !isImgBBViewer && formData.logo !== entity.logo) {
      const timer = setTimeout(() => {
        onSubmit(formData, false);
        setShowSavedBadge(true);
        setTimeout(() => setShowSavedBadge(false), 2000);
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [formData.logo, imgError, entity.logo, onSubmit]);

  const isImgBBViewer = formData.logo?.includes('ibb.co/') && !formData.logo?.includes('i.ibb.co/');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      onSubmit(formData);
    }
  };

  const handleAddMember = () => {
    setFormData(prev => ({
      ...prev,
      management: [...prev.management, { name: '', role: '', isPartner: false }]
    }));
  };

  const handleRemoveMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      management: prev.management.filter((_, i) => i !== index)
    }));
  };

  const handleMemberChange = (index: number, field: keyof Person, value: any) => {
    setFormData(prev => {
      const newMgmt = [...prev.management];
      newMgmt[index] = { ...newMgmt[index], [field]: value };
      return { ...prev, management: newMgmt };
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <p className="text-lg font-bold leading-tight">
                {lang === 'pl' 
                  ? 'Czy na pewno chcesz usunąć dane z widoku afiliacyjnego?' 
                  : 'Are you sure you want to delete data from the affiliation view?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'pl' ? 'NIE' : 'NO'}
                </button>
                <button
                  onClick={() => onDelete?.(entity.id)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-600/20 transition-all"
                >
                  {lang === 'pl' ? 'TAK' : 'YES'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: entity.color }} />
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <Settings className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} size={20} />
              </div>
              <div>
                <h3 className={`text-xl font-display font-bold uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {lang === 'pl' ? 'Konfiguracja Podmiotu' : 'Entity Configuration'}
                </h3>
                <p className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>ID: {entity.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onDelete && entity.id !== 'global' && (
                <button 
                  type="button"
                  onClick={() => {
                    if (window.confirm(lang === 'pl' ? 'Czy na pewno chcesz usunąć ten podmiot?' : 'Are you sure you want to delete this entity?')) {
                      onDelete(entity.id);
                    }
                  }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title={lang === 'pl' ? 'Usuń podmiot' : 'Delete entity'}
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={onClose} className={`p-2 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-4 border-b border-slate-800/50">
            <button 
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                activeTab === 'basic' 
                ? 'text-cyan-400 border-cyan-400' 
                : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {lang === 'pl' ? 'Podstawowe' : 'Basic Info'}
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('management')}
              className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                activeTab === 'management' 
                ? 'text-cyan-400 border-cyan-400' 
                : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {lang === 'pl' ? 'Zarządzanie' : 'Management'}
            </button>
          </div>

          {/* Logo Preview Section */}
          {activeTab === 'basic' && (
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div 
                  className={`w-32 h-32 rounded-2xl flex items-center justify-center border-4 overflow-hidden transition-all duration-300 ${
                    theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                  style={{ borderColor: formData.logo && !imgError ? `${formData.color}40` : undefined }}
                >
                  {formData.logo && !imgError ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={formData.logo} 
                        alt={formData.name} 
                        className="w-full h-full object-contain p-4" 
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                      />
                      {showSavedBadge && (
                        <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                          <span className="bg-cyan-500 text-slate-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                            {lang === 'pl' ? 'Zapisano' : 'Saved'}
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
          )}

          {isImgBBViewer && activeTab === 'basic' && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-relaxed">
              {lang === 'pl' 
                ? 'Uwaga: Używasz linku do strony ImgBB zamiast bezpośredniego linku do zdjęcia. W ImgBB wybierz "Linki bezpośrednie" (Direct links).' 
                : 'Note: You are using an ImgBB viewer link instead of a direct image link. In ImgBB, select "Direct links".'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'basic' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {lang === 'pl' ? 'Nazwa Podmiotu (PL)' : 'Entity Name (PL)'}
                    </label>
                    <input 
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
                      {lang === 'pl' ? 'Nazwa Podmiotu (EN)' : 'Entity Name (EN)'}
                    </label>
                    <input 
                      type="text" 
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all ${
                        theme === 'dark' 
                        ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                      value={formData.nameEn || ''}
                      onChange={e => setFormData({...formData, nameEn: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {lang === 'pl' ? 'Opis (PL)' : 'Description (PL)'}
                    </label>
                    <textarea 
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none h-24 ${
                        theme === 'dark' 
                        ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {lang === 'pl' ? 'Opis (EN)' : 'Description (EN)'}
                    </label>
                    <textarea 
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none h-24 ${
                        theme === 'dark' 
                        ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                      value={formData.descriptionEn || ''}
                      onChange={e => setFormData({...formData, descriptionEn: e.target.value})}
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
                        value={formData.location || ''}
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
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {lang === 'pl' ? 'Kontakt (Email)' : 'Contact (Email)'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="email" 
                        className={`w-full border rounded-lg pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all ${
                          theme === 'dark' 
                          ? 'bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                        }`}
                        placeholder="email@example.com"
                        value={formData.email || ''}
                        onChange={e => setFormData({...formData, email: e.target.value})}
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
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {lang === 'pl' ? 'Zespół Zarządzający' : 'Management Team'}
                  </label>
                  <button 
                    type="button"
                    onClick={handleAddMember}
                    className={`text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                  >
                    <UserPlus size={14} />
                    {lang === 'pl' ? 'Dodaj Osobę' : 'Add Person'}
                  </button>
                </div>
                
                <div className="max-h-[320px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {formData.management.map((person, index) => (
                    <div key={index} className={`p-4 border rounded-xl space-y-3 relative group ${
                      theme === 'dark' 
                      ? 'bg-slate-900/30 border-slate-800' 
                      : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                          {person.photo ? (
                            <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <input 
                          type="text"
                          placeholder={lang === 'pl' ? "Imię i Nazwisko" : "Full Name"}
                          className={`flex-1 bg-transparent border-b focus:border-cyan-500/50 text-sm py-1 outline-none ${
                            theme === 'dark' 
                            ? 'border-slate-800 text-white' 
                            : 'border-slate-200 text-slate-900'
                          }`}
                          value={person.name}
                          onChange={e => handleMemberChange(index, 'name', e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => handleRemoveMember(index)}
                          className="p-1 text-slate-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text"
                          placeholder={lang === 'pl' ? "Rola / Stanowisko" : "Role / Position"}
                          className={`bg-transparent border-b focus:border-cyan-500/50 text-[10px] py-1 outline-none ${
                            theme === 'dark' 
                            ? 'border-slate-800 text-slate-400' 
                            : 'border-slate-200 text-slate-500'
                          }`}
                          value={person.role || ''}
                          onChange={e => handleMemberChange(index, 'role', e.target.value)}
                        />
                        <input 
                          type="url"
                          placeholder={lang === 'pl' ? "URL Zdjęcia" : "Photo URL"}
                          className={`bg-transparent border-b focus:border-cyan-500/50 text-[10px] py-1 outline-none ${
                            theme === 'dark' 
                            ? 'border-slate-800 text-slate-400' 
                            : 'border-slate-200 text-slate-500'
                          }`}
                          value={person.photo || ''}
                          onChange={e => handleMemberChange(index, 'photo', e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <select
                          value={person.referredBy || ''}
                          onChange={e => handleMemberChange(index, 'referredBy', e.target.value)}
                          className={`flex-1 bg-transparent border-b focus:border-cyan-500/50 text-[10px] py-1 outline-none ${
                            theme === 'dark' 
                            ? 'border-slate-800 text-slate-400' 
                            : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="">{lang === 'pl' ? 'Brak polecenia' : 'No referral'}</option>
                          {allPeopleNames.filter(n => n !== person.name).map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleMemberChange(index, 'isPartner', !person.isPartner)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                            person.isPartner 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                            : `${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`
                          }`}
                        >
                          {person.isPartner ? <ShieldCheck size={10} /> : <Shield size={10} />}
                          {lang === 'pl' ? 'WSPÓLNIK' : 'PARTNER'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {formData.management.length === 0 && (
                    <div className={`py-8 text-center border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                        {lang === 'pl' ? 'Brak członków zespołu' : 'No team members'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`p-3 rounded-xl transition-all ${
                    theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                  }`}
                  title={lang === 'pl' ? 'Usuń podmiot' : 'Delete entity'}
                >
                  <Trash2 size={18} />
                </button>
              )}
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
                {lang === 'pl' ? 'Zaktualizuj' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEntityModal;
