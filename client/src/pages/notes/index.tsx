import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function NotesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  
  // Fetch all notes
  const { data: notes, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/notes'],
  });
  
  // Fetch tags to pass to the notes
  const { data: tags } = useQuery({
    queryKey: ['/api/tags'],
  });
  
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
  
  // Filter notes based on search query
  const filteredNotes = notes?.filter((note: any) => {
    if (!searchQuery) return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowerCaseQuery) ||
      note.content.toLowerCase().includes(lowerCaseQuery)
    );
  });
  
  // Edit note
  const handleEditNote = (id: number) => {
    setEditingNoteId(id);
    setShowNoteForm(true);
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
