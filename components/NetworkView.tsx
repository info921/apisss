
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ConsortiumEntity, Theme, CustomLink } from '../types';
import { Zap, Building2, Link as LinkIcon, X as CloseIcon, Pencil, Mail } from 'lucide-react';
import { Language } from '../App';
import * as d3 from 'd3';

interface NetworkViewProps {
  entities: Record<string, ConsortiumEntity>;
  customLinks: CustomLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEditEntity?: (id?: string) => void;
  onAddEntity?: (parentId: string) => void;
  onAddCustomLink: (source: string, target: string) => void;
  onRemoveCustomLink: (source: string, target: string) => void;
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

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'entity';
  name: string;
  color: string;
  logo?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
  type: 'hierarchy' | 'affiliation';
  label?: string;
}

const NodeAvatar: React.FC<{ node: any; theme: Theme; lang: Language }> = ({ node, theme, lang }) => {
  const [error, setError] = React.useState(false);

  return (
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center border-2 shrink-0 shadow-inner overflow-hidden" style={{ borderColor: node.color, backgroundColor: `${node.color}10` }}>
      {node.logo && !error ? (
        <img 
          src={node.logo} 
          alt={node.name} 
          className="w-full h-full object-contain p-2" 
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      ) : (
        <Building2 size={40} style={{ color: node.color }} />
      )}
    </div>
  );
};

const NetworkView: React.FC<NetworkViewProps> = ({ 
  entities, customLinks, selectedId, onSelect, onEditEntity, onAddEntity, onAddCustomLink, onRemoveCustomLink,
  isConnecting, setIsConnecting, connectionSource, setConnectionSource,
  zoom, setZoom, offset, setOffset, lang, theme, backgroundImage 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 5504, height: 3072 });
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [simulatedLinks, setSimulatedLinks] = useState<GraphLink[]>([]);
  const [liveDragPos, setLiveDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isShowingRelated, setIsShowingRelated] = useState(false);
  const [activeLinesId, setActiveLinesId] = useState<string | null>(null);
  const hasMovedDuringDrag = useRef(false);

  // Seeded random for stable initial positions
  const getSeededPos = (id: string) => {
    const entityId = id.replace('entity-', '');
    
    // Fixed positions based on the sketch, adjusted for people rows below
    const fixedPositions: Record<string, { x: number, y: number }> = {
      'blockchain': { x: 25, y: 7 },
      'marketing': { x: 50, y: 7 },
      'bamboo': { x: 75, y: 7 },
      'global': { x: 50, y: 24 },
      'nederland': { x: 15, y: 46 },
      'europe': { x: 38, y: 46 },
      'retail': { x: 62, y: 46 },
      'usa': { x: 85, y: 46 },
      'poland': { x: 50, y: 66 },
      'gov_poland': { x: 50, y: 84 }
    };

    let baseX = 50;
    let baseY = 50;

    if (entityId && fixedPositions[entityId]) {
      baseX = fixedPositions[entityId].x;
      baseY = fixedPositions[entityId].y;
    }

    return { x: baseX, y: baseY };
  };

  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('igc-network-node-overrides');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error loading network node overrides:", e);
      return {};
    }
  });

  const handleResetLayout = () => {
    setNodeOverrides({});
    try {
      localStorage.removeItem('igc-network-node-overrides');
    } catch (e) {}
  };

  useEffect(() => {
    try {
      localStorage.setItem('igc-network-node-overrides', JSON.stringify(nodeOverrides));
    } catch (e) {
      console.error("Error saving network node overrides:", e);
    }
  }, [nodeOverrides]);

  useEffect(() => {
    // Fixed size map, no resize listener needed
  }, []);

  useEffect(() => {
    setIsShowingRelated(false);
  }, [selectedId]);

  const { nodes, links } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];

      // Add Entity Nodes
      (Object.values(entities) as ConsortiumEntity[]).forEach(entity => {
        const nodeId = `entity-${entity.id}`;
        const override = nodeOverrides[nodeId];
        const seeded = getSeededPos(nodeId);
        graphNodes.push({
          id: nodeId,
          type: 'entity',
          name: lang === 'pl' ? entity.name : entity.nameEn || entity.name,
          color: entity.color,
          logo: entity.logo,
          x: override ? override.x : seeded.x,
          y: override ? override.y : seeded.y,
          fx: override ? override.x : undefined,
          fy: override ? override.y : undefined
        });

        // Add Hierarchy Links
        if (entity.parent && entities[entity.parent]) {
          graphLinks.push({
            source: `entity-${entity.parent}`,
            target: `entity-${entity.id}`,
            type: 'hierarchy',
            label: lang === 'pl' ? 'Struktura' : 'Structure'
          });
        }
      });
      
      // Add Custom Links
      customLinks.forEach(link => {
        // Only include if both source and target are entities
        // Assuming custom links store raw IDs (without 'entity-' prefix)
        if (entities[link.source] && entities[link.target]) {
             graphLinks.push({
                source: `entity-${link.source}`,
                target: `entity-${link.target}`,
                type: 'affiliation', // Using affiliation type for dashed line style
                label: ''
             });
        }
      });

    return { nodes: graphNodes, links: graphLinks };
  }, [entities, lang, nodeOverrides, customLinks]);

  useEffect(() => {
    if (nodes.length === 0) return;

    // If we have overrides for ALL nodes, we don't need simulation
    const hasAllOverrides = nodes.every(n => nodeOverrides[n.id]);
    
    if (hasAllOverrides) {
      const newPositions: Record<string, { x: number; y: number }> = {};
      nodes.forEach(node => {
        newPositions[node.id] = nodeOverrides[node.id];
      });
      setSimulatedPositions(newPositions);
      setSimulatedLinks(links);
      return;
    }

    const newPositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      const override = nodeOverrides[node.id];
      newPositions[node.id] = { 
        x: override ? override.x : node.x || 50, 
        y: override ? override.y : node.y || 50 
      };
    });

    setSimulatedPositions(newPositions);
    setSimulatedLinks(links);
  }, [nodes, links, nodeOverrides]);

  const nodePositions = useMemo(() => {
    if (!liveDragPos) return simulatedPositions;
    return {
      ...simulatedPositions,
      [liveDragPos.id]: { x: liveDragPos.x, y: liveDragPos.y }
    };
  }, [simulatedPositions, liveDragPos]);

  const selectedNode = useMemo(() => {
    const targetId = activeLinesId || selectedId;
    if (!targetId) return null;
    return nodes.find(n => n.id === `entity-${targetId}` || n.id === targetId);
  }, [nodes, activeLinesId, selectedId]);

  const neighbors = useMemo(() => {
    const targetId = activeLinesId || selectedId;
    if (!targetId) return new Set<string>();
    const nodeId = nodes.find(n => n.id === `entity-${targetId}` || n.id === targetId)?.id;
    if (!nodeId) return new Set<string>();
    
    const set = new Set<string>([nodeId]);
    simulatedLinks.forEach(link => {
      const s = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
      const t = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
      if (s === nodeId) set.add(t);
      if (t === nodeId) set.add(s);
    });
    return set;
  }, [simulatedLinks, selectedId, activeLinesId, nodes]);

  const handleMouseDownMap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.graph-node')) return;
    setIsDraggingMap(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    // Clear selection on background click
    if (!isConnecting) {
      onSelect('');
      setActiveLinesId(null);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (isConnecting) {
      if (!connectionSource) {
        setConnectionSource(id);
      } else if (connectionSource !== id) {
        if (connectionSource.startsWith('entity-') && id.startsWith('entity-')) {
          onAddCustomLink(connectionSource.replace('entity-', ''), id.replace('entity-', ''));
        }
      } else {
        setConnectionSource(null);
      }
      return;
    }

    hasMovedDuringDrag.current = false;
    setDraggedNodeId(id);
    if (!containerRef.current) return;
    const currentPos = nodePositions[id];
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseMapX = ((e.clientX - rect.left - offset.x) / zoom) / containerSize.width * 100;
    const mouseMapY = ((e.clientY - rect.top - offset.y) / zoom) / containerSize.height * 100;
    
    setDragStart({ x: mouseMapX - currentPos.x, y: mouseMapY - currentPos.y });
    setLiveDragPos({ id, x: currentPos.x, y: currentPos.y });
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
      hasMovedDuringDrag.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseMapX = ((e.clientX - rect.left - offset.x) / zoom) / containerSize.width * 100;
      const mouseMapY = ((e.clientY - rect.top - offset.y) / zoom) / containerSize.height * 100;
      
      const newX = mouseMapX - dragStart.x;
      const newY = mouseMapY - dragStart.y;

      setLiveDragPos({ id: draggedNodeId, x: newX, y: newY });
    }
  }, [isDraggingMap, draggedNodeId, dragStart, offset, zoom, setOffset, containerSize]);

  const handleMouseUp = useCallback(() => {
    if (draggedNodeId && liveDragPos) {
      setNodeOverrides(prev => ({
        ...prev,
        [draggedNodeId]: { x: liveDragPos.x, y: liveDragPos.y }
      }));
    }
    setIsDraggingMap(false);
    setDraggedNodeId(null);
    setLiveDragPos(null);
  }, [draggedNodeId, liveDragPos]);

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

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * factor, 0.1), 5);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const targetX = (mouseX - offset.x) / zoom;
    const targetY = (mouseY - offset.y) / zoom;
    setZoom(newZoom);
    setOffset({ x: mouseX - targetX * newZoom, y: mouseY - targetY * newZoom });
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative select-none overflow-hidden outline-none bg-dot-pattern ${isDraggingMap ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDownMap}
      onWheel={handleWheel}
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
              alt="Network Background" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="25"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} />
            </marker>
            <marker
              id="arrowhead-green"
              markerWidth="10"
              markerHeight="7"
              refX="25"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
          </defs>
          {simulatedLinks.map((link, idx) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
            
            if (!nodePositions[sourceId] || !nodePositions[targetId]) return null;
            const from = nodePositions[sourceId];
            const to = nodePositions[targetId];
            
            const isCustom = sourceId.startsWith('entity-') && targetId.startsWith('entity-') && link.type === 'affiliation';
            const targetIdForLines = activeLinesId || selectedId;
            const isHighlighted = targetIdForLines && (
              sourceId === `entity-${targetIdForLines}` || 
              targetId === `entity-${targetIdForLines}`
            );

            return (
              <g key={`line-${idx}`} className={`group/link transition-opacity duration-300 ${isHighlighted ? 'opacity-100' : 'opacity-30'}`}>
                <line 
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={isHighlighted ? '#22c55e' : (isCustom 
                    ? (theme === 'dark' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(147, 51, 234, 0.5)')
                    : theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  )}
                  strokeWidth={isHighlighted ? "0.6" : (isCustom ? "0.6" : "0.4")}
                  strokeDasharray={isCustom ? "2, 2" : link.type === 'affiliation' ? "1, 2" : "none"}
                  markerEnd={isHighlighted ? "url(#arrowhead-green)" : "url(#arrowhead)"}
                />
                {link.label && (
                  <g transform={`translate(${(from.x + to.x) / 2 * containerSize.width / 100}, ${(from.y + to.y) / 2 * containerSize.height / 100})`}>
                    <rect
                      x="-15"
                      y="-4"
                      width="30"
                      height="8"
                      rx="2"
                      fill={theme === 'dark' ? '#0f172a' : '#ffffff'}
                      stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'}
                      strokeWidth="0.2"
                      className="opacity-90"
                    />
                    <text
                      dy="1.5"
                      textAnchor="middle"
                      className={`font-bold uppercase tracking-tighter fill-current pointer-events-none select-none ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}
                      style={{ fontSize: '3px' }}
                    >
                      {link.label}
                    </text>
                  </g>
                )}
                {isCustom && (
                  <circle
                    cx={`${(from.x + to.x) / 2}%`}
                    cy={`${(from.y + to.y) / 2}%`}
                    r="0.8"
                    fill={theme === 'dark' ? '#ef4444' : '#dc2626'}
                    className="opacity-0 group-hover/link:opacity-100 cursor-pointer pointer-events-auto transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCustomLink(sourceId.replace('entity-', ''), targetId.replace('entity-', ''));
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
              strokeWidth="0.4"
              strokeDasharray="2, 2"
            />
          )}
        </svg>

        {nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;
          const isConnectionSource = connectionSource === node.id;
          const isSelected = selectedId === node.id || selectedId === node.id.replace('entity-', '');
          const isHighlighted = (activeLinesId || selectedId) ? neighbors.has(node.id) : true;
          const isRelated = isShowingRelated && neighbors.has(node.id) && !isSelected;
          
          return (
            <div
              key={node.id}
              className={`graph-node absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 ${draggedNodeId === node.id ? 'z-50' : 'z-10'} ${isHighlighted ? 'opacity-100' : 'opacity-60'} ${isRelated ? 'ring-4 ring-cyan-500 ring-offset-4 ring-offset-transparent animate-pulse' : ''}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (!isConnecting) {
                  if (hasMovedDuringDrag.current) return;
                  const id = node.id.replace('entity-', '');
                  setActiveLinesId(id === activeLinesId ? null : id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isConnecting) {
                  const id = node.id.replace('entity-', '');
                  onSelect(id);
                }
              }}
            >
              <div className={`relative flex flex-col items-center transition-all duration-300 ${isConnectionSource ? 'ring-4 ring-purple-500 rounded-full animate-pulse p-2' : ''}`}>
                  <div className="relative">
                    <div className={`absolute -inset-4 rounded-full blur-xl transition-opacity ${isSelected ? 'opacity-90' : 'opacity-50 group-hover:opacity-80'}`} style={{ backgroundColor: node.color }} />
                    <div 
                      className={`w-48 h-48 rounded-3xl flex items-center justify-center border-4 shadow-2xl group-hover:scale-110 transition-transform duration-300 relative overflow-hidden ${isSelected ? 'ring-4 ring-cyan-500/20' : ''} ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
                      style={{ borderColor: isSelected ? '#22d3ee' : node.color }}
                    >
                      {node.logo ? (
                        <img src={node.logo} alt={node.name} className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                      ) : (
                        <Building2 size={80} style={{ color: isSelected ? '#22d3ee' : node.color }} />
                      )}
                    </div>
                  </div>
                
                <div className={`mt-8 px-8 py-3 rounded-full text-[32px] font-bold whitespace-nowrap shadow-lg transition-all ${
                  isSelected 
                    ? 'bg-cyan-500 text-white border-cyan-400 opacity-100 translate-y-0' 
                    : theme === 'dark' 
                      ? 'bg-slate-900/90 text-white border border-slate-700' 
                      : 'bg-white/90 text-slate-900 border border-slate-200'
                } ${hoveredNodeId === node.id || isSelected ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-0'}`}>
                  {node.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <div 
          className={`absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-md p-0 backdrop-blur-xl border rounded-xl shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-top-4 overflow-hidden cursor-auto ${theme === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={`px-4 py-2 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse`} style={{ backgroundColor: selectedNode.color }} />
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {lang === 'pl' ? 'Karta Podmiotu' : 'Entity Card'}
              </span>
            </div>
            <button 
              onClick={() => onSelect('')}
              className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-500 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-900'}`}
            >
              <CloseIcon size={14} />
            </button>
          </div>
          <div className="p-5 flex items-start gap-5">
            <NodeAvatar node={selectedNode} theme={theme} lang={lang} />
            <div className="flex-1 min-w-0">
              <h4 className={`text-xl font-bold leading-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {selectedNode.name}
              </h4>
              <div className={`flex items-center gap-2 mb-3 flex-wrap`}>
                <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                  {lang === 'pl' ? 'Podmiot' : 'Entity'}
                </div>
                  <div className={`text-[9px] font-bold text-slate-500`}>
                    KRS: 0000{Math.floor(Math.random() * 900000 + 100000)}
                  </div>
              </div>
              
              <p className={`text-[12px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {(() => {
                    const entity = entities[selectedNode.id.replace('entity-', '')];
                    return entity ? (lang === 'pl' ? entity.description : entity.descriptionEn || entity.description) : '';
                  })()}
              </p>

              {(() => {
                const entity = entities[selectedNode.id.replace('entity-', '')];
                return entity?.email ? (
                  <a 
                    href={`mailto:${entity.email}`}
                    className={`mt-3 flex items-center gap-2 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                  >
                    <Mail size={12} />
                    {entity.email}
                  </a>
                ) : null;
              })()}
            </div>
          </div>
          <div className={`px-5 py-3 border-t flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
             <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase text-slate-500 font-bold tracking-widest">Powiązania</span>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{neighbors.size - 1}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase text-slate-500 font-bold tracking-widest">Status</span>
                  <span className="text-xs font-bold text-emerald-500">Aktywny</span>
                </div>
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={() => setIsShowingRelated(!isShowingRelated)}
                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                   isShowingRelated 
                     ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                     : theme === 'dark' 
                       ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' 
                       : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                 }`}
               >
                 {lang === 'pl' ? 'Zobacz powiązane' : 'See related'}
               </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = selectedNode.id.replace('entity-', '');
                    onEditEntity?.(id);
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95 ${theme === 'dark' ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-cyan-500/20' : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/20'}`}
                >
                  <Pencil size={12} />
                  {lang === 'pl' ? 'Edycja' : 'Edit'}
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={handleResetLayout}
          className={`px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
            theme === 'dark' 
              ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50' 
              : 'bg-white/80 border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-500/50'
          }`}
        >
          <Zap size={14} />
          {lang === 'pl' ? 'Resetuj Układ' : 'Reset Layout'}
        </button>
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
      </div>
    </div>
  );
};

export default NetworkView;
