
import React, { useState } from 'react';
import { X, UserPlus, Save, ShieldCheck, Shield, Globe, Mail, Image as ImageIcon } from 'lucide-react';
import { Person, Theme } from '../types';

interface AddManagerModalProps {
  onClose: () => void;
  onSubmit: (person: Person) => void;
  entityName: string;
  allPeopleNames: string[];
  lang: 'pl' | 'en';
  theme: Theme;
}

const AddManagerModal: React.FC<AddManagerModalProps> = ({ onClose, onSubmit, entityName, allPeopleNames, lang, theme }) => {
  const [formData, setFormData] = useState<Person>({
    name: '',
    role: '',
    referredBy: '',
    isPartner: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden relative ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
              <UserPlus className={theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">
                {lang === 'pl' ? 'Nowy Zarządca' : 'New Manager'}
              </h3>
              <p className={`text-[9px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{entityName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-center mb-2">
             <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700">
                <UserPlus size={32} className="text-slate-600" />
             </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                {lang === 'pl' ? 'Imię i Nazwisko' : 'Full Name'}
              </label>
              <input 
                autoFocus
                type="text" 
                required
                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                }`}
                placeholder="Jan Kowalski"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                {lang === 'pl' ? 'Rola / Stanowisko' : 'Role / Position'}
              </label>
              <input 
                type="text" 
                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                }`}
                placeholder="np. Dyrektor Operacyjny"
                value={formData.role || ''}
                onChange={e => setFormData({...formData, role: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                {lang === 'pl' ? 'URL Zdjęcia' : 'Photo URL'}
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="url" 
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                  }`}
                  placeholder="https://..."
                  value={formData.photo || ''}
                  onChange={e => setFormData({...formData, photo: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                {lang === 'pl' ? 'Z polecenia (Hierarchia)' : 'Referred By (Hierarchy)'}
              </label>
              <select
                value={formData.referredBy || ''}
                onChange={e => setFormData({ ...formData, referredBy: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                }`}
              >
                <option value="">{lang === 'pl' ? 'Brak polecenia' : 'No referral'}</option>
                {allPeopleNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                  {lang === 'pl' ? 'O mnie (PL)' : 'About Me (PL)'}
                </label>
                <textarea 
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all resize-none h-20 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                  }`}
                  value={formData.aboutMe || ''}
                  onChange={e => setFormData({...formData, aboutMe: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                  {lang === 'pl' ? 'O mnie (EN)' : 'About Me (EN)'}
                </label>
                <textarea 
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all resize-none h-20 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                  }`}
                  value={formData.aboutMeEn || ''}
                  onChange={e => setFormData({...formData, aboutMeEn: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                {lang === 'pl' ? 'Moja strona' : 'My website'}
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="url" 
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                  }`}
                  placeholder="https://..."
                  value={formData.website || ''}
                  onChange={e => setFormData({...formData, website: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                {lang === 'pl' ? 'Kontakt (Email)' : 'Contact (Email)'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50 text-slate-900'
                  }`}
                  placeholder="email@example.com"
                  value={formData.email || ''}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="isPartner"
                checked={formData.isPartner || false}
                onChange={e => setFormData({ ...formData, isPartner: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
              />
              <label htmlFor="isPartner" className="text-sm font-bold text-slate-400 cursor-pointer">
                {lang === 'pl' ? 'Partner Konsorcjum' : 'Consortium Partner'}
              </label>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {lang === 'pl' ? 'Anuluj' : 'Cancel'}
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {lang === 'pl' ? 'Zatwierdź' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManagerModal;
