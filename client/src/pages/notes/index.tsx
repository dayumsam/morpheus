import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import NoteCard from "@/components/notes/note-card";
import NoteForm from "@/components/notes/note-form";
import { apiRequest } from "@/lib/queryClient";
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
import { useLocation } from "wouter";

export default function NotesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [location, setLocation] = useLocation();
  
  // Extract tag ID from URL if present
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tagId = urlParams.get('tagId');
      if (tagId) {
        const numericTagId = parseInt(tagId);
        setSelectedTagId(numericTagId);
        console.log("Set selected tag ID to:", numericTagId);
      } else {
        setSelectedTagId(null);
        console.log("Cleared selected tag ID");
      }
    } catch (error) {
      console.error("Error parsing tagId:", error);
      setSelectedTagId(null);
    }
  }, [location]);
  
  // Fetch all notes
  const { data: notes, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/notes'],
  });
  
  // Fetch tags to pass to the notes
  const { data: tags, isLoading: isTagsLoading } = useQuery({
    queryKey: ['/api/tags'],
  });
  
  // Fetch notes for a specific tag if selectedTagId is set
  const { data: tagNotes, isLoading: isTagNotesLoading } = useQuery({
    queryKey: ['/api/tags', selectedTagId, 'notes'],
    enabled: !!selectedTagId,
  });
  
  // Get the selected tag name if a tag is selected
  const selectedTag = selectedTagId && tags 
    ? tags.find((tag: any) => tag.id === selectedTagId) 
    : null;
  
  // Delete note
  const handleDeleteNote = async () => {
    if (!deletingNoteId) return;
    
    try {
      await apiRequest('DELETE', `/api/notes/${deletingNoteId}`);
      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete note: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setDeletingNoteId(null);
    }
  };
  
  // Filter notes based on search query and selected tag
  const filteredNotes = (selectedTagId ? tagNotes : notes)?.filter((note: any) => {
    if (!note || !searchQuery) return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return (
      (note.title && note.title.toLowerCase().includes(lowerCaseQuery)) ||
      (note.content && typeof note.content === 'string' && 
       note.content.toLowerCase().includes(lowerCaseQuery))
    );
  });
  
  // Edit note
  const handleEditNote = (id: number) => {
    setEditingNoteId(id);
    setShowNoteForm(true);
  };
  
  // Clear tag filter
  const clearTagFilter = () => {
    setLocation('/notes');
    setSelectedTagId(null);
  };
  
  return (
    <div>
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64 md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notes..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => {
          setEditingNoteId(null);
          setShowNoteForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>
      
      {/* Selected tag filter */}
      {selectedTag && (
        <div className="mb-6 flex items-center">
          <span className="text-sm text-gray-600 mr-2">Filtered by tag:</span>
          <Badge 
            variant="outline" 
            className="flex items-center gap-1 pl-3"
            style={{ borderColor: selectedTag.color, color: selectedTag.color }}
          >
            #{selectedTag.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-transparent"
              onClick={clearTagFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}
      
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
            Failed to load notes. Please try again later.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Empty state */}
      {!isLoading && !error && (!notes || notes.length === 0) && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
          <p className="text-gray-500 mb-6">Start capturing your thoughts and ideas</p>
          <Button onClick={() => {
            setEditingNoteId(null);
            setShowNoteForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first note
          </Button>
        </div>
      )}
      
      {/* Notes grid */}
      {!isLoading && !error && filteredNotes && filteredNotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note: any) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEditNote}
              onDelete={() => setDeletingNoteId(note.id)}
            />
          ))}
        </div>
      )}
      
      {/* Note form modal */}
      <NoteForm
        noteId={editingNoteId || undefined}
        isOpen={showNoteForm}
        onClose={() => {
          setShowNoteForm(false);
          setEditingNoteId(null);
        }}
      />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingNoteId} onOpenChange={() => setDeletingNoteId(null)}>
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
            <AlertDialogAction onClick={handleDeleteNote}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
