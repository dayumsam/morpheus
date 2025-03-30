import { useQuery } from "@tanstack/react-query";
import { StickyNote, Link as LinkIcon, Network } from "lucide-react";
import DailyPrompt from "@/components/dashboard/daily-prompt";
import StatsCard from "@/components/dashboard/stats-card";
import RecentActivity from "@/components/dashboard/recent-activity";
import ForceGraph from "@/components/ui/force-graph";
import { formatGraphData, groupNodesByType, countConnections } from "@/lib/graph-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function Dashboard() {
  // Fetch stats (notes, links, connections)
  const { data: notes } = useQuery({
    queryKey: ['/api/notes'],
  });
  
  const { data: links } = useQuery({
    queryKey: ['/api/links'],
  });
  
  const { data: graphData, isLoading: isLoadingGraph } = useQuery({
    queryKey: ['/api/graph'],
  });
  
  // Format graph data for visualization
  const formattedGraphData = formatGraphData(graphData);
  
  // Calculate stats
  const notesCount = notes?.length || 0;
  const linksCount = links?.length || 0;
  const connectionsCount = countConnections(formattedGraphData.links);
  
  return (
    <div className="space-y-6">
      {/* Stats Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          title="Notes" 
          count={notesCount} 
          change={{ percentage: 12, label: "from last week" }}
          icon={<StickyNote className="h-5 w-5" />}
        />
        
        <StatsCard 
          title="Saved Links" 
          count={linksCount} 
          change={{ percentage: 8, label: "from last week" }}
          icon={<LinkIcon className="h-5 w-5" />}
        />
        
        <StatsCard 
          title="Connections" 
          count={connectionsCount} 
          change={{ percentage: 15, label: "from last week" }}
          icon={<Network className="h-5 w-5" />}
        />
      </div>
      
      {/* Daily Prompt Section */}
      <DailyPrompt />
      
      {/* Knowledge Graph Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Knowledge Graph</CardTitle>
          <Link href="/graph">
            <Button variant="ghost" className="text-sm text-accent hover:text-secondary transition-colors">
              Full View
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingGraph ? (
            <div className="h-96 flex items-center justify-center bg-gray-50 rounded-md">
              <p className="text-gray-500">Loading graph...</p>
            </div>
          ) : formattedGraphData.nodes.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center bg-gray-50 rounded-md">
              <p className="text-gray-500 mb-4">No data in your knowledge graph yet</p>
              <div className="flex space-x-4">
                <Link href="/notes">
                  <Button variant="outline">Create a note</Button>
                </Link>
                <Link href="/links">
                  <Button variant="outline">Save a link</Button>
                </Link>
              </div>
            </div>
          ) : (
            <ForceGraph data={formattedGraphData} height={400} />
          )}
        </CardContent>
      </Card>
      
      {/* Recent Activities */}
      <RecentActivity />
    </div>
  );
}
