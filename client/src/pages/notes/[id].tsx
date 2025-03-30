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
  Loader2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import NoteForm from "@/components/notes/note-form";
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

export default function NotePage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/notes/:id");
  const noteId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Fetch note data
  const { data: note, isLoading, error } = useQuery({
    queryKey: ['/api/notes', noteId],
    enabled: !!noteId,
  });
  
  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!noteId) return;
      return apiRequest('DELETE', `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setLocation('/notes');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete note: ${error.message}`,
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
  
  if (error || !note) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Note not found</h3>
        <p className="text-gray-500 mb-6">
          The note you're looking for doesn't exist or has been deleted.
        </p>
        <Button variant="outline" onClick={() => setLocation('/notes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notes
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
        onClick={() => setLocation('/notes')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Notes
      </Button>
      
      {/* Note header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">{note.title}</h1>
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
      
      {/* Note metadata */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
        {note.createdAt && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Created: {format(new Date(note.createdAt), 'MMMM d, yyyy')}
          </div>
        )}
        {note.updatedAt && note.updatedAt !== note.createdAt && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Updated: {format(new Date(note.updatedAt), 'MMMM d, yyyy')}
          </div>
        )}
      </div>
      
      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {note.tags.map((tag: any) => (
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
      
      {/* Note content */}
      <Card>
        <CardContent className="p-6">
          <div 
            className="prose prose-sm sm:prose max-w-none"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        </CardContent>
      </Card>
      
      {/* Edit modal */}
      <NoteForm
        noteId={noteId || undefined}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
      />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the note
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
