
import React from 'react';
import { ConsortiumEntity, Theme, EntityType, Person } from '../types';
import { X, User, MapPin, Briefcase, ChevronRight, Award, Plus, Pencil, Shield, ExternalLink, UserPlus, Trophy, Globe, Landmark, Building2, Mail } from 'lucide-react';
import { Language } from '../App';

interface EntityDetailProps {
  entity: ConsortiumEntity;
  isOpen: boolean;
  onClose: () => void;
  onAddSubEntity: () => void;
  onAddManager: () => void;
  onEditEntity: () => void;
  onEditPerson: (person: Person) => void;
  onViewPeople?: (name: string) => void;
  lang: Language;
  theme: Theme;
}

const PersonAvatar: React.FC<{ person: Person; theme: Theme }> = ({ person, theme }) => {
  const [error, setError] = React.useState(false);

  if (person.photo && !error) {
    return (
      <img 
        src={person.photo} 
        alt={person.name} 
        className="w-full h-full object-cover" 
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    );
  }

  if (person.isPartner) {
    return <Trophy size={24} className={theme === 'dark' ? "text-amber-500" : "text-amber-600"} />;
  }

  return <User size={24} />;
};

const EntityDetail: React.FC<EntityDetailProps> = ({ entity, isOpen, onClose, onAddSubEntity, onAddManager, onEditEntity, onEditPerson, onViewPeople, lang, theme }) => {
  const t = {
    addUnit: lang === 'pl' ? 'Dodaj Jednostkę' : 'Add Unit',
    addManager: lang === 'pl' ? 'Dodaj Zarządcę' : 'Add Manager',
    management: lang === 'pl' ? 'Zespół Zarządzający' : 'Management Team',
    subEntities: lang === 'pl' ? 'Podległe Struktury' : 'Subordinate Structures',
    defaultRole: lang === 'pl' ? 'Członek Zarządu' : 'Board Member',
  };

  const name = lang === 'pl' ? entity.name : entity.nameEn || entity.name;
  const desc = lang === 'pl' ? entity.description : entity.descriptionEn || entity.description;
  const location = lang === 'pl' ? entity.location : entity.locationEn || entity.location;

  const getIcon = (type: EntityType) => {
    const iconClass = theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600';
    switch (type) {
      case EntityType.SUPER_ADMIN_GLOBAL:
        return <Globe size={14} className={iconClass} />;
      case EntityType.SUPER_ADMIN_EUROPE:
        return <Landmark size={14} className={iconClass} />;
      case EntityType.ADMIN_GOV:
        return <Briefcase size={14} className={iconClass} />;
      case EntityType.ADMIN_USA:
      case EntityType.ADMIN_POLAND:
      case EntityType.ADMIN_NEDERLAND:
        return <Building2 size={14} className={iconClass} />;
      default:
        return <Shield size={14} className={iconClass} />;
    }
  };

  return (
    <div className={`fixed right-0 top-0 bottom-0 w-[450px] backdrop-blur-3xl border-l z-40 transition-transform duration-500 ease-in-out shadow-[-20px_0_60px_rgba(0,0,0,0.8)] ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } ${theme === 'dark' ? 'bg-[#020617]/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundColor: entity.color }} />
      <div className="h-full flex flex-col relative">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 blur-[120px] opacity-30 rounded-full animate-pulse pointer-events-none" 
          style={{ backgroundColor: entity.color }}
        />
        
        <div className="p-10 pb-6 relative z-10">
          <div className="absolute top-8 right-8 flex items-center gap-3">
            <button 
              onClick={onEditEntity}
              className={`p-2.5 rounded-xl transition-all border ${theme === 'dark' ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 border-slate-800 hover:border-cyan-500/50' : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100 border-slate-200 hover:border-cyan-500/50'}`}
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={onClose}
              className={`p-2.5 rounded-xl transition-all border ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200'}`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
             <div className={`px-3 py-1 rounded-full border text-[10px] font-black tracking-[0.2em] flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-cyan-400' : 'bg-slate-100 border-slate-200 text-cyan-600'}`}>
               {entity.logo ? (
                 <div className="w-4 h-4 rounded-sm overflow-hidden bg-white/10 p-0.5">
                   <img src={entity.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                 </div>
               ) : (
                 getIcon(entity.type)
               )}
               {entity.type}
             </div>
             {location && (
               <div className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                 <MapPin size={12} className={theme === 'dark' ? 'text-cyan-600' : 'text-cyan-500'} />
                 {location}
               </div>
             )}
             {entity.email && (
               <div className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                 <Mail size={12} className={theme === 'dark' ? 'text-cyan-600' : 'text-cyan-500'} />
                 <a href={`mailto:${entity.email}`} className="hover:text-cyan-400 transition-colors">{entity.email}</a>
               </div>
             )}
          </div>

          <h2 className={`text-4xl font-display font-bold mb-6 leading-[1.1] uppercase tracking-tighter drop-shadow-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {name}
          </h2>
          
          <p className={`text-[13px] leading-relaxed mb-8 font-medium border-l-2 pl-4 ${theme === 'dark' ? 'text-slate-400 border-cyan-500/30' : 'text-slate-600 border-cyan-500/30'}`}>
            {desc}
          </p>

          <div className="flex gap-3 mb-4">
            <button 
              onClick={onAddSubEntity}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              {t.addUnit}
            </button>
            <button 
              onClick={onAddManager}
              className={`flex-1 py-3 border rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-900/50 hover:bg-slate-800 text-cyan-400 border-slate-800 hover:border-cyan-500/50' : 'bg-slate-50 hover:bg-slate-100 text-cyan-600 border-slate-200 hover:border-cyan-500/50'}`}
            >
              <UserPlus size={14} />
              {t.addManager}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 pt-0 custom-scrollbar z-10">
          <div className="space-y-10">
            <div>
              <div className={`flex items-center justify-between mb-6 border-b pb-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <Shield size={14} className={theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'} />
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.management}</h3>
                </div>
              </div>
              
              <div className="grid gap-4">
                {entity.management.map((person, idx) => (
                  <div 
                    key={idx}
                    className={`p-5 border rounded-2xl flex items-center justify-between group transition-all ${
                      theme === 'dark' 
                      ? 'bg-slate-900/50 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/30' 
                      : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all overflow-hidden ${
                        theme === 'dark' 
                        ? 'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-cyan-500/30 group-hover:text-cyan-400' 
                        : 'bg-white border-slate-200 text-slate-400 group-hover:border-cyan-500/30 group-hover:text-cyan-600'
                      }`}>
                        <PersonAvatar person={person} theme={theme} />
                      </div>
                      <div>
                        <div className={`text-[18px] font-bold tracking-tight flex items-center gap-2 uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {person.name}
                          {person.isPartner && <Award size={16} className="text-amber-500" />}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>
                          {lang === 'pl' ? person.role || t.defaultRole : person.roleEn || person.role || t.defaultRole}
                        </div>
                        {(lang === 'pl' ? person.aboutMe : person.aboutMeEn || person.aboutMe) && (
                          <div className={`text-[11px] mt-2 leading-relaxed italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            "{lang === 'pl' ? person.aboutMe : person.aboutMeEn || person.aboutMe}"
                          </div>
                        )}
                        {person.website && (
                          <a 
                            href={person.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe size={10} />
                            {person.website.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        )}
                        {person.email && (
                          <a 
                            href={`mailto:${person.email}`}
                            className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail size={10} />
                            {person.email}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditPerson(person); }}
                        className={`p-2 rounded-lg transition-all border opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800 border-slate-700' : 'text-slate-500 hover:text-cyan-600 hover:bg-white border-slate-200'}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onViewPeople?.(person.name); }}
                        className={`p-2 rounded-lg transition-all border flex items-center justify-center ${theme === 'dark' ? 'text-slate-700 group-hover:text-cyan-500 group-hover:bg-slate-800 border-transparent group-hover:border-slate-700' : 'text-slate-300 group-hover:text-cyan-600 group-hover:bg-white border-transparent group-hover:border-slate-200'}`}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {entity.subEntities && entity.subEntities.length > 0 && (
              <div className="pb-10">
                <div className={`flex items-center gap-2 mb-6 border-b pb-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                  <Briefcase size={14} className={theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'} />
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.subEntities}</h3>
                </div>
                <div className="grid gap-2">
                  {entity.subEntities.map(subId => (
                    <div key={subId} className={`px-5 py-3.5 border rounded-xl flex items-center justify-between text-[11px] font-bold uppercase tracking-wider group transition-all ${
                      theme === 'dark' 
                      ? 'bg-slate-900/30 border-slate-800/50 text-slate-400 hover:bg-slate-800/50' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}>
                      <span className={`flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                         <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                         {subId.replace(/-/g, ' ')}
                      </span>
                      <ExternalLink size={14} className={`transition-colors ${theme === 'dark' ? 'text-slate-700 group-hover:text-cyan-400' : 'text-slate-300 group-hover:text-cyan-600'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityDetail;
