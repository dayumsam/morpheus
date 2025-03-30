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

interface Tag {
  id: number;
  name: string;
  color: string;
  count?: number;
}

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
      const urlParams = new URLSearchParams(location.split("?")[1] || "");
      const tagId = urlParams.get("tagId");
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

  // Fetch notes based on selected tag
  const {
    data: notes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/notes", location], // Include location in query key to refetch when URL changes
    queryFn: async () => {
      if (selectedTagId) {
        return apiRequest("GET", `/api/tags/${selectedTagId}/notes`);
      } else {
        return apiRequest("GET", "/api/notes");
      }
    },
  });

  // Fetch tags
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Get selected tag info
  const selectedTag =
    selectedTagId && tags
      ? tags.find((tag: Tag) => tag.id === selectedTagId)
      : null;

  // Filter notes by search query
  const filteredNotes = (notes || []).filter((note: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  });

  // Delete note
  const handleDeleteNote = async () => {
    if (!deletingNoteId) return;

    try {
      await apiRequest("DELETE", `/api/notes/${deletingNoteId}`);
      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete note: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Clear tag filter
  const clearTagFilter = () => {
    setLocation("/notes");
  };

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
        <Button
          onClick={() => {
            setEditingNoteId(null);
            setShowNoteForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Tag filters */}
      {tags && tags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              Filter by tags:
            </h3>
            {selectedTagId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearTagFilter}
              >
                Clear filter
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags
              .sort((a: Tag, b: Tag) => (b.count || 0) - (a.count || 0))
              .map((tag: Tag) => (
                <Button
                  key={tag.id}
                  variant={selectedTagId === tag.id ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs flex items-center gap-1"
                  onClick={() => setLocation(`/notes?tagId=${tag.id}`)}
                  style={{
                    borderColor:
                      selectedTagId === tag.id ? tag.color : undefined,
                    backgroundColor:
                      selectedTagId === tag.id ? tag.color : undefined,
                    color: selectedTagId === tag.id ? "white" : tag.color,
                  }}
                >
                  <span
                    className={`w-2 h-2 rounded-full`}
                    style={{
                      backgroundColor:
                        selectedTagId === tag.id ? "white" : tag.color,
                    }}
                  ></span>
                  {tag.name}
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full ml-1">
                    {tag.count || 0}
                  </span>
                </Button>
              ))}
          </div>
        </div>
      )}

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
      {!isLoading &&
        !error &&
        (!filteredNotes || filteredNotes.length === 0) && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedTagId ? "No notes with this tag" : "No notes yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedTagId
                ? "Try selecting a different tag or create a new note with this tag"
                : "Start capturing your thoughts and ideas"}
            </p>
            <Button
              onClick={() => {
                setEditingNoteId(null);
                setShowNoteForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {selectedTagId
                ? "Create note with this tag"
                : "Create your first note"}
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
      <AlertDialog
        open={!!deletingNoteId}
        onOpenChange={() => setDeletingNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              note and remove it from your knowledge graph.
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
