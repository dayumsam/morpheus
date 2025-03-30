import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Loader2, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function TagsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showTagForm, setShowTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#805AD5");
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
  
  // Fetch all tags
  const { data: tags, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/tags'],
  });
  
  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tag: { name: string; color: string }) => {
      return apiRequest('POST', '/api/tags', tag);
    },
    onSuccess: () => {
      toast({
        title: "Tag created",
        description: "Your tag has been created successfully",
      });
      setShowTagForm(false);
      setNewTagName("");
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create tag: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/tags/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Tag deleted",
        description: "The tag has been deleted successfully",
      });
      setDeletingTagId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete tag: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle tag creation
  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Error",
        description: "Tag name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    createTagMutation.mutate({
      name: newTagName.trim(),
      color: newTagColor
    });
  };
  
  // Handle tag deletion
  const handleDeleteTag = () => {
    if (deletingTagId) {
      deleteTagMutation.mutate(deletingTagId);
    }
  };
  
  // Navigate to notes filtered by tag
  const navigateToNotes = (tagId: number) => {
    setLocation(`/notes?tagId=${tagId}`);
  };
  
  // Predefined color options
  const colorOptions = [
    { name: "Purple", value: "#805AD5" },
    { name: "Blue", value: "#4299E1" },
    { name: "Green", value: "#48BB78" },
    { name: "Yellow", value: "#ECC94B" },
    { name: "Red", value: "#F56565" },
    { name: "Pink", value: "#ED64A6" },
    { name: "Indigo", value: "#667EEA" },
    { name: "Teal", value: "#38B2AC" },
  ];
  
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tag Management</h1>
          <p className="text-gray-500">Create, view and delete tags</p>
        </div>
        <Button onClick={() => setShowTagForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tag
        </Button>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Failed to load tags. Please try again later.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Tags grid */}
      {!isLoading && !error && tags && tags.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tags.map((tag: any) => (
            <Card key={tag.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-5 h-5 rounded-full mr-3" 
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <h3 className="font-medium">{tag.name}</h3>
                      <p className="text-sm text-gray-500">
                        {tag.count} {tag.count === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigateToNotes(tag.id)}
                    >
                      View
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setDeletingTagId(tag.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && !error && (!tags || tags.length === 0) && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Tag className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No tags yet</h3>
          <p className="mt-2 text-gray-500">Create your first tag to better organize your knowledge</p>
          <Button 
            className="mt-6" 
            onClick={() => setShowTagForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Tag
          </Button>
        </div>
      )}
      
      {/* Create tag dialog */}
      <Dialog open={showTagForm} onOpenChange={setShowTagForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to organize your notes and links.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="tagName" className="text-sm font-medium">
                Tag Name
              </label>
              <Input
                id="tagName"
                placeholder="Enter tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tag Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map(color => (
                  <div 
                    key={color.value}
                    className={`w-full aspect-square rounded-md cursor-pointer border-2 flex items-center justify-center ${
                      newTagColor === color.value ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewTagColor(color.value)}
                  >
                    {newTagColor === color.value && (
                      <CheckCircle className="h-5 w-5 text-white" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <div 
                className="py-2 px-3 rounded-md border"
                style={{ borderColor: newTagColor, color: newTagColor }}
              >
                Preview: <Badge 
                  variant="outline" 
                  className="ml-2"
                  style={{ borderColor: newTagColor, color: newTagColor }}
                >
                  #{newTagName || 'Tag Name'}
                </Badge>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTagForm(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || createTagMutation.isPending}
            >
              {createTagMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <>Create Tag</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <AlertDialog 
        open={!!deletingTagId} 
        onOpenChange={(open) => !open && setDeletingTagId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the tag and remove it from all associated notes and links.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTag}
              disabled={deleteTagMutation.isPending}
            >
              {deleteTagMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}