import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Loader2,
  StickyNote,
  Link as LinkIcon,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ForceGraph from "@/components/ui/force-graph";
import { formatGraphData, groupNodesByType, countConnections, calculateNodeStats } from "@/lib/graph-utils";
import { useLocation } from "wouter";

export default function GraphPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Fetch graph data
  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['/api/graph'],
  });
  
  // Format graph data for visualization
  const formattedGraphData = formatGraphData(graphData);
  
  // Calculate stats
  const nodesByType = groupNodesByType(formattedGraphData.nodes);
  const connectionsCount = countConnections(formattedGraphData.links);
  const { mostConnected, averageConnections } = calculateNodeStats(
    formattedGraphData.nodes, 
    formattedGraphData.links
  );
  
  // Handle node click to navigate to the node detail
  const handleNodeClick = (node: any) => {
    if (!node) return;
    
    // Parse the node ID to get the type and original ID
    const [type, id] = node.id.split('-');
    
    if (type === 'note') {
      setLocation(`/notes/${id}`);
    } else if (type === 'link') {
      setLocation(`/links/${id}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>
          Failed to load graph data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <h3 className="text-2xl font-bold">{nodesByType.note}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <StickyNote className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Links</p>
                <h3 className="text-2xl font-bold">{nodesByType.link}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <LinkIcon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Connections</p>
                <h3 className="text-2xl font-bold">{connectionsCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Tag className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Connections</p>
                <h3 className="text-2xl font-bold">{averageConnections}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <Maximize className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Graph visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Knowledge Graph</CardTitle>
          <p className="text-sm text-gray-500">
            Interactive visualization of your knowledge connections. Click on a node to view details.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {formattedGraphData.nodes.length === 0 ? (
            <div className="h-[600px] flex flex-col items-center justify-center bg-gray-50 rounded-md">
              <p className="text-gray-500 mb-4">No data in your knowledge graph yet</p>
              <div className="flex space-x-4">
                <Button variant="outline" onClick={() => setLocation('/notes')}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Create a note
                </Button>
                <Button variant="outline" onClick={() => setLocation('/links')}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Save a link
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ForceGraph 
                data={formattedGraphData} 
                height={600}
                onNodeClick={handleNodeClick}
              />
              
              <div className="mt-4 flex flex-wrap gap-6">
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-secondary mr-2"></span>
                  <span className="text-sm text-gray-600">Notes</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-accent mr-2"></span>
                  <span className="text-sm text-gray-600">Links</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  <span className="text-sm text-gray-600">Projects</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                  <span className="text-sm text-gray-600">Ideas</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {mostConnected && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Most Connected Node</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                mostConnected.type === 'note' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {mostConnected.type === 'note' ? (
                  <StickyNote className="h-5 w-5" />
                ) : (
                  <LinkIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-medium">{mostConnected.title}</h3>
                <p className="text-sm text-gray-500">
                  {mostConnected.type === 'note' ? 'Note' : 'Link'} with the most connections in your knowledge graph
                </p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-accent"
                  onClick={() => handleNodeClick(mostConnected)}
                >
                  View details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
