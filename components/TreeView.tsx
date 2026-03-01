
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ConsortiumEntity, Theme } from '../types';
import { Award, Shield, GripVertical } from 'lucide-react';
import { Language } from '../App';

interface TreeViewProps {
  entities: Record<string, ConsortiumEntity>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveEntity?: (entityId: string, newParentId: string) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  offset: { x: number; y: number };
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  lang: Language;
  theme: Theme;
}

const TreeView: React.FC<TreeViewProps> = ({ entities, selectedId, onSelect, onMoveEntity, zoom, setZoom, offset, setOffset, lang, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Drag and Drop state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image if needed, or let browser handle it
    // const img = new Image();
    // img.src = '...';
    // e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNodeId && draggedNodeId !== id) {
      setDragOverNodeId(id);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNodeId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId && sourceId !== targetId && onMoveEntity) {
      onMoveEntity(sourceId, targetId);
    }
    
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Tree layout configuration
  const NODE_WIDTH = 320;
  const LEVEL_SPACING = 300;
  const SIBLING_SPACING = 380;

  const treeLayout = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const levels: Record<string, number> = {};

    // First pass: identify levels
    const computeLevels = (id: string, currentLevel: number) => {
      levels[id] = currentLevel;
      const entity = entities[id];
      if (entity?.subEntities) {
        entity.subEntities.forEach(subId => computeLevels(subId, currentLevel + 1));
      }
    };

    if (entities['global']) computeLevels('global', 0);

    // Second pass: compute horizontal positions
    const subTreeWidths: Record<string, number> = {};
    const computeWidths = (id: string): number => {
      const entity = entities[id];
      if (!entity?.subEntities || entity.subEntities.length === 0) {
        subTreeWidths[id] = SIBLING_SPACING;
        return SIBLING_SPACING;
      }
      const totalWidth = entity.subEntities.reduce((sum, subId) => sum + computeWidths(subId), 0);
      subTreeWidths[id] = totalWidth;
      return totalWidth;
    };

    if (entities['global']) computeWidths('global');

    const computePositions = (id: string, startX: number, level: number) => {
      const entity = entities[id];
      const width = subTreeWidths[id];
      const x = startX + width / 2;
      const y = level * LEVEL_SPACING + 100;
      
      positions[id] = { x, y };

      if (entity?.subEntities) {
        let currentX = startX;
        entity.subEntities.forEach(subId => {
          computePositions(subId, currentX, level + 1);
          currentX += subTreeWidths[subId];
        });
      }
    };

    if (entities['global']) computePositions('global', 0, 0);

    return positions;
  }, [entities]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tree-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart, setOffset]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative select-none overflow-hidden outline-none bg-dot-pattern ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onWheel={(e) => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom * factor, 0.1), 3);
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
        className="w-full h-full relative origin-top-left transition-transform duration-200 ease-out"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
      >
        <svg className="absolute inset-0 pointer-events-none" style={{ width: 10000, height: 10000 }}>
          <defs>
            <marker id="dot" markerWidth="4" markerHeight="4" refX="2" refY="2">
              <circle cx="2" cy="2" r="1.5" fill="rgba(34, 211, 238, 0.4)" />
            </marker>
          </defs>
          {(Object.entries(entities) as [string, ConsortiumEntity][]).map(([id, entity]) => {
            if (!entity.parent || !treeLayout[id] || !treeLayout[entity.parent]) return null;
            const from = treeLayout[entity.parent];
            const to = treeLayout[id];
            
            const midY = (from.y + to.y) / 2;
            const path = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;

            return (
              <g key={`link-${id}`}>
                <path d={path} stroke={theme === 'dark' ? "rgba(30, 41, 59, 0.8)" : "rgba(203, 213, 225, 0.8)"} strokeWidth="2" fill="none" />
                <path d={path} stroke="rgba(34, 211, 238, 0.3)" strokeWidth="4" fill="none" strokeDasharray="5, 15" className="animate-tree-flow" />
              </g>
            );
          })}
        </svg>

        {(Object.entries(entities) as [string, ConsortiumEntity][]).map(([id, entity]) => {
          const pos = treeLayout[id];
          if (!pos) return null;
          const isSelected = selectedId === id;
          const isExpanded = expandedNodes.has(id);
          const name = lang === 'pl' ? entity.name : entity.nameEn || entity.name;

          return (
            <div
              key={`node-${id}`}
              className={`tree-node absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group ${dragOverNodeId === id ? 'scale-110' : ''} ${draggedNodeId === id ? 'opacity-40 grayscale' : 'opacity-100'}`}
              style={{ left: pos.x, top: pos.y, width: NODE_WIDTH, zIndex: isSelected || isExpanded ? 30 : 10 }}
              onClick={() => onSelect(id)}
              draggable={!!onMoveEntity}
              onDragStart={(e) => handleDragStart(e, id)}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, id)}
            >
              <div className={`relative p-0.5 rounded-2xl transition-all duration-300 ${
                isSelected 
                  ? 'scale-105 shadow-[0_0_50px_rgba(34,211,238,0.3)]' 
                  : dragOverNodeId === id 
                    ? 'scale-105 ring-4 ring-green-500/50 shadow-[0_0_30px_rgba(34,211,238,0.5)]'
                    : 'hover:scale-[1.02]'
              }`}>
                <div className={`absolute inset-0 rounded-2xl blur-xl transition-opacity duration-500 ${isSelected || dragOverNodeId === id ? 'opacity-50' : 'opacity-10 group-hover:opacity-30'}`} style={{ backgroundColor: entity.color }} />
                
                <div className={`relative border-2 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-colors ${
                  isSelected 
                  ? 'border-cyan-400 ring-4 ring-cyan-500/10' 
                  : dragOverNodeId === id
                    ? 'border-green-400 ring-4 ring-green-500/10'
                    : `${theme === 'dark' ? 'border-slate-800 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'}`
                }`}>
                  {/* Background Layers */}
                  <div className={`absolute inset-0 transition-colors ${theme === 'dark' ? 'bg-[#020617]/90' : 'bg-white/95'}`} />
                  <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundColor: entity.color }} />
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    <div className={`p-3 flex items-center justify-between border-b transition-colors ${theme === 'dark' ? 'bg-slate-900/20 border-slate-800/50' : 'bg-slate-100/50 border-slate-200/50'}`}>
                      <div className="flex items-center gap-2">
                        {onMoveEntity && (
                          <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-slate-500/10 rounded transition-colors">
                            <GripVertical size={12} className="text-slate-500" />
                          </div>
                        )}
                        <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: entity.color }} />
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{entity.type}</span>
                      </div>
                      {entity.logo && (
                        <div className="w-6 h-6 rounded bg-white/10 p-0.5 border border-white/5">
                          <img src={entity.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h4 className={`text-[17px] font-bold font-display leading-tight uppercase mb-2 tracking-tight transition-colors ${theme === 'dark' ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'}`}>
                        {name}
                      </h4>
                      
                      <div className="space-y-3 mt-4">
                        
                        <div className="space-y-3">
                          {(isExpanded ? entity.management : entity.management.slice(0, 3)).map((m, i) => (
                            <div key={i} className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="mt-1.5 w-1 h-1 rounded-full bg-cyan-500 shrink-0" />
                                <div>
                                  <div className={`text-[16px] font-bold tracking-tight leading-none mb-1 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {m.name}
                                  </div>
                                  {(m.role || m.roleEn) && (
                                    <div className={`text-[9px] font-bold uppercase tracking-wider leading-none transition-colors ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>
                                      {lang === 'pl' ? m.role : m.roleEn || m.role}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {m.isPartner && <Award size={12} className="text-amber-500 shrink-0 mt-1" />}
                            </div>
                          ))}
                          {entity.management.length > 3 && (
                            <div 
                              className={`text-[9px] font-bold uppercase tracking-widest pt-1 cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}
                              onClick={(e) => toggleExpand(e, id)}
                            >
                              {isExpanded 
                                ? (lang === 'pl' ? 'Zwiń' : 'Show less') 
                                : `+ ${entity.management.length - 3} ${lang === 'pl' ? 'więcej' : 'more'}`
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

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
      
      <style>{`
        .bg-dot-pattern {
          background-image: radial-gradient(${theme === 'dark' ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px);
          background-size: 24px 24px;
        }
        @keyframes tree-flow-anim { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 40; } }
        .animate-tree-flow { animation: tree-flow-anim 4s linear infinite; }
      `}</style>
    </div>
  );
};

export default TreeView;
