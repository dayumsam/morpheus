import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  Edit, 
  Trash, 
  Tag, 
  Loader2,
  Link as LinkIcon,
  ExternalLink 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import LinkForm from "@/components/links/link-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LinkPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/links/:id");
  const linkId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Fetch link data
  const { data: link, isLoading, error } = useQuery({
    queryKey: ['/api/links', linkId],
    enabled: !!linkId,
  });
  
  // Delete link mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!linkId) return;
      return apiRequest('DELETE', `/api/links/${linkId}`);
    },
    onSuccess: () => {
      toast({
        title: "Link deleted",
        description: "Your saved link has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/links'] });
      setLocation('/links');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete link: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle delete
  const handleDelete = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }
  
  if (error || !link) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Link not found</h3>
        <p className="text-gray-500 mb-6">
          The link you're looking for doesn't exist or has been deleted.
        </p>
        <Button variant="outline" onClick={() => setLocation('/links')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Links
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Back button */}
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => setLocation('/links')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Links
      </Button>
      
      {/* Link header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">{link.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditForm(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      {/* URL */}
      <div className="mb-6">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-accent hover:text-secondary hover:underline"
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          {link.url}
          <ExternalLink className="h-4 w-4 ml-2" />
        </a>
      </div>
      
      {/* Link metadata */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
        {link.createdAt && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Saved: {format(new Date(link.createdAt), 'MMMM d, yyyy')}
          </div>
        )}
      </div>
      
      {/* Tags */}
      {link.tags && link.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {link.tags.map((tag: any) => (
            <Badge 
              key={tag.id} 
              variant="outline" 
              className="flex items-center gap-1 px-3 py-1"
            >
              <Tag className="h-3 w-3" style={{ color: tag.color }} />
              <span>#{tag.name}</span>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Link content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {link.thumbnailUrl && (
            <div className="mb-6 w-full max-h-64 overflow-hidden rounded-md">
              <img 
                src={link.thumbnailUrl} 
                alt={link.title} 
                className="w-full h-auto object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          {link.description && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-gray-700">{link.description}</p>
            </div>
          )}
          
          {link.summary && (
            <div>
              <h3 className="text-lg font-medium mb-2">AI Summary</h3>
              <p className="text-gray-700">{link.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit modal */}
      <LinkForm
        linkId={linkId || undefined}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
      />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the saved link
              and remove it from your knowledge graph.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
