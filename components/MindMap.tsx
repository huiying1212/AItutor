"use client";

import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import { transformDataToElements, showNotification } from "../lib/utils/graphUtils";

// Register the dagre layout
cytoscape.use(dagre);

interface MindMapProps {
  mindMapData: {
    title: string;
    nodes: Array<{
      id: string;
      keyword: string;
      description?: string;
      otherinfo?: string;
      image?: string;
      isExtendedInfo?: number;
    }>;
    connections: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  } | null;
}

const MindMap: React.FC<MindMapProps> = ({ mindMapData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!mindMapData || !containerRef.current) return;

    // Clean up existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Transform the data using the graphUtils function
    const graphData = {
      keyinfo: mindMapData.nodes,
      connections: mindMapData.connections
    };

    const elements = transformDataToElements(graphData);

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#f8fafc',
            'label': 'data(keyword)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#1e293b',
            'font-size': '14px',
            'font-weight': 'bold',
            'font-family': 'system-ui, -apple-system, sans-serif',
            'border-width': 2,
            'border-color': '#cbd5e1',
            'width': 'label',
            'height': 'label',
            'padding': '16px',
            'shape': 'round-rectangle',
            'text-wrap': 'wrap',
            'text-max-width': '120px'
          }
        },
        {
          selector: 'node[keyword]',
          style: {
            'background-color': '#f8fafc',
            'label': 'data(keyword)',
            'font-size': '14px',
            'font-weight': 'bold'
          }
        },
        {
          selector: 'node[image]',
          style: {
            'background-image': 'data(image)',
            'background-fit': 'cover',
            'background-clip': 'node',
            'background-width': '100%',
            'background-height': '100%',
            'border-width': 2,
            'border-color': '#3b82f6',
            'width': 80,
            'height': 80,
            'label': 'data(keyword)',
            'text-valign': 'bottom',
            'text-margin-y': 10,
            'font-size': '13px',
            'font-weight': 'bold',
            'color': '#1e293b',
            'background-color': '#ffffff'
          }
        },
        {
          selector: 'node.text-only-node',
          style: {
            'background-color': '#f1f5f9',
            'border-color': '#cbd5e1'
          }
        },
        {
          selector: 'node.text-only-extended-node',
          style: {
            'background-color': '#fef3c7',
            'border-color': '#fbbf24'
          }
        },
        {
          selector: 'node.extended-node',
          style: {
            'background-color': '#fef3c7',
            'border-color': '#fbbf24',
            'border-width': 2
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#cbd5e1',
            'target-arrow-color': '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '11px',
            'color': '#64748b',
            'font-family': 'system-ui, -apple-system, sans-serif',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '3px'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#dbeafe',
            'border-color': '#3b82f6',
            'border-width': 3
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        spacingFactor: 2,
        nodeSep: 80,
        edgeSep: 30,
        rankSep: 120
      } as any
    });

    // Add event listeners for node interactions
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      
      if (data.details) {
        showNotification(data.details, 'info');
      } else if (data.keyword) {
        const details = `★ ${data.keyword.toUpperCase()}` + 
                       (data.description ? `\n\n${data.description}` : '') + 
                       (data.otherinfo ? `\n\n${data.otherinfo}` : '');
        showNotification(details, 'info');
      }
    });

    // Add hover effects
    cyRef.current.on('mouseover', 'node', (evt) => {
      evt.target.style({
        'border-color': '#3b82f6',
        'border-width': 3
      });
    });

    cyRef.current.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      
      if (data.isExtendedInfo === 1) {
        node.style({
          'border-color': '#fbbf24',
          'border-width': 2
        });
      } else if (data.image) {
        node.style({
          'border-color': '#3b82f6',
          'border-width': 2
        });
      } else {
        node.style({
          'border-color': '#cbd5e1',
          'border-width': 2
        });
      }
    });

    // Fit the graph to the container
    cyRef.current.fit();

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [mindMapData]);

  if (!mindMapData) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="text-7xl mb-6 animate-pulse">🧠</div>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">思维导图准备就绪</div>
          <div className="text-sm mt-3 text-gray-600 bg-white/80 backdrop-blur-sm rounded-lg px-6 py-3 shadow-md">等待思维导图数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600 shadow-lg">
        <h2 className="text-lg font-bold text-white">{mindMapData.title}</h2>
        <p className="text-xs text-slate-300 mt-1">
          💡 点击节点查看详细信息
        </p>
      </div>
      
      {/* Mind Map Container */}
      <div className="flex-1 p-6">
        <div 
          ref={containerRef} 
          className="w-full h-full rounded-lg shadow-inner bg-white/50 backdrop-blur-sm"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
};

export default MindMap;
