
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ConsortiumEntity, Theme, Person, CustomLink } from '../types';
import { User, Zap, Building2, Link as LinkIcon, X as CloseIcon, Globe, ExternalLink, Pencil, Mail, Plus, UserPlus } from 'lucide-react';
import { Language } from '../App';
import * as d3 from 'd3';

interface AffiliationViewProps {
  entities: Record<string, ConsortiumEntity>;
  customLinks: CustomLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEditPerson?: (person: Person) => void;
  onEditEntity?: (id?: string) => void;
  onAddEntity?: (parentId: string) => void;
  onAddPerson?: () => void;
  onViewPeople?: (name: string) => void;
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
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'entity' | 'person';
  name: string;
  color: string;
  photo?: string;
  logo?: string;
  role?: string;
  personData?: Person;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
  type: 'hierarchy' | 'affiliation';
  label?: string;
}

const NodeAvatar: React.FC<{ node: any; theme: Theme; lang: Language }> = ({ node, theme, lang }) => {
  const [error, setError] = React.useState(false);

  if (node.type === 'person') {
    return (
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-500/30 shrink-0 shadow-inner">
        {node.photo && !error ? (
          <img 
            src={node.photo} 
            alt={node.name} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
            onError={() => setError(true)}
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <User size={32} className="text-slate-600" />
          </div>
        )}
      </div>
    );
  }

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

const AffiliationView: React.FC<AffiliationViewProps> = ({ 
  entities, customLinks, selectedId, onSelect, onEditPerson, onEditEntity, onAddEntity, onAddPerson, onViewPeople, onAddCustomLink, onRemoveCustomLink,
  isConnecting, setIsConnecting, connectionSource, setConnectionSource,
  zoom, setZoom, offset, setOffset, lang, theme 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [simulatedLinks, setSimulatedLinks] = useState<GraphLink[]>([]);
  const [liveDragPos, setLiveDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isShowingRelated, setIsShowingRelated] = useState(false);
  const [activeLinesId, setActiveLinesId] = useState<string | null>(null);
  const hasMovedDuringDrag = useRef(false);

  // Seeded random for stable initial positions
  const getSeededPos = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    // Use sin/cos with the hash to get stable values between 10 and 90
    const x = 10 + (Math.abs(Math.sin(hash)) * 80);
    const y = 10 + (Math.abs(Math.cos(hash)) * 80);
    return { x, y };
  };

  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>(() => {
    const saved = localStorage.getItem('igc-affiliation-node-overrides');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('igc-affiliation-node-overrides', JSON.stringify(nodeOverrides));
  }, [nodeOverrides]);

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

  useEffect(() => {
    setIsShowingRelated(false);
  }, [selectedId]);

  const { nodes, links } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];
    const peopleMap = new Map<string, GraphNode>();

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

        // Add People Nodes and Referral Links
        entity.management.forEach(person => {
          let personNode = peopleMap.get(person.name);
          if (!personNode) {
            const nodeId = `person-${person.name}`;
            const override = nodeOverrides[nodeId];
            const seeded = getSeededPos(nodeId);
            personNode = {
              id: nodeId,
              type: 'person',
              name: person.name,
              color: entity.color,
              photo: person.photo,
              role: lang === 'pl' ? person.role : person.roleEn || person.role,
              personData: person,
              x: override ? override.x : seeded.x,
              y: override ? override.y : seeded.y,
              fx: override ? override.x : undefined,
              fy: override ? override.y : undefined
            };
            peopleMap.set(person.name, personNode);
            graphNodes.push(personNode);
          }

          graphLinks.push({
            source: `person-${person.name}`,
            target: `entity-${entity.id}`,
            type: 'affiliation',
            label: person.role || (lang === 'pl' ? 'Zarząd' : 'Management')
          });

          // Add Referral Links
          if (person.referredBy) {
            graphLinks.push({
              source: `person-${person.referredBy}`,
              target: `person-${person.name}`,
              type: 'hierarchy', // Using hierarchy type for solid line
              label: lang === 'pl' ? 'Polecenie' : 'Referral'
            });
          }
        });
      });

    return { nodes: graphNodes, links: graphLinks };
  }, [entities, lang, nodeOverrides]);

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
  }, [nodes, links, nodeOverrides, customLinks]);

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
    return nodes.find(n => n.id === `entity-${targetId}` || n.id === `person-${targetId}` || n.id === targetId);
  }, [nodes, activeLinesId, selectedId]);

  const neighbors = useMemo(() => {
    const targetId = activeLinesId || selectedId;
    if (!targetId) return new Set<string>();
    const nodeId = nodes.find(n => n.id === `entity-${targetId}` || n.id === `person-${targetId}` || n.id === targetId)?.id;
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
        // Only allow entity-to-entity custom links for now to match MapView
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
    const rect = containerRef.current.getBoundingClientRect();
    const currentPos = nodePositions[id];
    
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
        className={`w-full h-full relative origin-top-left ${(isDraggingMap || draggedNodeId) ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
      >
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
          </defs>
          {simulatedLinks.map((link, idx) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
            
            if (!nodePositions[sourceId] || !nodePositions[targetId]) return null;
            const from = nodePositions[sourceId];
            const to = nodePositions[targetId];
            
            // Check if this is a custom link (entity to entity, but not hierarchy)
            const isCustom = sourceId.startsWith('entity-') && targetId.startsWith('entity-') && link.type === 'affiliation';
            const targetIdForLines = activeLinesId || selectedId;
            const isHighlighted = targetIdForLines && (
              sourceId === `entity-${targetIdForLines}` || 
              sourceId === `person-${targetIdForLines}` || 
              targetId === `entity-${targetIdForLines}` || 
              targetId === `person-${targetIdForLines}`
            );

            return (
              <g key={`line-${idx}`} className={`group/link transition-opacity duration-300 ${isHighlighted ? 'opacity-100' : 'opacity-0'}`}>
                <line 
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={isCustom 
                    ? (theme === 'dark' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(147, 51, 234, 0.5)')
                    : theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  }
                  strokeWidth={isCustom ? "0.6" : "0.4"}
                  strokeDasharray={isCustom ? "2, 2" : link.type === 'affiliation' ? "1, 2" : "none"}
                  markerEnd="url(#arrowhead)"
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
          const isSelected = selectedId === node.id || selectedId === node.id.replace('entity-', '') || selectedId === node.id.replace('person-', '');
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
                  // If we moved significantly, it was a drag, not a click
                  if (hasMovedDuringDrag.current) return;
                  
                  const id = node.id.replace('entity-', '').replace('person-', '');
                  setActiveLinesId(id === activeLinesId ? null : id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isConnecting) {
                  const id = node.id.replace('entity-', '').replace('person-', '');
                  onSelect(id);
                }
              }}
            >
              <div className={`relative flex flex-col items-center transition-all duration-300 ${isConnectionSource ? 'ring-4 ring-purple-500 rounded-full animate-pulse p-2' : ''}`}>
                {node.type === 'person' ? (
                  <div className="relative">
                    <div className={`absolute -inset-2 rounded-full blur-lg transition-opacity ${isSelected ? 'opacity-80' : 'opacity-40 group-hover:opacity-70'}`} style={{ backgroundColor: node.color }} />
                    {node.photo ? (
                      <div className={`w-14 h-14 rounded-full overflow-hidden border-2 shadow-xl group-hover:scale-110 transition-transform duration-300 relative ${isSelected ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-white/40'}`}>
                        <img src={node.photo} alt={node.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Zap size={14} className="text-white animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-xl group-hover:scale-110 transition-transform duration-300 relative ${isSelected ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-white/40'} ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <User size={20} className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                          <Zap size={14} className="text-white animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className={`absolute -inset-4 rounded-full blur-xl transition-opacity ${isSelected ? 'opacity-90' : 'opacity-50 group-hover:opacity-80'}`} style={{ backgroundColor: node.color }} />
                    <div 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-2xl group-hover:scale-110 transition-transform duration-300 relative overflow-hidden ${isSelected ? 'ring-4 ring-cyan-500/20' : ''} ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                      style={{ borderColor: isSelected ? '#22d3ee' : node.color }}
                    >
                      {node.logo ? (
                        <img src={node.logo} alt={node.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                      ) : (
                        <Building2 size={20} style={{ color: isSelected ? '#22d3ee' : node.color }} />
                      )}
                    </div>
                  </div>
                )}
                
                <div className={`mt-3 px-3 py-1 rounded-full text-[8px] font-bold whitespace-nowrap shadow-lg transition-all ${
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
                {selectedNode.type === 'person' ? (lang === 'pl' ? 'Profil Osoby' : 'Person Profile') : (lang === 'pl' ? 'Karta Podmiotu' : 'Entity Card')}
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
                  {selectedNode.role || (selectedNode.type === 'entity' ? (lang === 'pl' ? 'Podmiot' : 'Entity') : '')}
                </div>
                {selectedNode.personData?.isPartner && (
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1`}>
                    <Zap size={10} />
                    {lang === 'pl' ? 'Partner' : 'Partner'}
                  </div>
                )}
                {selectedNode.type === 'entity' && (
                  <div className={`text-[9px] font-bold text-slate-500`}>
                    KRS: 0000{Math.floor(Math.random() * 900000 + 100000)}
                  </div>
                )}
              </div>
              
              {selectedNode.personData?.referredBy && (
                <div className={`mb-3 flex items-center gap-2 text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <LinkIcon size={12} className="text-cyan-500" />
                  <span>{lang === 'pl' ? 'Polecenie:' : 'Referred by:'}</span>
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{selectedNode.personData.referredBy}</span>
                </div>
              )}

              {(lang === 'pl' ? selectedNode.personData?.aboutMe : selectedNode.personData?.aboutMeEn || selectedNode.personData?.aboutMe) ? (
                <div className={`relative`}>
                  <p className={`text-[12px] leading-relaxed italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    "{lang === 'pl' ? selectedNode.personData?.aboutMe : selectedNode.personData?.aboutMeEn || selectedNode.personData?.aboutMe}"
                  </p>
                </div>
              ) : selectedNode.type === 'entity' && (
                <p className={`text-[12px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'pl' ? entities[selectedNode.id.replace('entity-', '')]?.description : entities[selectedNode.id.replace('entity-', '')]?.descriptionEn || entities[selectedNode.id.replace('entity-', '')]?.description}
                </p>
              )}
              {selectedNode.personData?.website && (
                <a 
                  href={selectedNode.personData.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`mt-3 flex items-center gap-2 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                >
                  <Globe size={12} />
                  {selectedNode.personData.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink size={10} />
                </a>
              )}
              
              {selectedNode.type === 'person' && selectedNode.personData?.email && (
                <a 
                  href={`mailto:${selectedNode.personData.email}`}
                  className={`mt-2 flex items-center gap-2 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                >
                  <Mail size={12} />
                  {selectedNode.personData.email}
                </a>
              )}

              {selectedNode.type === 'entity' && entities[selectedNode.id.replace('entity-', '')]?.email && (
                <a 
                  href={`mailto:${entities[selectedNode.id.replace('entity-', '')].email}`}
                  className={`mt-3 flex items-center gap-2 text-[10px] font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
                >
                  <Mail size={12} />
                  {entities[selectedNode.id.replace('entity-', '')].email}
                </a>
              )}
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
                    if (selectedNode.type === 'person' && selectedNode.personData) {
                      onEditPerson?.(selectedNode.personData);
                    } else {
                      const id = selectedNode.id.replace('entity-', '');
                      onEditEntity?.(id);
                    }
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

      <div className={`absolute bottom-6 left-6 p-4 backdrop-blur border rounded-xl text-[10px] font-medium max-w-xs pointer-events-none transition-colors ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-500' : 'bg-white/80 border-slate-200 text-slate-600'}`}>
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold uppercase tracking-wider">
          <Zap size={12} />
          {lang === 'pl' ? 'Mapa Relacji' : 'Relationship Map'}
        </div>
        <p>{lang === 'pl' ? 'Widok swobodny relacji. Kliknij osobę lub podmiot, aby zobaczyć połączenia. Przeciągnij, aby przesuwać węzły.' : 'Free relationship view. Click a person or entity to see connections. Drag to move nodes.'}</p>
      </div>

      <style>{`
        .bg-dot-pattern {
          background-image: radial-gradient(${theme === 'dark' ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
};

export default AffiliationView;
