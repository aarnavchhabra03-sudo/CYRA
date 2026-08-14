'use client';

import React, { useState, useMemo } from 'react';
import { ResearchKnowledgeNode, ResearchKnowledgeEdge } from '@/lib/research/types';
import { Database, GitFork, ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface KnowledgeGraphVisualizationProps {
  nodes: ResearchKnowledgeNode[];
  edges: ResearchKnowledgeEdge[];
  selectedNodeIds?: Set<string>;
  selectedEdgeIds?: Set<string>;
  onToggleNode?: (nodeId: string) => void;
  onToggleEdge?: (edge: ResearchKnowledgeEdge) => void;
  readOnly?: boolean;
  className?: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  node: ResearchKnowledgeNode;
}

export const KnowledgeGraphVisualization: React.FC<KnowledgeGraphVisualizationProps> = ({
  nodes,
  edges,
  selectedNodeIds,
  selectedEdgeIds,
  onToggleNode,
  onToggleEdge,
  readOnly = false,
  className = '',
}) => {
  const [hoveredNode, setHoveredNode] = useState<ResearchKnowledgeNode | null>(null);

  // SVG Canvas dimensions
  const width = 800;
  const height = 450;
  const cx = width / 2;
  const cy = height / 2;

  // Compute node 2D layout coordinates in SVG space
  const nodePositions = useMemo<Map<string, NodePosition>>(() => {
    const map = new Map<string, NodePosition>();
    const n = nodes.length;

    if (n === 0) return map;

    if (n === 1) {
      map.set(nodes[0].id, { id: nodes[0].id, x: cx, y: cy, node: nodes[0] });
      return map;
    }

    if (n <= 6) {
      // Single circular layout
      const radiusX = Math.min(width, height) * 0.35;
      const radiusY = Math.min(width, height) * 0.32;
      nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        const x = cx + radiusX * Math.cos(angle);
        const y = cy + radiusY * Math.sin(angle);
        map.set(node.id, { id: node.id, x, y, node });
      });
    } else {
      // Multi-layer layout: 1 in center, rest in outer ring
      map.set(nodes[0].id, { id: nodes[0].id, x: cx, y: cy, node: nodes[0] });
      const outerNodes = nodes.slice(1);
      const outerCount = outerNodes.length;
      const radiusX = width * 0.38;
      const radiusY = height * 0.36;

      outerNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / outerCount - Math.PI / 2;
        const x = cx + radiusX * Math.cos(angle);
        const y = cy + radiusY * Math.sin(angle);
        map.set(node.id, { id: node.id, x, y, node });
      });
    }

    return map;
  }, [nodes, width, height, cx, cy]);

  return (
    <div className={`os-card p-4 bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 relative ${className}`}>
      
      {/* Visual Header Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--cyra-border)] pb-2.5 font-mono text-xs">
        <div className="flex items-center gap-2 text-[var(--cyra-cyan)] font-bold uppercase">
          <GitFork className="w-4 h-4" />
          <span>NEURAL KNOWLEDGE GRAPH</span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[var(--cyra-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--cyra-cyan)]" />
            MATCHED
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--cyra-violet)]" />
            NEW
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--cyra-amber)]" />
            AMBIGUOUS
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative overflow-hidden rounded-xl bg-[var(--cyra-card-soft)] border border-[var(--cyra-border)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[420px] select-none"
        >
          <defs>
            {/* Arrow Marker */}
            <marker
              id="cyan-arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" />
            </marker>

            <marker
              id="indigo-arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* 1. Render Relationship Edges */}
          {edges.map((edge) => {
            const sourcePos = nodePositions.get(edge.sourceNodeId);
            const targetPos = nodePositions.get(edge.targetNodeId);

            if (!sourcePos || !targetPos) return null;

            const isSelected = selectedEdgeIds ? selectedEdgeIds.has(edge.id) : edge.isApproved;
            const midX = (sourcePos.x + targetPos.x) / 2;
            const midY = (sourcePos.y + targetPos.y) / 2;

            return (
              <g key={edge.id} className="transition-opacity duration-150">
                {/* Edge Line */}
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={isSelected ? '#6366f1' : '#202938'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? '4 2' : undefined}
                  markerEnd={isSelected ? 'url(#indigo-arrow)' : undefined}
                  className="transition-all"
                />

                {/* Relationship Type Pill */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-40"
                    y="-10"
                    width="80"
                    height="20"
                    rx="4"
                    fill="#0D111A"
                    stroke={isSelected ? 'rgba(99,102,241,0.4)' : '#202938'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isSelected ? '#818cf8' : '#64748b'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {edge.relationshipType.replace('_', ' ').toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 2. Render Concept Nodes */}
          {Array.from(nodePositions.values()).map(({ id, x, y, node }) => {
            const isSelected = selectedNodeIds ? selectedNodeIds.has(id) : node.isApproved;
            const isMatched = node.nodeType === 'matched_concept';
            const isNew = node.nodeType === 'new_concept';

            const strokeColor = isMatched ? '#22d3ee' : isNew ? '#6366f1' : '#f59e0b';
            const fillColor = isMatched ? 'rgba(34,211,238,0.1)' : isNew ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)';

            return (
              <g
                key={id}
                transform={`translate(${x}, ${y})`}
                onClick={() => !readOnly && onToggleNode && onToggleNode(id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`cursor-pointer transition-transform duration-150 ${
                  isSelected ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {/* Node Outer Glow Circle */}
                <circle
                  r="24"
                  fill={fillColor}
                  stroke={isSelected ? strokeColor : '#202938'}
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-all hover:scale-110"
                />

                {/* Node Core Dot */}
                <circle
                  r="6"
                  fill={strokeColor}
                  className={isSelected ? 'animate-pulse' : ''}
                />

                {/* Label Badge */}
                <text
                  y="40"
                  textAnchor="middle"
                  fill={isSelected ? '#f8fafc' : '#94a3b8'}
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Node Detail Popover */}
      {hoveredNode && (
        <div className="p-3.5 rounded-xl bg-[var(--cyra-card)] border border-[var(--cyra-border)] text-xs font-mono space-y-1 animate-os-fade shadow-md">
          <div className="flex items-center justify-between text-[var(--cyra-cyan)] font-bold">
            <span>CONCEPT: {hoveredNode.label}</span>
            <span>CONFIDENCE: {hoveredNode.confidence}%</span>
          </div>
          <p className="text-[var(--cyra-text-secondary)] italic font-sans text-xs">{hoveredNode.evidence}</p>
          {hoveredNode.masteryScore !== null && (
            <p className="text-[10px] text-[var(--cyra-green)] font-bold">
              Learner Mastery: {hoveredNode.masteryScore}% (Effective: {hoveredNode.effectiveMasteryScore}%)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphVisualization;
