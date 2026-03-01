
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { consortiumData as initialData } from './data';
import { ConsortiumEntity, EntityType, Person, Theme } from './types';
import MapView from './components/MapView';
import NetworkView from './components/NetworkView';
import TreeView from './components/TreeView';
import PeopleView from './components/PeopleView';
import AffiliationView from './components/AffiliationView';
import EntityDetail from './components/EntityDetail';
import AddEntityModal from './components/AddEntityModal';
import EditEntityModal from './components/EditEntityModal';
import AddManagerModal from './components/AddManagerModal';
import EditPersonModal from './components/EditPersonModal';
import { Info, Share2, ZoomIn, ZoomOut, Maximize, Loader2, Network, GitGraph, Layers, Languages, Sun, Moon, Download, Upload, Image as ImageIcon, User, Zap, Save } from 'lucide-react';
import html2canvas from 'html2canvas';

type ViewMode = 'hierarchy' | 'network' | 'tree' | 'people' | 'affiliation';
export type Language = 'pl' | 'en';

const App: React.FC = () => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('igc-data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialData;
      }
    }
    return initialData;
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('igc-view-mode');
    return (saved as ViewMode) || 'tree';
  });

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('igc-lang');
    return (saved as Language) || 'pl';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('igc-theme');
    return (saved as Theme) || 'dark';
  });

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>('global');
  const [showDetails, setShowDetails] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddManagerModalOpen, setIsAddManagerModalOpen] = useState(false);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [parentIdForNewEntity, setParentIdForNewEntity] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [peopleSearchTerm, setPeopleSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportJSON(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Zoom and Pan state
  const [viewStates, setViewStates] = useState<Record<ViewMode, { zoom: number; offset: { x: number; y: number } }>>(() => {
    const defaults = {
      tree: { zoom: 1, offset: { x: 0, y: 0 } },
      hierarchy: { zoom: 1, offset: { x: 0, y: 0 } },
      network: { zoom: 1, offset: { x: 0, y: 0 } },
      people: { zoom: 1, offset: { x: 0, y: 0 } },
      affiliation: { zoom: 1, offset: { x: 0, y: 0 } }
    };
    const saved = localStorage.getItem('igc-view-states');
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  // Save all states to localStorage
  React.useEffect(() => {
    localStorage.setItem('igc-data', JSON.stringify(data));
    localStorage.setItem('igc-view-mode', viewMode);
    localStorage.setItem('igc-lang', lang);
    localStorage.setItem('igc-theme', theme);
    localStorage.setItem('igc-view-states', JSON.stringify(viewStates));
  }, [data, viewMode, lang, theme, viewStates]);

  const zoom = viewStates[viewMode].zoom;
  const offset = viewStates[viewMode].offset;

  const setZoom = (value: number | ((prev: number) => number)) => {
    setViewStates(prev => {
      const currentZoom = prev[viewMode].zoom;
      const newZoom = typeof value === 'function' ? value(currentZoom) : value;
      return {
        ...prev,
        [viewMode]: {
          ...prev[viewMode],
          zoom: newZoom
        }
      };
    });
  };

  const setOffset = (value: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    setViewStates(prev => {
      const currentOffset = prev[viewMode].offset;
      const newOffset = typeof value === 'function' ? value(currentOffset) : value;
      return {
        ...prev,
        [viewMode]: {
          ...prev[viewMode],
          offset: newOffset
        }
      };
    });
  };

  const exportRef = useRef<HTMLDivElement>(null);

  const selectedEntity = useMemo(() => {
    return selectedEntityId ? data.entities[selectedEntityId] : null;
  }, [selectedEntityId, data]);

  const handleSelectEntity = (id: string) => {
    setSelectedEntityId(id);
    setShowDetails(true);
  };

  const handleOpenAddModal = (parentId: string) => {
    setParentIdForNewEntity(parentId);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (id?: string) => {
    if (id && typeof id === 'string') {
      setSelectedEntityId(id);
    }
    setIsEditModalOpen(true);
  };

  const handleOpenAddManagerModal = (entityId?: string) => {
    if (entityId) {
      setSelectedEntityId(entityId);
    } else if (!selectedEntityId) {
      // Default to global if nothing is selected
      setSelectedEntityId('global');
    }
    setIsAddManagerModalOpen(true);
  };

  const handleOpenEditPersonModal = (person: Person) => {
    setPersonToEdit(person);
    setIsEditPersonModalOpen(true);
  };

  const allPeopleNames = useMemo(() => {
    const names = new Set<string>();
    (Object.values(data.entities) as ConsortiumEntity[]).forEach(e => {
      e.management.forEach(p => names.add(p.name));
    });
    return Array.from(names);
  }, [data]);

  const handleAddEntity = (newEntity: Partial<ConsortiumEntity>) => {
    if (!parentIdForNewEntity) return;

    const id = newEntity.name?.toLowerCase().replace(/\s+/g, '-') || `entity-${Date.now()}`;
    const entity: ConsortiumEntity = {
      id,
      name: newEntity.name || 'Nowy Podmiot',
      nameEn: newEntity.nameEn || newEntity.name,
      description: newEntity.description || '',
      descriptionEn: newEntity.descriptionEn || newEntity.description,
      type: newEntity.type || EntityType.ADMIN_POLAND,
      color: newEntity.color || '#94a3b8',
      management: newEntity.management || [],
      parent: parentIdForNewEntity,
      location: newEntity.location,
    };

    setData(prev => {
      const parent = prev.entities[parentIdForNewEntity];
      return {
        ...prev,
        entities: {
          ...prev.entities,
          [id]: entity,
          [parentIdForNewEntity]: {
            ...parent,
            subEntities: [...(parent.subEntities || []), id]
          }
        }
      };
    });
    
    setSelectedEntityId(id);
    setShowDetails(true);
    setIsAddModalOpen(false);
  };

  const handleAddManager = (newManager: Person) => {
    if (!selectedEntityId) return;
    setData(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [selectedEntityId]: {
          ...prev.entities[selectedEntityId],
          management: [...prev.entities[selectedEntityId].management, newManager]
        }
      }
    }));
    setIsAddManagerModalOpen(false);
  };

  const handleUpdateEntity = useCallback((updatedEntity: ConsortiumEntity, shouldClose: boolean = true) => {
    setData(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [updatedEntity.id]: updatedEntity
      }
    }));
    if (shouldClose) {
      setIsEditModalOpen(false);
    }
  }, []);

  const handleDeleteEntity = useCallback((id: string) => {
    setData(prev => {
      const newEntities = { ...prev.entities };
      const entityToDelete = newEntities[id];
      
      if (!entityToDelete) return prev;

      // Remove from parent's subEntities
      if (entityToDelete.parent) {
        const parent = newEntities[entityToDelete.parent];
        if (parent) {
          newEntities[entityToDelete.parent] = {
            ...parent,
            subEntities: parent.subEntities?.filter(sid => sid !== id)
          };
        }
      }

      // Recursively delete sub-entities? 
      // For now, let's just detach them or delete them. 
      // Detaching is safer, but deleting is often what's expected.
      // Let's detach them by setting their parent to null or the grandparent.
      if (entityToDelete.subEntities) {
        entityToDelete.subEntities.forEach(sid => {
          if (newEntities[sid]) {
            newEntities[sid] = {
              ...newEntities[sid],
              parent: entityToDelete.parent
            };
            // Also add to grandparent's subEntities
            if (entityToDelete.parent && newEntities[entityToDelete.parent]) {
              const grandparent = newEntities[entityToDelete.parent];
              newEntities[entityToDelete.parent] = {
                ...grandparent,
                subEntities: [...(grandparent.subEntities || []), sid]
              };
            }
          }
        });
      }

      delete newEntities[id];
      return { ...prev, entities: newEntities };
    });
    
    setSelectedEntityId(null);
    setShowDetails(false);
    setIsEditModalOpen(false);
  }, [data.entities]);

  const handleUpdatePerson = useCallback((updatedPerson: Person, shouldClose: boolean = true) => {
    if (!personToEdit || !selectedEntityId) return;
    
    setData(prev => {
      const newEntities = { ...prev.entities };
      
      // Update person in ALL entities they might be in
      Object.keys(newEntities).forEach(id => {
        const entity = newEntities[id];
        const personIndex = entity.management.findIndex(p => p.name === personToEdit.name);
        if (personIndex > -1) {
          const newManagement = [...entity.management];
          newManagement[personIndex] = { ...newManagement[personIndex], ...updatedPerson };
          newEntities[id] = { ...entity, management: newManagement };
        }
      });
      
      return { ...prev, entities: newEntities };
    });
    
    if (shouldClose) {
      setIsEditPersonModalOpen(false);
      setPersonToEdit(null);
    }
  }, [personToEdit, selectedEntityId]);

  const handleDeletePerson = useCallback((name: string) => {
    setData(prev => {
      const newEntities = { ...prev.entities };
      
      Object.keys(newEntities).forEach(id => {
        const entity = newEntities[id];
        const newManagement = entity.management.filter(p => p.name !== name);
        if (newManagement.length !== entity.management.length) {
          newEntities[id] = { ...entity, management: newManagement };
        }
      });
      
      // Also remove from custom links
      const newCustomLinks = prev.customLinks?.filter(l => 
        l.source !== `person-${name}` && l.target !== `person-${name}`
      );
      
      return { ...prev, entities: newEntities, customLinks: newCustomLinks };
    });
    
    setIsEditPersonModalOpen(false);
    setPersonToEdit(null);
  }, []);

  const handleAddCustomLink = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setData(prev => {
      const exists = prev.customLinks?.some(l => 
        (l.source === sourceId && l.target === targetId) || 
        (l.source === targetId && l.target === sourceId)
      );
      if (exists) return prev;

      return {
        ...prev,
        customLinks: [
          ...(prev.customLinks || []),
          { source: sourceId, target: targetId }
        ]
      };
    });
    setIsConnecting(false);
    setConnectionSource(null);
  };

  const handleRemoveCustomLink = (sourceId: string, targetId: string) => {
    setData(prev => ({
      ...prev,
      customLinks: prev.customLinks?.filter(l => 
        !(l.source === sourceId && l.target === targetId) && 
        !(l.source === targetId && l.target === sourceId)
      )
    }));
  };

  const handleMoveEntity = (entityId: string, newParentId: string) => {
    if (entityId === newParentId) return;

    // Cycle detection: check if newParentId is a descendant of entityId
    const isDescendant = (parent: string, target: string): boolean => {
      const entity = data.entities[parent];
      if (!entity || !entity.subEntities) return false;
      if (entity.subEntities.includes(target)) return true;
      return entity.subEntities.some(child => isDescendant(child, target));
    };

    if (isDescendant(entityId, newParentId)) {
      console.warn("Cannot move entity into its own descendant");
      return;
    }

    setData(prev => {
      const entity = prev.entities[entityId];
      const oldParentId = entity.parent;
      
      if (!oldParentId || !prev.entities[oldParentId] || !prev.entities[newParentId]) {
        return prev;
      }

      const oldParent = prev.entities[oldParentId];
      const targetEntity = prev.entities[newParentId];
      
      // Case 1: Reordering siblings (dropping on a sibling)
      if (targetEntity.parent === oldParentId && entityId !== newParentId) {
        const siblings = [...(oldParent.subEntities || [])];
        const sourceIndex = siblings.indexOf(entityId);
        const targetIndex = siblings.indexOf(newParentId);
        
        if (sourceIndex > -1 && targetIndex > -1) {
          siblings.splice(sourceIndex, 1);
          // Insert after the target
          siblings.splice(targetIndex, 0, entityId);
          
          return {
            ...prev,
            entities: {
              ...prev.entities,
              [oldParentId]: { ...oldParent, subEntities: siblings }
            }
          };
        }
      }

      // Case 2: Restructuring (dropping on a new parent)
      // 1. Remove from old parent
      const newOldParentSubEntities = oldParent.subEntities?.filter(id => id !== entityId) || [];

      // 2. Add to new parent
      const newParent = prev.entities[newParentId];
      const newNewParentSubEntities = [...(newParent.subEntities || []), entityId];

      return {
        ...prev,
        entities: {
          ...prev.entities,
          [oldParentId]: { ...oldParent, subEntities: newOldParentSubEntities },
          [newParentId]: { ...newParent, subEntities: newNewParentSubEntities },
          [entityId]: { ...entity, parent: newParentId }
        }
      };
    });
  };

  const handleManualMove = (entityId: string, x: number, y: number) => {
    // This is for MapView manual positioning
    // We can store this in the entity data if we want it to persist in JSON
    setData(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [entityId]: {
          ...prev.entities[entityId],
          // We could add x, y to ConsortiumEntity type, but for now we just update state
          // MapView already handles overrides via localStorage, but this allows us to sync data
        }
      }
    }));
  };

  const handleExportJSON = () => {
    const fullConfig = {
      data,
      viewMode,
      lang,
      theme,
      viewStates,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    const dataStr = JSON.stringify(fullConfig, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IGC-Architect-FullConfig-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Handle both old format (just data) and new format (full config)
        const importedData = json.data || (json.entities ? json : null);
        
        if (importedData && importedData.entities && typeof importedData.entities === 'object') {
          setData(importedData);
          
          if (json.viewMode) setViewMode(json.viewMode);
          if (json.lang) setLang(json.lang);
          if (json.theme) setTheme(json.theme);
          if (json.viewStates) setViewStates(json.viewStates);

          // Reset view to world or first entity
          const firstId = Object.keys(importedData.entities)[0];
          if (firstId) setSelectedEntityId(firstId);
        } else {
          alert(lang === 'pl' ? 'Nieprawidłowy format pliku' : 'Invalid file format');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert(lang === 'pl' ? 'Błąd podczas importu pliku' : 'Error importing file');
      }
    };
    reader.readAsText(file);
  };

  const handleExportJPG = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);

    try {
      await document.fonts.ready;
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: theme === 'dark' ? '#020617' : '#f8fafc',
        scale: 3,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const uiElements = clonedDoc.querySelectorAll('.export-ignore');
          uiElements.forEach(el => (el as HTMLElement).style.display = 'none');
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `IGC-Architect-${new Date().toISOString().split('T')[0]}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.4));
  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // UI Translations
  const t = {
    title: lang === 'pl' ? 'ARCHITEKTURA GLOBALNA IGC LOYALTY' : 'IGC LOYALTY GLOBAL ARCHITECTURE',
    subtitle: lang === 'pl' ? 'Struktura Konsorcjum • 2026' : 'Consortium Structure • 2026',
    viewTree: lang === 'pl' ? 'Drzewo' : 'Tree',
    viewMap: lang === 'pl' ? 'Mapa' : 'Map',
    viewNetwork: lang === 'pl' ? 'Sieć' : 'Network',
    viewPeople: lang === 'pl' ? 'Ludzie' : 'People',
    viewAffiliation: lang === 'pl' ? 'Afiliacja' : 'Affiliation',
    langChange: lang === 'pl' ? 'Zmień na EN' : 'Change to PL',
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden relative transition-colors duration-300 ${theme === 'dark' ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`absolute inset-0 bg-grid-circuit pointer-events-none transition-opacity duration-300 ${theme === 'dark' ? 'opacity-30' : 'opacity-10'}`} />
      <div className={`absolute inset-0 bg-gradient-to-b pointer-events-none transition-colors duration-300 ${theme === 'dark' ? 'from-transparent via-[#020617] to-[#020617]' : 'from-transparent via-slate-50 to-slate-50'}`} />

      <main ref={exportRef} className="flex-1 relative flex flex-col overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-end items-start pointer-events-none">
          <div className="flex flex-col items-end gap-3 pointer-events-auto export-ignore">
            <div className="flex gap-2">
              {/* View Mode Switcher */}
              <div className={`flex p-1 backdrop-blur border rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
                <button 
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'tree' 
                    ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Layers size={12} />
                  {t.viewTree}
                </button>
                <button 
                  onClick={() => setViewMode('hierarchy')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'hierarchy' 
                    ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <GitGraph size={12} />
                  {t.viewMap}
                </button>
                <button 
                  onClick={() => setViewMode('network')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'network' 
                    ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Network size={12} />
                  {t.viewNetwork}
                </button>
                <button 
                  onClick={() => setViewMode('people')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'people' 
                    ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <User size={12} />
                  {t.viewPeople}
                </button>
                <button 
                  onClick={() => setViewMode('affiliation')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'affiliation' 
                    ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Zap size={12} />
                  {t.viewAffiliation}
                </button>
              </div>

              {/* Theme & Lang */}
              <div className={`flex p-1 backdrop-blur border rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
                <button 
                  onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                  className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-amber-600'}`}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button 
                  onClick={() => setLang(lang === 'pl' ? 'en' : 'pl')}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600'}`}
                >
                  {lang.toUpperCase()}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Import/Export Buttons */}
              <div className={`flex p-1 backdrop-blur border rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
                <button 
                  onClick={handleExportJSON}
                  title={lang === 'pl' ? "Zapisz i Eksportuj" : "Save & Export"}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    theme === 'dark' 
                    ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' 
                    : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
                  }`}
                >
                  <Save size={16} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {lang === 'pl' ? 'Zapisz' : 'Save'}
                  </span>
                </button>
                <div className={`w-px h-4 my-auto mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  title="Import JSON"
                  className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800' : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'}`}
                >
                  <Upload size={16} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <div className={`w-px h-4 my-auto mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <button 
                  onClick={handleExportJPG}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                    theme === 'dark' 
                    ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800' 
                    : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'
                  }`}
                >
                  {isExporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                  {lang === 'pl' ? 'JPG' : 'JPG'}
                </button>
              </div>

              <div className={`flex p-1 backdrop-blur border rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
                <button className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'}`}>
                  <Share2 size={16} />
                </button>
                <button className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'}`}>
                  <Info size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 cursor-grab active:cursor-grabbing">
          {viewMode === 'tree' ? (
            <TreeView 
              entities={data.entities}
              selectedId={selectedEntityId} 
              onSelect={handleSelectEntity}
              onMoveEntity={handleMoveEntity}
              zoom={zoom}
              setZoom={setZoom}
              offset={offset}
              setOffset={setOffset}
              lang={lang}
              theme={theme}
            />
          ) : viewMode === 'hierarchy' ? (
            <MapView 
              entities={data.entities}
              customLinks={data.customLinks || []}
              selectedId={selectedEntityId} 
              onSelect={handleSelectEntity}
              onMoveEntity={handleManualMove}
              onAddCustomLink={handleAddCustomLink}
              onRemoveCustomLink={handleRemoveCustomLink}
              onAddEntity={handleOpenAddModal}
              onAddPerson={handleOpenAddManagerModal}
              isConnecting={isConnecting}
              setIsConnecting={setIsConnecting}
              connectionSource={connectionSource}
              setConnectionSource={setConnectionSource}
              zoom={zoom}
              setZoom={setZoom}
              offset={offset}
              setOffset={setOffset}
              lang={lang}
              theme={theme}
            />
          ) : viewMode === 'network' ? (
            <NetworkView 
              entities={data.entities}
              customLinks={data.customLinks || []}
              selectedId={selectedEntityId} 
              onSelect={handleSelectEntity}
              onMoveEntity={handleMoveEntity}
              onAddCustomLink={handleAddCustomLink}
              onRemoveCustomLink={handleRemoveCustomLink}
              onAddEntity={handleOpenAddModal}
              onAddPerson={handleOpenAddManagerModal}
              isConnecting={isConnecting}
              setIsConnecting={setIsConnecting}
              connectionSource={connectionSource}
              setConnectionSource={setConnectionSource}
              zoom={zoom}
              setZoom={setZoom}
              offset={offset}
              setOffset={setOffset}
              lang={lang}
              theme={theme}
            />
          ) : viewMode === 'affiliation' ? (
            <AffiliationView 
              entities={data.entities}
              customLinks={data.customLinks || []}
              selectedId={selectedEntityId} 
              onSelect={handleSelectEntity}
              onEditPerson={handleOpenEditPersonModal}
              onEditEntity={handleOpenEditModal}
              onAddEntity={handleOpenAddModal}
              onAddPerson={handleOpenAddManagerModal}
              onAddCustomLink={handleAddCustomLink}
              onRemoveCustomLink={handleRemoveCustomLink}
              onViewPeople={(name: string) => {
                setPeopleSearchTerm(name);
                setViewMode('people');
              }}
              isConnecting={isConnecting}
              setIsConnecting={setIsConnecting}
              connectionSource={connectionSource}
              setConnectionSource={setConnectionSource}
              zoom={zoom}
              setZoom={setZoom}
              offset={offset}
              setOffset={setOffset}
              lang={lang}
              theme={theme}
            />
          ) : (
            <PeopleView 
              entities={data.entities}
              lang={lang}
              theme={theme}
              initialSearchTerm={peopleSearchTerm}
            />
          )}
        </div>

        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 export-ignore">
           <button onClick={handleZoomIn} className={`p-3 backdrop-blur border rounded-full hover:border-cyan-500/50 transition-all ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-cyan-400' : 'bg-white/80 border-slate-200 text-slate-600 hover:text-cyan-600'}`}>
             <ZoomIn size={20} />
           </button>
           <button onClick={handleZoomOut} className={`p-3 backdrop-blur border rounded-full hover:border-cyan-500/50 transition-all ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-cyan-400' : 'bg-white/80 border-slate-200 text-slate-600 hover:text-cyan-600'}`}>
             <ZoomOut size={20} />
           </button>
           <button onClick={handleResetView} className={`p-3 backdrop-blur border rounded-full hover:border-cyan-500/50 transition-all ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-cyan-400' : 'bg-white/80 border-slate-200 text-slate-600 hover:text-cyan-600'}`}>
             <Maximize size={20} />
           </button>
        </div>
      </main>

      {selectedEntity && (
        <EntityDetail 
          entity={selectedEntity} 
          isOpen={showDetails} 
          onClose={() => setShowDetails(false)}
          onAddSubEntity={() => handleOpenAddModal(selectedEntity.id)}
          onAddManager={handleOpenAddManagerModal}
          onEditEntity={handleOpenEditModal}
          onEditPerson={handleOpenEditPersonModal}
          onViewPeople={(name: string) => {
            setPeopleSearchTerm(name);
            setViewMode('people');
          }}
          lang={lang}
          theme={theme}
        />
      )}

      {isEditPersonModalOpen && personToEdit && (
        <EditPersonModal 
          person={personToEdit}
          allPeopleNames={allPeopleNames}
          onClose={() => setIsEditPersonModalOpen(false)}
          onSubmit={handleUpdatePerson}
          onDelete={handleDeletePerson}
          lang={lang}
          theme={theme}
        />
      )}

      {isAddModalOpen && parentIdForNewEntity && (
        <AddEntityModal 
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddEntity}
          parentName={lang === 'pl' ? data.entities[parentIdForNewEntity]?.name : data.entities[parentIdForNewEntity]?.nameEn || data.entities[parentIdForNewEntity]?.name}
          lang={lang}
          theme={theme}
        />
      )}

      {isEditModalOpen && selectedEntity && (
        <EditEntityModal 
          entity={selectedEntity}
          allPeopleNames={allPeopleNames}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateEntity}
          onDelete={handleDeleteEntity}
          lang={lang}
          theme={theme}
        />
      )}

      {isAddManagerModalOpen && selectedEntity && (
        <AddManagerModal 
          onClose={() => setIsAddManagerModalOpen(false)}
          onSubmit={handleAddManager}
          entityName={lang === 'pl' ? selectedEntity.name : selectedEntity.nameEn || selectedEntity.name}
          allPeopleNames={allPeopleNames}
          lang={lang}
          theme={theme}
        />
      )}
    </div>
  );
};

export default App;
