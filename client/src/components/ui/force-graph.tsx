import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useMeasure } from 'react-use';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface GraphNode {
  id: string;
  type: 'note' | 'link';
  title: string;
  tags?: { id: number; name: string }[];
  url?: string;
  createdAt: Date;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_COLORS = {
  note: '#805AD5',  // secondary (purple)
  link: '#4299E1',  // accent (blue)
};

const TAG_COLORS = {
  "Research": "#805AD5",
  "Projects": "#48BB78", 
  "Ideas": "#F56565",
  "Reading List": "#ECC94B"
};

interface ForceGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  height?: number;
}

export default function ForceGraph({ data, onNodeClick, height = 500 }: ForceGraphProps) {
  const [graphRef, { width }] = useMeasure<HTMLDivElement>();
  const forceGraphRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(node);
    }
    
    // Zoom to the clicked node
    if (forceGraphRef.current) {
      forceGraphRef.current.centerAt(node.x, node.y, 1000);
      forceGraphRef.current.zoom(4, 1000);
    }
  };
  
  // Zoom controls
  const zoomIn = () => {
    if (forceGraphRef.current) {
      const currentZoom = forceGraphRef.current.zoom();
      forceGraphRef.current.zoom(currentZoom * 1.5, 300);
    }
  };
  
  const zoomOut = () => {
    if (forceGraphRef.current) {
      const currentZoom = forceGraphRef.current.zoom();
      forceGraphRef.current.zoom(currentZoom / 1.5, 300);
    }
  };
  
  const zoomToFit = () => {
    if (forceGraphRef.current) {
      forceGraphRef.current.zoomToFit(400, 60);
    }
  };
  
  // Set initial zoom level when data changes
  useEffect(() => {
    if (forceGraphRef.current && data.nodes.length > 0) {
      // Use setTimeout to ensure the graph has time to initialize
      setTimeout(() => {
        forceGraphRef.current.zoomToFit(400);
      }, 500);
    }
  }, [data]);
  
  return (
    <div>
      <div className="flex justify-end mb-2 space-x-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={zoomIn} 
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={zoomOut} 
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={zoomToFit} 
          title="Fit Graph"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
      
      <div ref={graphRef} className="bg-background rounded-md overflow-hidden">
        {width > 0 && (
          <ForceGraph2D
            ref={forceGraphRef}
            graphData={data}
            width={width}
            height={height}
            nodeLabel={(node: any) => node.title}
            nodeColor={(node: any) => {
              // If the node has tags, use the first tag's color, otherwise use the node type color
              if (node.tags && node.tags.length > 0) {
                const firstTagName = node.tags[0].name;
                return TAG_COLORS[firstTagName] || NODE_COLORS[node.type];
              }
              return NODE_COLORS[node.type];
            }}
            nodeRelSize={6}
            linkWidth={(link: any) => Math.sqrt(link.strength || 1)}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={(link: any) => Math.sqrt((link.strength || 1) * 0.5)}
            onNodeClick={handleNodeClick}
            cooldownTime={2000}
          />
        )}
      </div>
      
      {selectedNode && (
        <div className="mt-4 p-4 border rounded-md bg-white">
          <h3 className="font-semibold">
            {selectedNode.type === 'link' && '🔗 '}
            {selectedNode.type === 'note' && '📝 '}
            {selectedNode.title}
          </h3>
          {selectedNode.url && (
            <a 
              href={selectedNode.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline block mt-1"
            >
              {selectedNode.url}
            </a>
          )}
          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <div className="mt-2 flex gap-2">
              {selectedNode.tags.map(tag => (
                <span 
                  key={tag.id} 
                  className="px-2 py-1 text-xs rounded-full bg-gray-100"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
