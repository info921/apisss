
import React, { useState, useEffect } from 'react';
import { Person, Theme } from '../types';
import { X, Save, Image as ImageIcon, User, Globe, Trash2, Mail } from 'lucide-react';
import { Language } from '../App';

interface EditPersonModalProps {
  person: Person;
  allPeopleNames: string[];
  onClose: () => void;
  onSubmit: (updatedPerson: Person, shouldClose?: boolean) => void;
  onDelete?: (name: string) => void;
  lang: Language;
  theme: Theme;
}

const EditPersonModal: React.FC<EditPersonModalProps> = ({ 
  person, allPeopleNames, onClose, onSubmit, onDelete, lang, theme 
}) => {
  const [formData, setFormData] = useState<Person>({ ...person });
  const [imgError, setImgError] = useState(false);
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [formData.photo]);

  // Auto-save photo link when it's valid and loaded
  useEffect(() => {
    const isImgBBViewer = formData.photo?.includes('ibb.co/') && !formData.photo?.includes('i.ibb.co/');
    if (formData.photo && !imgError && !isImgBBViewer && formData.photo !== person.photo) {
      const timer = setTimeout(() => {
        onSubmit(formData, false);
        setShowSavedBadge(true);
        setTimeout(() => setShowSavedBadge(false), 2000);
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [formData.photo, imgError, person.photo, onSubmit]);

  const isImgBBViewer = formData.photo?.includes('ibb.co/') && !formData.photo?.includes('i.ibb.co/');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-xs rounded-3xl border shadow-2xl overflow-hidden relative ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
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
                  onClick={() => onDelete?.(person.name)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-600/20 transition-all"
                >
                  {lang === 'pl' ? 'TAK' : 'YES'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="py-1.5 px-4 border-b border-slate-800/50 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">
            {lang === 'pl' ? 'Edytuj Osobę' : 'Edit Person'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="flex justify-center mb-1">
             <div className="relative group">
                {formData.photo && !imgError ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-cyan-500/30 relative">
                    <img 
                      src={formData.photo} 
                      alt={formData.name} 
                      className="w-full h-full object-cover" 
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
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700">
                    <User size={40} className="text-slate-600" />
                  </div>
                )}
             </div>
          </div>

          <div className="space-y-2">
            {isImgBBViewer && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-relaxed">
                {lang === 'pl' 
                  ? 'Uwaga: Używasz linku do strony ImgBB zamiast bezpośredniego linku do zdjęcia. W ImgBB wybierz "Linki bezpośrednie" (Direct links).' 
                  : 'Note: You are using an ImgBB viewer link instead of a direct image link. In ImgBB, select "Direct links".'}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'pl' ? 'Imię i Nazwisko' : 'Full Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'pl' ? 'Rola / Stanowisko' : 'Role / Position'}
              </label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'pl' ? 'URL Zdjęcia' : 'Photo URL'}
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={formData.photo || ''}
                  onChange={e => setFormData({ ...formData, photo: e.target.value })}
                  placeholder="https://..."
                  className={`w-full pl-12 pr-4 py-2 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'pl' ? 'Z polecenia (Hierarchia)' : 'Referred By (Hierarchy)'}
              </label>
              <select
                value={formData.referredBy || ''}
                onChange={e => setFormData({ ...formData, referredBy: e.target.value })}
                className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                }`}
              >
                <option value="">{lang === 'pl' ? 'Brak polecenia' : 'No referral'}</option>
                {allPeopleNames.filter(n => n !== person.name).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  {lang === 'pl' ? 'Poziom (Tier)' : 'Tier Level'}
                </label>
                <select
                  value={formData.tierLevel || 'Tier 1'}
                  onChange={e => setFormData({ ...formData, tierLevel: e.target.value as any })}
                  className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                >
                  <option value="Tier 1">Tier 1 (Gold)</option>
                  <option value="Tier 2">Tier 2 (Blue)</option>
                  <option value="Tier 3">Tier 3 (Purple)</option>
                  <option value="Tier 4">Tier 4 (Pink)</option>
                  <option value="Tier 5">Tier 5 (Silver)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                >
                  <option value="active">{lang === 'pl' ? 'Aktywny' : 'Active'}</option>
                  <option value="inactive">{lang === 'pl' ? 'Nieaktywny' : 'Inactive'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  {lang === 'pl' ? 'O mnie (PL)' : 'About Me (PL)'}
                </label>
                <textarea
                  value={formData.aboutMe || ''}
                  onChange={e => setFormData({ ...formData, aboutMe: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all resize-none ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                  placeholder={lang === 'pl' ? 'Opisz siebie...' : 'Describe yourself...'}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  {lang === 'pl' ? 'O mnie (EN)' : 'About Me (EN)'}
                </label>
                <textarea
                  value={formData.aboutMeEn || ''}
                  onChange={e => setFormData({ ...formData, aboutMeEn: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-xl border-2 outline-none transition-all resize-none ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                  placeholder={lang === 'pl' ? 'Describe yourself...' : 'Describe yourself...'}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'pl' ? 'Moja strona' : 'My website'}
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className={`w-full pl-12 pr-4 py-2 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {lang === 'pl' ? 'Kontakt (Email)' : 'Contact (Email)'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className={`w-full pl-12 pr-4 py-2 rounded-xl border-2 outline-none transition-all ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus:border-cyan-500/50'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
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

          <div className="flex gap-3 pt-1">
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className={`p-3 rounded-xl transition-all ${
                  theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                }`}
                title={lang === 'pl' ? 'Usuń osobę' : 'Delete person'}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'pl' ? 'Anuluj' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {lang === 'pl' ? 'Zapisz' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPersonModal;
