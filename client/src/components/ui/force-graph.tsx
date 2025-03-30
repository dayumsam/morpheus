import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useMeasure } from "react-use";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface GraphNode {
  id: string;
  type: "note" | "link" | "tag";
  title: string;
  tags?: { id: number; name: string }[];
  url?: string;
  createdAt: Date;
  x?: number;
  y?: number;
  color?: string;
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
  note: "#805AD5", // Purple for notes (pages)
  link: "#4299E1", // Blue for links
  tag: "#48BB78", // Green for all tags
};

interface ForceGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  height?: number;
}

export default function ForceGraph({
  data,
  onNodeClick,
  height = 500,
}: ForceGraphProps) {
  const [graphRef, { width }] = useMeasure<HTMLDivElement>();
  const forceGraphRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Pre-process the graph data to assign colors
  useEffect(() => {
    if (data && data.nodes) {
      data.nodes.forEach((node: any) => {
        // All tags get the same color
        if (node.type === "tag") {
          node.color = NODE_COLORS.tag;
        }
        // Notes and links get their respective colors
        else {
          node.color =
            NODE_COLORS[node.type as keyof typeof NODE_COLORS] ||
            NODE_COLORS.note;
        }
      });
    }
  }, [data]);

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
        <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom In">
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
            // @ts-ignore - ForceGraph2D has many props that aren't captured in types
            ref={forceGraphRef}
            graphData={data}
            width={width}
            height={height}
            nodeLabel={(node: any) => {
              if (node.type === "tag") {
                return `#${node.label}`;
              }
              return node.label || node.title;
            }}
            nodeColor={(node: any) => node.color}
            nodeRelSize={5}
            linkWidth={1.5}
            linkColor="#666666"
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={3}
            linkDirectionalParticleSpeed={0.01}
            linkDirectionalParticleColor="#666666"
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            cooldownTime={1500}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={20}
            cooldownTicks={100}
            linkDistance={50}
            d3Force={(d3: any) => {
              d3.force("charge")?.strength(-30);
              d3.force("link")?.strength(0.8);
              d3.force("center")?.strength(0.2);
            }}
            enableNodeDrag={true}
            enablePanInteraction={true}
            enableZoomInteraction={true}
            centerAtZoom={1.5}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.label || node.title || "";
              const fontSize = 14 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bgDimensions = [textWidth, fontSize].map(
                (n) => n + fontSize * 0.2,
              );

              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
              ctx.fillStyle = node.color;
              ctx.fill();

              if (globalScale >= 0.6) {
                // Only show labels when zoomed in enough
                // Draw text background
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.fillRect(
                  node.x - bgDimensions[0] / 2,
                  node.y + 5, // Position below the node
                  bgDimensions[0],
                  bgDimensions[1],
                );

                // Draw text
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#333";
                ctx.fillText(label, node.x, node.y + 5 + fontSize / 2);
              }
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI);
              ctx.fill();
            }}
          />
        )}
      </div>

      {selectedNode && (
        <div className="mt-4 p-4 border rounded-md bg-white">
          <h3 className="font-semibold">
            {selectedNode.type === "link" && "🔗 "}
            {selectedNode.type === "note" && "📝 "}
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
              {selectedNode.tags.map((tag) => (
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
