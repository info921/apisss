
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ConsortiumEntity, Theme, CustomLink } from '../types';
import { Zap, User, Link as LinkIcon, X as CloseIcon, Building2, UserPlus } from 'lucide-react';
import { Language } from '../App';

import * as d3 from 'd3';

interface NetworkViewProps {
  entities: Record<string, ConsortiumEntity>;
  customLinks: CustomLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveEntity?: (entityId: string, newParentId: string) => void;
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
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  color: string;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string;
  target: string;
  type: 'hierarchy' | 'collaboration' | 'custom';
}

const NetworkView: React.FC<NetworkViewProps> = ({ 
  entities, customLinks, selectedId, onSelect, onMoveEntity, 
  onAddCustomLink, onRemoveCustomLink, onAddEntity, onAddPerson, isConnecting, setIsConnecting, 
  connectionSource, setConnectionSource, zoom, setZoom, offset, setOffset, lang, theme 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [simulatedLinks, setSimulatedLinks] = useState<NetworkLink[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Run d3-force simulation
  useEffect(() => {
    const nodes: NetworkNode[] = Object.keys(entities).map(id => ({
      id,
      color: entities[id].color,
      x: 50 + (Math.random() - 0.5) * 20, // Start near center
      y: 50 + (Math.random() - 0.5) * 20
    }));

    const links: NetworkLink[] = [];
    (Object.values(entities) as ConsortiumEntity[]).forEach(entity => {
      if (entity.parent && entities[entity.parent]) {
        links.push({ source: entity.parent, target: entity.id, type: 'hierarchy' });
      }
    });

    // Additional requested connections (cross-hierarchy links)
    if (entities['europe']) {
      if (entities['bamboo']) links.push({ source: 'europe', target: 'bamboo', type: 'collaboration' });
      if (entities['retail']) links.push({ source: 'europe', target: 'retail', type: 'collaboration' });
    }

    // Custom links
    customLinks.forEach(link => {
      links.push({ source: link.source, target: link.target, type: 'custom' });
    });

    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(links).id(d => d.id).distance(80).strength(0.8))
      .force("charge", d3.forceManyBody().strength(-800).distanceMax(150)) // Stronger repulsion
      .force("y", d3.forceY<NetworkNode>(d => {
        if (d.id === 'global') return 10;
        if (d.id === 'europe') return 40;
        if (d.id === 'usa') return 70;
        // Cluster others around their parents or in the middle
        const entity = entities[d.id];
        if (entity.parent === 'global') return 25;
        if (entity.parent === 'europe') return 55;
        return 50;
      }).strength(0.5))
      .force("center", d3.forceCenter(50, 50))
      .force("collision", d3.forceCollide().radius(35).iterations(15)) // Increased radius and iterations
      .stop();

    // Run simulation for a fixed number of ticks to settle
    for (let i = 0; i < 2000; ++i) simulation.tick();

    const newPositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      newPositions[node.id] = { 
        x: Math.max(5, Math.min(95, node.x || 50)), 
        y: Math.max(5, Math.min(95, node.y || 50)) 
      };
    });

    setSimulatedPositions(newPositions);
    setSimulatedLinks(links);
  }, [entities]);

  const nodePositions = simulatedPositions;

  const getTooltipPosition = (id: string) => {
    const pos = nodePositions[id];
    if (!pos) return { x: 0, y: 0 };
    const x = offset.x + (pos.x / 100) * containerSize.width * zoom;
    const y = offset.y + (pos.y / 100) * containerSize.height * zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.network-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left - offset.x) / zoom) / containerSize.width * 100;
      const my = ((e.clientY - rect.top - offset.y) / zoom) / containerSize.height * 100;
      setMousePos({ x: mx, y: my });
    }

    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart, setOffset, zoom, offset, containerSize]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging || isConnecting) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isConnecting, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
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
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNodeId && draggedNodeId !== id) {
      setDragOverNodeId(id);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = () => setDragOverNodeId(null);

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

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative p-12 select-none overflow-hidden outline-none bg-dot-pattern ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      <div 
        className="w-full h-full relative origin-top-left transition-transform duration-200 ease-out"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {simulatedLinks.map((link, idx) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as NetworkNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as NetworkNode).id;
            
            if (!nodePositions[sourceId] || !nodePositions[targetId]) return null;
            const from = nodePositions[sourceId];
            const to = nodePositions[targetId];
            
            const isCollab = link.type === 'collaboration';
            const isCustom = link.type === 'custom';
            
            return (
              <g key={`line-${idx}`} className="group/link">
                <line 
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={isCustom
                    ? (theme === 'dark' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(147, 51, 234, 0.6)')
                    : isCollab 
                      ? (theme === 'dark' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(217, 119, 6, 0.5)')
                      : (theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(203, 213, 225, 0.5)')
                  }
                  strokeWidth={isCollab || isCustom ? "0.15" : "0.2"}
                  strokeDasharray={isCollab ? "1, 1" : isCustom ? "2, 2" : "none"}
                />
                {isCustom && (
                  <circle
                    cx={`${(from.x + to.x) / 2}%`}
                    cy={`${(from.y + to.y) / 2}%`}
                    r="0.5"
                    fill={theme === 'dark' ? '#ef4444' : '#dc2626'}
                    className="opacity-0 group-hover/link:opacity-100 cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCustomLink(sourceId, targetId);
                    }}
                  />
                )}
              </g>
            );
          })}
          {isConnecting && connectionSource && nodePositions[connectionSource] && (
            <line
              x1={`${nodePositions[connectionSource].x}%`}
              y1={`${nodePositions[connectionSource].y}%`}
              x2={`${mousePos.x}%`}
              y2={`${mousePos.y}%`}
              stroke={theme === 'dark' ? 'rgba(34, 211, 238, 0.5)' : 'rgba(8, 145, 178, 0.5)'}
              strokeWidth="0.2"
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
              key={`net-${id}`}
              className={`network-node absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${dragOverNodeId === id ? 'scale-125' : ''} ${draggedNodeId === id ? 'opacity-30 grayscale' : 'opacity-100'}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: isSelected ? 20 : 5 }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isConnecting) {
                  if (!connectionSource) {
                    setConnectionSource(id);
                  } else if (connectionSource !== id) {
                    onAddCustomLink(connectionSource, id);
                  } else {
                    setConnectionSource(null);
                  }
                } else {
                  onSelect(id); 
                }
              }}
              onMouseEnter={() => setHoveredNodeId(id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              draggable={!!onMoveEntity}
              onDragStart={(e) => handleDragStart(e, id)}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, id)}
            >
              <div className="relative">
                <div className={`absolute -inset-4 rounded-full blur-xl transition-opacity duration-500 ${isSelected || dragOverNodeId === id || isConnectionSource ? 'opacity-60' : 'opacity-20 group-hover:opacity-40'}`} style={{ backgroundColor: isConnectionSource ? '#a855f7' : entity.color }} />
                {(isSelected || dragOverNodeId === id || isConnectionSource) && (
                  <>
                    <div className={`absolute -inset-3 rounded-full border border-cyan-500/30 animate-spin-slow ${isConnectionSource ? 'border-purple-500/50' : ''}`} style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                    <div className={`absolute -inset-3 rounded-full border border-cyan-500/30 animate-spin-reverse ${isConnectionSource ? 'border-purple-500/50' : ''}`} style={{ borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: isConnectionSource ? '#a855f7' : entity.color }} />
                  </>
                )}
                <div 
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center relative z-10 ${
                    isSelected 
                    ? 'scale-125 border-cyan-400 bg-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.5)]' 
                    : isConnectionSource
                      ? 'scale-125 border-purple-400 bg-slate-900 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                      : dragOverNodeId === id
                        ? 'scale-125 border-green-400 bg-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.5)]'
                        : `${theme === 'dark' ? 'border-slate-700 bg-slate-900 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-slate-300 bg-slate-100 group-hover:border-cyan-500/50'}`
                  }`}
                  style={{ borderColor: isSelected || dragOverNodeId === id || isConnectionSource ? undefined : entity.color }}
                >
                   <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isSelected ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : isConnectionSource ? 'bg-purple-400' : 'bg-slate-500 group-hover:bg-cyan-400'}`} style={{ backgroundColor: isSelected ? '#fff' : isConnectionSource ? '#a855f7' : entity.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hoveredNodeId && entities[hoveredNodeId] && (
        <div
          className={`absolute pointer-events-none z-50 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-slate-900/90 border-slate-700 text-slate-200' 
              : 'bg-white/90 border-slate-200 text-slate-800'
          }`}
          style={{
            left: getTooltipPosition(hoveredNodeId).x,
            top: getTooltipPosition(hoveredNodeId).y - 20,
            transform: 'translate(-50%, -100%)',
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

      <div className={`absolute bottom-6 left-6 p-4 backdrop-blur border rounded-xl text-[10px] font-medium max-w-xs pointer-events-none transition-colors ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-500' : 'bg-white/80 border-slate-200 text-slate-600'}`}>
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold uppercase tracking-wider">
          <Zap size={12} />
          Tryb Sieci Rozproszonej
        </div>
        <p>Precyzyjna nawigacja: Użyj kółka myszy, aby przybliżyć punkt pod kursorem. Przeciągnij tło, aby przesuwać widok.</p>
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
      </div>

      <style>{`
        .bg-dot-pattern {
          background-image: radial-gradient(${theme === 'dark' ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px);
          background-size: 24px 24px;
        }
        @keyframes flow { to { stroke-dashoffset: -30; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        .animate-spin-slow { animation: spin-slow 6s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 4s linear infinite; }
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

export default NetworkView;
