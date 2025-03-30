import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, Plus } from "lucide-react";

interface Tag {
  id: number;
  name: string;
  color?: string;
}

interface Link {
  id: number;
  url: string;
  title: string;
  description?: string;
  tags?: Tag[];
}

// Form validation schema
const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  tags: z.array(z.number()).optional(),
});

interface LinkFormProps {
  linkId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function LinkForm({ linkId, isOpen, onClose }: LinkFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Fetch tags for the dropdown
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    enabled: isOpen,
  });

  // Fetch link data if editing existing link
  const { data: existingLink, isLoading: isLoadingLink } = useQuery<Link>({
    queryKey: ["/api/links", linkId],
    enabled: isOpen && !!linkId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      tags: [],
    },
  });

  // Set form values when editing existing link
  useEffect(() => {
    if (existingLink) {
      form.reset({
        url: existingLink.url,
        title: existingLink.title,
        description: existingLink.description || "",
        tags: existingLink.tags?.map((tag) => tag.id) || [],
      });
      setSelectedTags(existingLink.tags?.map((tag) => tag.id) || []);
    } else if (isOpen) {
      form.reset({
        url: "",
        title: "",
        description: "",
        tags: [],
      });
      setSelectedTags([]);
    }
  }, [existingLink, isOpen, form]);

  // Create or update link
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (linkId) {
        // Update existing link
        return apiRequest("PUT", `/api/links/${linkId}`, values);
      } else {
        // Create new link
        setIsFetchingMetadata(true);
        const response = await apiRequest("POST", "/api/links", values);
        setIsFetchingMetadata(false);
        return response;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: linkId ? "Link updated" : "Link saved",
        description: linkId
          ? "Your link has been updated"
          : `Successfully saved: ${variables.title}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${linkId ? "update" : "save"} link: ${error.message}`,
        variant: "destructive",
      });
      setIsFetchingMetadata(false);
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Add selected tags to the form values
    values.tags = selectedTags;
    mutation.mutate(values);
  };

  // Fetch metadata when URL changes (only if not editing)
  const fetchUrlMetadata = async (url: string) => {
    if (!url || !url.startsWith("http") || linkId) return;

    try {
      setIsFetchingMetadata(true);
      const response = await fetch(
        `/api/links/metadata?url=${encodeURIComponent(url)}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        let generatedTags: number[] = [];

        // Set title from metadata or URL
        if (data.title) {
          form.setValue("title", data.title);
        } else {
          // Extract title from URL if no metadata title
          const urlTitle = new URL(url).hostname
            .replace("www.", "")
            .split(".")[0]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          form.setValue("title", urlTitle);
        }

        // Set description from metadata
        if (data.description) {
          form.setValue("description", data.description);
        }

        // Generate and set tags based on content
        if (data.content) {
          generatedTags = await generateTagsFromContent(data.content);
          setSelectedTags(generatedTags);
          form.setValue("tags", generatedTags);
        }

        // Create a note from the content if available
        if (data.content) {
          const noteContent = `# ${form.getValues("title")}\n\n${data.content.substring(0, 500)}...`;
          await apiRequest("POST", "/api/notes", {
            title: form.getValues("title"),
            content: noteContent,
            tags: generatedTags,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching URL metadata:", error);
      toast({
        title: "Error",
        description: "Failed to fetch metadata from URL",
        variant: "destructive",
      });
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // Generate tags from content
  const generateTagsFromContent = async (
    content: string,
  ): Promise<number[]> => {
    try {
      const response = await fetch("/api/tags/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (response.ok) {
        const { tags } = await response.json();
        return tags.map((tag: Tag) => tag.id);
      }
      return [];
    } catch (error) {
      console.error("Error generating tags:", error);
      return [];
    }
  };

  // Create new tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/tags", { name });
    },
    onSuccess: (newTag: Tag) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      addTag(newTag.id.toString());
      setShowNewTagInput(false);
      setNewTagName("");
      toast({
        title: "Tag created",
        description: `Successfully created tag: ${newTag.name}`,
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

  // Handle tag selection
  const addTag = (tagId: string) => {
    if (tagId === "new") {
      setShowNewTagInput(true);
      return;
    }
    const id = Number(tagId);
    if (!selectedTags.includes(id)) {
      setSelectedTags([...selectedTags, id]);
      form.setValue("tags", [...selectedTags, id]);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate(newTagName.trim());
    }
  };

  const removeTag = (tagId: number) => {
    const updatedTags = selectedTags.filter((id) => id !== tagId);
    setSelectedTags(updatedTags);
    form.setValue("tags", updatedTags);
  };

  // Get tag name by id
  const getTagById = (tagId: number): Tag | undefined => {
    return tags?.find((tag) => tag.id === tagId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{linkId ? "Edit Link" : "Save New Link"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!linkId) {
                            fetchUrlMetadata(e.target.value);
                          }
                        }}
                        disabled={isFetchingMetadata}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fetchUrlMetadata(field.value)}
                      disabled={!field.value || isFetchingMetadata || linkId}
                    >
                      {isFetchingMetadata ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Fetch Metadata"
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a title"
                      {...field}
                      disabled={isFetchingMetadata}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a description"
                      {...field}
                      disabled={isFetchingMetadata}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="space-y-2">
                    <Select onValueChange={addTag}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tags" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new" className="text-primary">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create New Tag
                          </div>
                        </SelectItem>
                        {tags?.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id.toString()}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {showNewTagInput && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new tag name"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateTag();
                            }
                          }}
                          disabled={createTagMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowNewTagInput(false);
                            setNewTagName("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateTag}
                          disabled={
                            !newTagName.trim() || createTagMutation.isPending
                          }
                        >
                          {createTagMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Create"
                          )}
                        </Button>
                      </div>
                    )}

                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tagId) => {
                          const tag = getTagById(tagId);
                          if (!tag) return null;
                          return (
                            <div
                              key={tagId}
                              className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
                            >
                              <span>{tag.name}</span>
                              <button
                                type="button"
                                onClick={() => removeTag(tagId)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || isFetchingMetadata}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {linkId ? "Update Link" : "Save Link"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
