import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Save, ChevronLeft, Hash, Plus, Loader2 } from "lucide-react";
import TiptapEditor from "@/components/ui/tiptap-editor";

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  content: z.string().min(1, { message: "Content is required" }),
  tags: z.array(z.number()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Note {
  id: number;
  title: string;
  content: string;
  tags?: { id: number; name: string; color: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  const noteId = params?.id ? parseInt(params.id) : undefined;
  const isNewNote = !noteId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Form initialization
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: [],
    },
  });

  // Fetch note data if editing
  const { data: existingNote, isLoading: isLoadingNote } = useQuery<Note>({
    queryKey: [`/api/notes/${noteId}`],
    enabled: !!noteId,
  });

  // Fetch all tags
  const { data: tags, isLoading: isLoadingTags } = useQuery<
    { id: number; name: string; color: string }[]
  >({
    queryKey: ["/api/tags"],
  });

  // Set form values when editing existing note
  useEffect(() => {
    if (existingNote) {
      form.reset({
        title: existingNote.title,
        content: existingNote.content,
        tags: existingNote.tags?.map((tag) => tag.id) || [],
      });
      setSelectedTags(existingNote.tags?.map((tag) => tag.id) || []);
    } else if (!isNewNote) {
      // If we're editing but couldn't find the note, redirect back to notes list
      toast({
        title: "Error",
        description: "Note not found",
        variant: "destructive",
      });
      setLocation("/notes");
    }
  }, [existingNote, isNewNote, form, toast, setLocation]);

  // Create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      // First check if tag already exists
      const existingTag = tags?.find(
        (t) => t.name.toLowerCase() === name.toLowerCase(),
      );

      if (existingTag) {
        // If tag exists, return it instead of creating a new one
        return existingTag;
      }

      // Otherwise create a new tag
      const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      return apiRequest("POST", "/api/tags", { name, color: randomColor });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });

      // Only add if not already in selected tags
      if (!selectedTags.includes(data.id)) {
        const newSelectedTags = [...selectedTags, data.id];
        setSelectedTags(newSelectedTags);
        form.setValue("tags", newSelectedTags);
      }

      setNewTagName("");
      setShowTagInput(false);
      toast({
        title: "Tag added",
        description: `Tag "${data.name}" has been added to the note`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Save the note
  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (isNewNote) {
        return apiRequest("POST", "/api/notes", values);
      } else {
        return apiRequest("PUT", `/api/notes/${noteId}`, values);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: isNewNote ? "Note created" : "Note updated",
        description: isNewNote
          ? "Your new note has been created"
          : "Your note has been updated",
      });

      // Navigate to the note view page
      if (isNewNote) {
        setLocation(`/notes/${data.id}`);
      } else {
        setLocation(`/notes/${noteId}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save note: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Auto-tag content using AI and apply tags to the note
  const autoTagContent = useCallback(async () => {
    if (!form.getValues("content")) {
      toast({
        title: "Error",
        description: "Please add some content to auto-tag",
        variant: "destructive",
      });
      return;
    }

    setIsAutoTagging(true);

    try {
      const response = await apiRequest("POST", "/api/auto-tag", {
        content: form.getValues("content"),
      });

      if (response.suggestedTags && Array.isArray(response.suggestedTags)) {
        const newTags = [...response.suggestedTags];
        const tagsToApply: number[] = [];
        const tagsToSuggest: string[] = [];

        // Process each suggested tag
        for (const tagName of newTags) {
          // Check if tag already exists
          const existingTag = tags?.find(
            (t) => t.name.toLowerCase() === tagName.toLowerCase(),
          );

          if (existingTag) {
            // Add to the current selection if not already selected
            if (!selectedTags.includes(existingTag.id)) {
              tagsToApply.push(existingTag.id);
            }
          } else {
            // Add to suggestions for tags that don't exist yet
            tagsToSuggest.push(tagName);
          }
        }

        // Add existing tags to the note
        if (tagsToApply.length > 0) {
          const newSelectedTags = [...selectedTags, ...tagsToApply];
          setSelectedTags(newSelectedTags);
          form.setValue("tags", newSelectedTags);

          toast({
            title: "Tags added",
            description: `Added ${tagsToApply.length} tag${tagsToApply.length === 1 ? "" : "s"} to your note.`,
          });
        }

        // Set the remaining tags as suggestions
        setSuggestedTags(tagsToSuggest);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to auto-tag content: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsAutoTagging(false);
    }
  }, [form, toast, tags, selectedTags]);

  // Apply suggested tags
  const applyTagSuggestions = async () => {
    if (!suggestedTags.length) return;

    const newSelectedTags = [...selectedTags];

    for (const tagName of suggestedTags) {
      // Check if tag already exists
      const existingTag = tags?.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      if (existingTag) {
        if (!selectedTags.includes(existingTag.id)) {
          newSelectedTags.push(existingTag.id);
        }
      } else {
        // Create new tag
        try {
          const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
          const response = await apiRequest("POST", "/api/tags", {
            name: tagName,
            color: randomColor,
          });

          if (response && response.id) {
            if (!newSelectedTags.includes(response.id)) {
              newSelectedTags.push(response.id);
            }
          }
        } catch (error: any) {
          console.error("Failed to create tag:", error);
          toast({
            title: "Warning",
            description: `Couldn't create tag "${tagName}". It may already exist.`,
            variant: "destructive",
          });
        }
      }
    }

    // Update selected tags
    setSelectedTags(newSelectedTags);
    form.setValue("tags", newSelectedTags);

    // Refresh tags and clear suggestions
    queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    setSuggestedTags([]);

    toast({
      title: "Tags applied",
      description: "All suggested tags have been applied to the note",
    });
  };

  // Handle tag selection
  const toggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags((prev) => prev.filter((id) => id !== tagId));
    } else {
      setSelectedTags((prev) => [...prev, tagId]);
    }
  };

  const createTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      createTagMutation.mutate(newTagName.trim());
    }
  };

  const saveNote = async () => {
    const values = form.getValues();
    values.tags = selectedTags;
    saveMutation.mutate(values);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("title", e.target.value);
  };

  const handleContentChange = (content: string) => {
    form.setValue("content", content);
  };

  // Get tag by ID helper
  const getTagById = (tagId: number) => {
    return tags?.find((tag) => tag.id === tagId);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex justify-between items-center border-b p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setLocation(isNewNote ? "/notes" : `/notes/${noteId}`)
            }
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Input
            {...form.register("title")}
            placeholder="Untitled Note"
            className="text-xl font-medium border-none shadow-none focus-visible:ring-0 w-96"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={autoTagContent}
            disabled={isAutoTagging}
          >
            {isAutoTagging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Auto-tagging...
              </>
            ) : (
              <>
                <Hash className="h-4 w-4 mr-2" />
                Auto-tag
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={saveNote}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Tags */}
      <div className="border-b px-4 py-2 flex flex-wrap items-center gap-2">
        {selectedTags.map((tagId) => {
          const tag = getTagById(tagId);
          return tag ? (
            <Badge
              key={tagId}
              variant="outline"
              className="flex items-center gap-1 pl-3"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              #{tag.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-transparent"
                onClick={() => toggleTag(tagId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null;
        })}

        {showTagInput ? (
          <form onSubmit={createTag} className="flex items-center">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="h-8 w-32 text-sm mr-1"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-8 p-1"
              disabled={createTagMutation.isPending}
            >
              {createTagMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 p-1"
              onClick={() => {
                setNewTagName("");
                setShowTagInput(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-sm"
            onClick={() => setShowTagInput(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        )}

        {/* Display available tags dropdown */}
        {!showTagInput && tags && tags.length > 0 && (
          <select
            className="h-7 px-2 text-sm border rounded-md"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                toggleTag(parseInt(e.target.value));
                e.target.value = "";
              }
            }}
          >
            <option value="">Select tag</option>
            {tags
              .filter((tag) => !selectedTags.includes(tag.id))
              .map((tag) => (
                <option key={tag.id} value={tag.id.toString()}>
                  {tag.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Tag suggestions if any */}
      {suggestedTags.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Suggested Tags</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSuggestedTags([])}
              >
                Dismiss
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={applyTagSuggestions}
              >
                Apply All
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setNewTagName(tag);
                  createTagMutation.mutate(tag);
                  setSuggestedTags((prev) => prev.filter((t) => t !== tag));
                }}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        {isLoadingNote ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <TiptapEditor
            content={existingNote?.content || form.getValues("content")}
            onChange={handleContentChange}
            placeholder="Start writing..."
            tags={tags}
            onTagSelect={(tagId) => toggleTag(tagId)}
            className="prose max-w-none"
          />
        )}
      </div>
    </div>
  );
}
