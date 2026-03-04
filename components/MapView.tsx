
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { EntityType, ConsortiumEntity, Theme, CustomLink } from '../types';
import { User, Award, Shield, Link as LinkIcon, Plus, X as CloseIcon, Building2, UserPlus } from 'lucide-react';
import { Language } from '../App';

import * as d3 from 'd3';

interface MapViewProps {
  entities: Record<string, ConsortiumEntity>;
  customLinks: CustomLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveEntity?: (entityId: string, x: number, y: number) => void;
  onAddCustomLink: (source: string, target: string) => void;
  onRemoveCustomLink: (source: string, target: string) => void;
  onAddEntity?: (parentId: string) => void;
  onAddPerson?: () => void;
  isConnecting: boolean;
  setIsConnecting: (val: boolean) => void;
  connectionSource: string | null;
  setConnectionSource: (id: string | null) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  offset: { x: number; y: number };
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  lang: Language;
  theme: Theme;
  backgroundImage?: string | null;
}

interface MapNode extends d3.SimulationNodeDatum {
  id: string;
  targetX: number;
  targetY: number;
}

const MapView: React.FC<MapViewProps> = ({ 
  entities, customLinks, selectedId, onSelect, onMoveEntity, 
  onAddCustomLink, onRemoveCustomLink, onAddEntity, onAddPerson, isConnecting, setIsConnecting, 
  connectionSource, setConnectionSource, zoom, setZoom, offset, setOffset, lang, theme, backgroundImage 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 5504, height: 3072 });
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [liveDragPos, setLiveDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Fixed size map, no resize listener needed
  }, []);
  
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('igc-map-node-overrides');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error loading map node overrides:", e);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('igc-map-node-overrides', JSON.stringify(nodeOverrides));
    } catch (e) {
      console.error("Error saving map node overrides:", e);
    }
  }, [nodeOverrides]);

  const basePositions: Record<string, { x: number; y: number }> = {
    'global': { x: 50, y: 10 },
    'europe': { x: 50, y: 40 },
    'usa': { x: 50, y: 70 },
    // Clustered around Global (y=25)
    'blockchain': { x: 20, y: 25 },
    'bamboo': { x: 40, y: 25 },
    'retail': { x: 60, y: 25 },
    'marketing': { x: 80, y: 25 },
    // Clustered around Europe (y=55)
    'gov_poland': { x: 25, y: 55 },
    'nederland': { x: 50, y: 55 },
    'poland': { x: 75, y: 55 },
  };

  // Calculate positions directly without d3-force simulation
  useEffect(() => {
    const newPositions: Record<string, { x: number; y: number }> = {};
    
    Object.keys(entities).forEach(id => {
      const entity = entities[id];
      let defaultPos = { x: 50, y: 50 };
      
      if (!basePositions[id] && entity.parent && basePositions[entity.parent]) {
        const pPos = basePositions[entity.parent];
        defaultPos = { x: pPos.x, y: pPos.y + 15 };
      }

      const base = basePositions[id] || defaultPos;
      const override = nodeOverrides[id];
      
      newPositions[id] = {
        x: override ? override.x : base.x,
        y: override ? override.y : base.y
      };
    });

    setSimulatedPositions(newPositions);
  }, [entities, nodeOverrides]);

  const nodePositions = useMemo(() => {
    if (!liveDragPos) return simulatedPositions;
    return {
      ...simulatedPositions,
      [liveDragPos.id]: { x: liveDragPos.x, y: liveDragPos.y }
    };
  }, [simulatedPositions, liveDragPos]);

  const getTooltipPosition = (id: string) => {
    const pos = nodePositions[id];
    if (!pos) return { x: 0, y: 0 };
    
    // Calculate screen position based on zoom, offset and percentage position
    const x = offset.x + (pos.x / 100) * containerSize.width * zoom;
    const y = offset.y + (pos.y / 100) * containerSize.height * zoom;
    
    return { x, y };
  };

  const connections = useMemo(() => {
    const list: { from: string; to: string; type: 'hierarchy' | 'collaboration' | 'custom' }[] = [];
    (Object.values(entities) as ConsortiumEntity[]).forEach(entity => {
      if (entity.parent) list.push({ from: entity.parent, to: entity.id, type: 'hierarchy' });
    });

    // Additional requested connections (cross-hierarchy links)
    if (entities['europe']) {
      if (entities['bamboo']) list.push({ from: 'europe', to: 'bamboo', type: 'collaboration' });
      if (entities['retail']) list.push({ from: 'europe', to: 'retail', type: 'collaboration' });
    }

    // Custom links
    customLinks.forEach(link => {
      list.push({ from: link.source, to: link.target, type: 'custom' });
    });

    return list;
  }, [entities, customLinks]);

  const getCurvePath = (from: {x: number, y: number}, to: {x: number, y: number}) => {
    const dy = to.y - from.y;
    return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy * 0.5}, ${to.x} ${to.y - dy * 0.5}, ${to.x} ${to.y}`;
  };

  const handleMouseDownMap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.entity-node')) return;
    setIsDraggingMap(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (isConnecting) {
      if (!connectionSource) {
        setConnectionSource(id);
      } else if (connectionSource !== id) {
        onAddCustomLink(connectionSource, id);
      } else {
        setConnectionSource(null);
      }
      return;
    }

    setDraggedNodeId(id);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentPos = nodePositions[id];
    
    // Convert mouse position to map percentage coordinates
    const mouseMapX = ((e.clientX - rect.left - offset.x) / zoom) / containerSize.width * 100;
    const mouseMapY = ((e.clientY - rect.top - offset.y) / zoom) / containerSize.height * 100;
    
    // Store the offset between mouse and node center in percentage units
    setDragStart({ x: mouseMapX - currentPos.x, y: mouseMapY - currentPos.y });
    setLiveDragPos({ id, x: currentPos.x, y: currentPos.y });
    onSelect(id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left - offset.x) / zoom) / containerSize.width * 100;
      const my = ((e.clientY - rect.top - offset.y) / zoom) / containerSize.height * 100;
      setMousePos({ x: mx, y: my });
    }

    if (isDraggingMap) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggedNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Convert current mouse position to map percentage coordinates
      const mouseMapX = ((e.clientX - rect.left - offset.x) / zoom) / containerSize.width * 100;
      const mouseMapY = ((e.clientY - rect.top - offset.y) / zoom) / containerSize.height * 100;
      
      const newX = mouseMapX - dragStart.x;
      const newY = mouseMapY - dragStart.y;

      setLiveDragPos({ id: draggedNodeId, x: newX, y: newY });
      
      // We don't update nodeOverrides here to avoid heavy simulation on every frame
    }
  }, [isDraggingMap, draggedNodeId, dragStart, offset, zoom, setOffset, containerSize]);

  const handleMouseUp = useCallback(() => {
    if (draggedNodeId && liveDragPos) {
      setNodeOverrides(prev => ({
        ...prev,
        [draggedNodeId]: { x: liveDragPos.x, y: liveDragPos.y }
      }));
      if (onMoveEntity) {
        onMoveEntity(draggedNodeId, liveDragPos.x, liveDragPos.y);
      }
    }
    setIsDraggingMap(false);
    setDraggedNodeId(null);
    setLiveDragPos(null);
  }, [draggedNodeId, liveDragPos, onMoveEntity]);

  useEffect(() => {
    if (isDraggingMap || draggedNodeId || isConnecting) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingMap, draggedNodeId, isConnecting, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative p-12 select-none overflow-hidden outline-none bg-dot-pattern ${draggedNodeId ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDownMap}
      onWheel={(e) => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom * factor, 0.2), 5);
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const targetX = (mouseX - offset.x) / zoom;
        const targetY = (mouseY - offset.y) / zoom;
        setZoom(newZoom);
        setOffset({ x: mouseX - targetX * newZoom, y: mouseY - targetY * newZoom });
      }}
    >
      <div 
        className={`relative origin-top-left ${(isDraggingMap || draggedNodeId) ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          width: 5504,
          height: 3072
        }}
      >
        {backgroundImage && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img 
              src={backgroundImage} 
              alt="Map Background" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="5"
              refX="7"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 8 2.5, 0 5" fill={theme === 'dark' ? "#22d3ee" : "#0891b2"} opacity="0.8" />
            </marker>
            <marker
              id="arrowhead-collab"
              markerWidth="8"
              markerHeight="5"
              refX="7"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 8 2.5, 0 5" fill={theme === 'dark' ? "#f59e0b" : "#d97706"} opacity="0.8" />
            </marker>
            <marker
              id="arrowhead-custom"
              markerWidth="8"
              markerHeight="5"
              refX="7"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 8 2.5, 0 5" fill={theme === 'dark' ? "#a855f7" : "#9333ea"} opacity="0.8" />
            </marker>
          </defs>
          {connections.map((conn, idx) => {
            const fromPos = nodePositions[conn.from];
            const toPos = nodePositions[conn.to];
            if (!fromPos || !toPos) return null;
            
            const isCollab = conn.type === 'collaboration';
            const isCustom = conn.type === 'custom';
            
            const baseColor = isCustom
              ? (theme === 'dark' ? "rgba(168, 85, 247, 0.4)" : "rgba(147, 51, 234, 0.5)")
              : isCollab 
                ? (theme === 'dark' ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.4)")
                : (theme === 'dark' ? "rgba(30, 41, 59, 0.4)" : "rgba(203, 213, 225, 0.6)");
            
            const glowColor = isCustom
              ? (theme === 'dark' ? "rgba(168, 85, 247, 0.2)" : "rgba(147, 51, 234, 0.15)")
              : isCollab
                ? (theme === 'dark' ? "rgba(245, 158, 11, 0.15)" : "rgba(217, 119, 6, 0.1)")
                : (theme === 'dark' ? "rgba(34, 211, 238, 0.15)" : "rgba(8, 145, 178, 0.1)");
              
            const flowColor = isCustom
              ? (theme === 'dark' ? "rgba(168, 85, 247, 0.6)" : "rgba(147, 51, 234, 0.5)")
              : isCollab
                ? (theme === 'dark' ? "rgba(245, 158, 11, 0.5)" : "rgba(217, 119, 6, 0.4)")
                : (theme === 'dark' ? "rgba(34, 211, 238, 0.5)" : "rgba(8, 145, 178, 0.4)");

            return (
              <g key={`conn-${idx}`} className="group/conn">
                {/* Base Connection Line */}
                <path 
                  d={getCurvePath(fromPos, toPos)} 
                  stroke={baseColor} 
                  strokeWidth={isCollab || isCustom ? "0.15" : "0.2"} 
                  fill="none" 
                  strokeDasharray={isCollab ? "1, 1" : isCustom ? "2, 2" : "none"}
                  className="transition-all duration-300"
                />
                
                {/* Pulsating Glow Line */}
                <path 
                  d={getCurvePath(fromPos, toPos)} 
                  stroke={glowColor} 
                  strokeWidth={isCollab || isCustom ? "0.4" : "0.5"} 
                  fill="none" 
                  className="animate-pulse-line"
                />

                {/* Animated Flow Line with Arrow */}
                <path 
                  d={getCurvePath(fromPos, toPos)} 
                  stroke={flowColor} 
                  strokeWidth={isCollab || isCustom ? "0.2" : "0.25"} 
                  fill="none" 
                  strokeDasharray={isCollab ? "1, 4" : isCustom ? "3, 6" : "2, 8"} 
                  className="animate-data-flow"
                  markerEnd={isCollab ? "url(#arrowhead-collab)" : isCustom ? "url(#arrowhead-custom)" : "url(#arrowhead)"}
                />

                {/* Delete Button for Custom Links */}
                {isCustom && (
                  <circle
                    cx={(fromPos.x + toPos.x) / 2}
                    cy={(fromPos.y + toPos.y) / 2}
                    r="1"
                    fill={theme === 'dark' ? '#ef4444' : '#dc2626'}
                    className="opacity-0 group-hover/conn:opacity-100 cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCustomLink(conn.from, conn.to);
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Temporary Connection Line */}
          {isConnecting && connectionSource && nodePositions[connectionSource] && (
            <path
              d={getCurvePath(nodePositions[connectionSource], mousePos)}
              stroke={theme === 'dark' ? "rgba(34, 211, 238, 0.5)" : "rgba(8, 145, 178, 0.5)"}
              strokeWidth="0.2"
              fill="none"
              strokeDasharray="2, 2"
            />
          )}
        </svg>

        {(Object.entries(entities) as [string, ConsortiumEntity][]).map(([id, entity]) => {
          const pos = nodePositions[id];
          if (!pos) return null;
          const isSelected = selectedId === id;
          const isConnectionSource = connectionSource === id;
          
          return (
            <div
              key={id}
              className={`entity-node absolute -translate-x-1/2 -translate-y-1/2 group ${draggedNodeId === id ? 'z-50' : 'z-10'}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onMouseDown={(e) => handleNodeMouseDown(e, id)}
              onMouseEnter={() => setHoveredNodeId(id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <div className={`relative p-0.5 rounded-2xl transition-all duration-300 ${isSelected ? 'scale-105 shadow-[0_0_40px_rgba(34,211,238,0.2)]' : 'hover:scale-[1.02]'} ${isConnectionSource ? 'ring-4 ring-purple-500 animate-pulse' : ''}`}>
                {/* Glow Background */}
                <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 blur-2xl ${isSelected ? 'opacity-50' : 'opacity-10 group-hover:opacity-30'}`} style={{ backgroundColor: entity.color }} />
                
                {/* Card Main Body */}
                <div className={`relative border-2 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-colors ${
                  isSelected 
                  ? 'border-cyan-400 w-80 ring-4 ring-cyan-500/10' 
                  : `${theme === 'dark' ? 'border-slate-800 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'} w-72`
                }`}>
                  {/* Background Layers */}
                  <div className={`absolute inset-0 transition-colors ${theme === 'dark' ? 'bg-[#020617]/90' : 'bg-white/95'}`} />
                  <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundColor: entity.color }} />
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Card Header */}
                    <div className={`p-4 flex items-center justify-between border-b transition-colors ${theme === 'dark' ? 'border-slate-800/50 bg-slate-900/20' : 'border-slate-200/50 bg-slate-100/50'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: entity.color }} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{entity.type}</span>
                      </div>
                      {entity.logo && (
                        <div className="w-8 h-8 rounded-lg bg-white/10 p-1 border border-white/5">
                          <img src={entity.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-6">
                      <h4 className={`text-[17px] font-bold font-display leading-snug uppercase mb-2.5 tracking-tight transition-colors ${theme === 'dark' ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'}`}>
                        {lang === 'pl' ? entity.name : entity.nameEn || entity.name}
                      </h4>
                      <p className={`text-[11px] leading-relaxed mb-6 font-medium transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lang === 'pl' ? entity.description : entity.descriptionEn || entity.description}
                      </p>
                      
                      <div className="space-y-4">
                        <div className="space-y-3.5 pr-1">
                          {entity.management.map((m, i) => (
                            <div key={i} className="flex items-center justify-between group/member">
                              <div className="flex items-center gap-3">
                                {m.photo ? (
                                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/30 shrink-0 shadow-lg">
                                    <img 
                                      src={m.photo} 
                                      alt={m.name} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700 shrink-0">
                                    <User size={16} className="text-slate-500" />
                                  </div>
                                )}
                                <div>
                                  <div className={`text-[15px] font-bold tracking-tight leading-tight mb-0.5 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {m.name}
                                  </div>
                                  {(m.role || m.roleEn) && (
                                    <div className={`text-[9px] font-bold uppercase tracking-wider leading-none transition-colors ${theme === 'dark' ? 'text-cyan-500/80' : 'text-cyan-600/80'}`}>
                                      {lang === 'pl' ? m.role : m.roleEn || m.role}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {m.isPartner && <Award size={12} className="text-amber-500 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Bar */}
                    <div className={`h-1 w-full mt-auto transition-colors ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}>
                      <div className={`h-full transition-all duration-700 ${isSelected ? 'w-full' : 'w-0'}`} style={{ backgroundColor: entity.color }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-6 right-6 flex gap-2">
        <button
          onClick={() => setIsConnecting(!isConnecting)}
          className={`px-4 py-2 rounded-xl border backdrop-blur-md shadow-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
            isConnecting
              ? 'bg-cyan-500 border-cyan-400 text-white'
              : theme === 'dark' 
                ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50' 
                : 'bg-white/80 border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-500/50'
          }`}
        >
          {isConnecting ? <CloseIcon size={14} /> : <LinkIcon size={14} />}
          {lang === 'pl' ? 'Dodaj połączenie' : 'Add connection'}
        </button>
        <button
          onClick={() => {
            setNodeOverrides({});
            localStorage.removeItem('igc-map-node-overrides');
          }}
          className={`px-4 py-2 rounded-xl border backdrop-blur-md shadow-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
            theme === 'dark' 
              ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50' 
              : 'bg-white/80 border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-500/50'
          }`}
        >
          Resetuj Pozycje
        </button>
      </div>

      {/* Tooltip Layer */}
      {hoveredNodeId && entities[hoveredNodeId] && (
        <div
          className={`absolute pointer-events-none z-50 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-slate-900/90 border-slate-700 text-slate-200' 
              : 'bg-white/90 border-slate-200 text-slate-800'
          }`}
          style={{
            left: getTooltipPosition(hoveredNodeId).x,
            top: getTooltipPosition(hoveredNodeId).y - 120 * zoom, // Offset above the card
            transform: 'translate(-50%, -100%)', // Center horizontally, place above
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entities[hoveredNodeId].color }} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {entities[hoveredNodeId].type}
            </span>
          </div>
          <div className="font-bold text-sm whitespace-nowrap">
            {lang === 'pl' ? entities[hoveredNodeId].name : entities[hoveredNodeId].nameEn || entities[hoveredNodeId].name}
          </div>
        </div>
      )}

      <style>{`
        .bg-dot-pattern {
          background-image: radial-gradient(${theme === 'dark' ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px);
          background-size: 24px 24px;
        }
        @keyframes data-flow-anim { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -20; } }
        .animate-data-flow { animation: data-flow-anim 3s linear infinite; }
        @keyframes pulse-line-anim {
          0%, 100% { opacity: 0.2; stroke-width: 0.3; }
          50% { opacity: 0.6; stroke-width: 0.6; }
        }
        .animate-pulse-line { animation: pulse-line-anim 4s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
      {/* Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => onAddEntity?.('global')}
          className={`px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
            theme === 'dark' 
              ? 'bg-cyan-500 text-slate-900 border-cyan-400 hover:bg-cyan-400' 
              : 'bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-500'
          }`}
        >
          <Building2 size={14} />
          {lang === 'pl' ? 'Dodaj Podmiot' : 'Add Entity'}
        </button>
        <button
          onClick={() => onAddPerson?.()}
          className={`px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
            theme === 'dark' 
              ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50' 
              : 'bg-white/80 border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-500/50'
          }`}
        >
          <UserPlus size={14} />
          {lang === 'pl' ? 'Dodaj Osobę' : 'Add Person'}
        </button>
      </div>
    </div>
  );
};

export default MapView;
