
import React, { useMemo, useState } from 'react';
import { ConsortiumEntity, Theme, Person } from '../types';
import { User, Search, ArrowUpDown, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { Language } from '../App';

interface PeopleViewProps {
  entities: Record<string, ConsortiumEntity>;
  lang: Language;
  theme: Theme;
  initialSearchTerm?: string;
}

interface PersonWithEntity extends Person {
  entityName: string;
  entityColor: string;
}

type SortField = 'name' | 'entity';
type SortOrder = 'asc' | 'desc';

const PersonCardAvatar: React.FC<{ person: Person; theme: Theme }> = ({ person, theme }) => {
  const [error, setError] = React.useState(false);

  if (person.photo && !error) {
    return (
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 relative z-10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
        <img 
          src={person.photo} 
          alt={person.name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-white/10 relative z-10 shadow-2xl group-hover:scale-105 transition-transform duration-500 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
      <User size={40} className={theme === 'dark' ? 'text-slate-600' : 'text-slate-300'} />
    </div>
  );
};

const PeopleView: React.FC<PeopleViewProps> = ({ entities, lang, theme, initialSearchTerm = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  React.useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const allPeople = useMemo(() => {
    const people: PersonWithEntity[] = [];
    const seenNames = new Set<string>();

    (Object.values(entities) as ConsortiumEntity[]).forEach(entity => {
      entity.management.forEach(person => {
        const key = `${person.name}-${entity.name}`;
        if (!seenNames.has(key)) {
          people.push({
            ...person,
            entityName: lang === 'pl' ? entity.name : entity.nameEn || entity.name,
            entityColor: entity.color
          });
          seenNames.add(key);
        }
      });
    });

    return people.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.entityName.localeCompare(b.entityName);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [entities, lang, sortBy, sortOrder]);

  const filteredPeople = allPeople.filter(person => 
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.role && person.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className={`w-full h-full overflow-y-auto p-8 custom-scrollbar ${theme === 'dark' ? 'bg-[#020617]' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className={`text-4xl font-black tracking-tighter uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'pl' ? 'Ludzie Organizacji' : 'People of the Organization'}
            </h2>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {lang === 'pl' ? 'Pełna lista liderów i ekspertów Konsorcjum IGC Loyalty.' : 'Complete list of leaders and experts of the IGC Loyalty Consortium.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex p-1 backdrop-blur border rounded-2xl transition-colors bg-slate-900/50 border-slate-800">
              <button 
                onClick={() => toggleSort('name')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  sortBy === 'name' 
                    ? 'bg-cyan-500 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {lang === 'pl' ? 'Imię' : 'Name'}
                {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>
              <button 
                onClick={() => toggleSort('entity')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  sortBy === 'entity' 
                    ? 'bg-cyan-500 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {lang === 'pl' ? 'Podmiot' : 'Entity'}
                {sortBy === 'entity' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>
            </div>

            <div className="relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-slate-500 group-focus-within:text-cyan-400' : 'text-slate-400 group-focus-within:text-cyan-600'}`} />
              <input 
                type="text"
                placeholder={lang === 'pl' ? "Szukaj osoby lub podmiotu..." : "Search person or entity..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-11 pr-6 py-3 rounded-2xl border-2 outline-none transition-all w-full md:w-80 font-medium text-sm ${
                  theme === 'dark' 
                    ? 'bg-slate-900/50 border-slate-800 focus:border-cyan-500/50 text-white placeholder:text-slate-600' 
                    : 'bg-white border-slate-200 focus:border-cyan-500/50 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPeople.map((person, idx) => (
            <div
              key={`${person.name}-${idx}`}
              className={`group relative p-6 rounded-3xl border-2 transition-all duration-500 ${
                theme === 'dark' 
                  ? 'bg-slate-900/40 border-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-900/60' 
                  : 'bg-white border-slate-100 hover:border-cyan-500/30 hover:shadow-xl'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div 
                    className="absolute inset-0 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                    style={{ backgroundColor: person.entityColor }}
                  />
                  <PersonCardAvatar person={person} theme={theme} />
                  <div 
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg z-20"
                    style={{ backgroundColor: person.entityColor }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <h3 className={`text-xl font-bold tracking-tight mb-1 transition-colors ${theme === 'dark' ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'}`}>
                  {person.name}
                </h3>
                
                {(person.role || person.roleEn) && (
                  <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-4 ${theme === 'dark' ? 'text-cyan-500/80' : 'text-cyan-600/80'}`}>
                    {lang === 'pl' ? person.role : person.roleEn || person.role}
                  </p>
                )}

                {person.email && (
                  <div className={`flex items-center gap-2 mb-4 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600'}`}>
                    <Mail size={12} />
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                  </div>
                )}

                <div className={`mt-auto pt-4 border-t w-full flex flex-col items-center gap-1 ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-100'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {lang === 'pl' ? 'Podmiot' : 'Entity'}
                  </span>
                  <span className="text-xs font-bold" style={{ color: person.entityColor }}>
                    {person.entityName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPeople.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <User size={64} className="mb-4" />
            <p className="text-xl font-bold uppercase tracking-widest">
              {lang === 'pl' ? 'Nie znaleziono osób' : 'No people found'}
            </p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#1e293b' : '#cbd5e1'}; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PeopleView;
