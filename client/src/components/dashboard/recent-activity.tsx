import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import { Loader2, File, Link, Network, Lightbulb } from 'lucide-react';
import { Link as RouterLink } from 'wouter';

export default function RecentActivity() {
  // Fetch recent activities
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?limit=5`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
  });
  
  // Helper to get icon for activity
  const getActivityIcon = (action: string, entityType: string) => {
    if (entityType === 'note') return <File className="h-5 w-5" />;
    if (entityType === 'link') return <Link className="h-5 w-5" />;
    if (entityType === 'connection') return <Network className="h-5 w-5" />;
    if (entityType === 'daily_prompt') return <Lightbulb className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };
  
  // Helper to get icon background color
  const getIconBgColor = (entityType: string) => {
    if (entityType === 'note') return 'bg-indigo-100 text-indigo-500';
    if (entityType === 'link') return 'bg-blue-100 text-blue-500';
    if (entityType === 'connection') return 'bg-green-100 text-green-500';
    if (entityType === 'daily_prompt') return 'bg-yellow-100 text-yellow-500';
    return 'bg-gray-100 text-gray-500';
  };
  
  // Helper to format activity text
  const getActivityText = (activity: any) => {
    const { action, entityType, metadata } = activity;
    
    if (action === 'created_note') {
      return `Added new note: "${metadata.title || 'Untitled'}"`;
    }
    
    if (action === 'updated_note') {
      return `Updated note: "${metadata.title || 'Untitled'}"`;
    }
    
    if (action === 'deleted_note') {
      return `Deleted a note`;
    }
    
    if (action === 'saved_link') {
      return `Saved link: "${metadata.title || 'Untitled'}"`;
    }
    
    if (action === 'updated_link') {
      return `Updated saved link: "${metadata.title || 'Untitled'}"`;
    }
    
    if (action === 'deleted_link') {
      return `Deleted a saved link`;
    }
    
    if (action === 'created_connection') {
      return `Connected items in knowledge graph`;
    }
    
    if (action === 'answered_prompt') {
      return `Responded to daily prompt: "${metadata.prompt?.substring(0, 30) || 'Daily prompt'}"...`;
    }
    
    return `${action.replace('_', ' ')} ${entityType.replace('_', ' ')}`;
  };
  
  // Helper to get activity subtitle
  const getActivitySubtitle = (activity: any) => {
    const { action, entityType, metadata } = activity;
    
    if (action === 'created_note') {
      return metadata.tags ? `Tagged with ${metadata.tags.join(', ')}` : '';
    }
    
    if (action === 'saved_link') {
      return metadata.url ? `${new URL(metadata.url).hostname.replace('www.', '')}` : '';
    }
    
    if (action === 'created_connection') {
      return 'Created new knowledge connection';
    }
    
    return '';
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !activities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">Failed to load recent activities</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Recent Activity</CardTitle>
        <RouterLink href="/activities">
          <Button variant="ghost" className="text-sm text-accent hover:text-secondary transition-colors">
            View All
          </Button>
        </RouterLink>
      </CardHeader>
      
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No recent activities</p>
        ) : (
          <div>
            {activities.map((activity: any) => (
              <div 
                key={activity.id} 
                className="border-b border-gray-100 pb-4 mb-4 last:mb-0 last:pb-0 last:border-b-0"
              >
                <div className="flex items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getIconBgColor(activity.entityType)}`}>
                    {getActivityIcon(activity.action, activity.entityType)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{getActivityText(activity)}</h4>
                    {getActivitySubtitle(activity) && (
                      <p className="text-sm text-gray-500 mt-1">{getActivitySubtitle(activity)}</p>
                    )}
                    <span className="text-xs text-gray-400 mt-2 block">
                      {formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
