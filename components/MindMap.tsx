"use client";

import React, { useEffect, useState, useRef } from "react";
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
  const [isVisible, setIsVisible] = useState(false);

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
            'background-color': '#3b82f6',
            'label': 'data(keyword)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': 'white',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-outline-width': 2,
            'text-outline-color': '#1e40af',
            'border-width': 2,
            'border-color': '#1e40af',
            'width': 'data(size)',
            'height': 'data(size)',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node[keyword]',
          style: {
            'background-color': '#3b82f6',
            'label': 'data(keyword)',
            'font-size': '14px',
            'font-weight': 'bold',
            'width': 30,
            'height': 30
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
            'border-width': 3,
            'border-color': '#3b82f6',
            'width': 'data(size)',
            'height': 'data(size)',
            'label': 'data(keyword)',
            'text-valign': 'bottom',
            'text-margin-y': -5,
            'font-size': '10px',
            'font-weight': 'bold',
            'color': '#1e40af',
            'text-outline-width': 1,
            'text-outline-color': 'white'
          }
        },
        {
          selector: 'node.text-only-node',
          style: {
            'background-color': '#6b7280',
            'width': 20,
            'height': 20,
            'font-size': '10px'
          }
        },
        {
          selector: 'node.text-only-extended-node',
          style: {
            'background-color': '#f59e0b',
            'width': 25,
            'height': 25,
            'font-size': '11px'
          }
        },
        {
          selector: 'node.extended-node',
          style: {
            'border-color': '#f59e0b',
            'border-width': 4
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#6b7280',
            'target-arrow-color': '#6b7280',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'color': '#374151',
            'text-outline-width': 1,
            'text-outline-color': 'white'
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        spacingFactor: 1.5,
        nodeSep: 50,
        edgeSep: 20,
        rankSep: 100
      }
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
      evt.target.style('background-color', '#ef4444');
    });

    cyRef.current.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      
      if (data.image) {
        node.style('background-color', '#3b82f6');
      } else if (data.isExtendedInfo === 1) {
        node.style('background-color', '#f59e0b');
      } else {
        node.style('background-color', '#6b7280');
      }
    });

    // Fit the graph to the container
    cyRef.current.fit();

    setIsVisible(true);

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [mindMapData]);

  if (!mindMapData) {
    return (
      <div className="size-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">🧠</div>
          <div className="text-xl">思维导图准备就绪</div>
          <div className="text-sm mt-2">等待思维导图数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-purple-50 to-white p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-purple-900">{mindMapData.title}</h2>
        <div className="text-gray-600 text-sm mt-2">
          点击节点查看详细信息 • 拖拽节点调整布局
        </div>
      </div>
      
      {/* Mind Map Container */}
      <div className="h-[calc(100%-80px)] bg-white rounded-lg shadow-lg border overflow-hidden">
        <div 
          ref={containerRef} 
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>主要概念</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span>基础信息</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>扩展信息</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-300"></div>
          <span>带图片节点</span>
        </div>
      </div>
    </div>
  );
};

export default MindMap;
