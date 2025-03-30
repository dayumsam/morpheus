import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TiptapEditor from '@/components/ui/tiptap-editor';
import { X, Tag, Loader2 } from 'lucide-react';

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  content: z.string().min(1, { message: 'Content is required' }),
  tags: z.array(z.number()).optional(),
});

interface NoteFormProps {
  noteId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function NoteForm({ noteId, isOpen, onClose }: NoteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  
  // Fetch tags for the dropdown
  const { data: tags } = useQuery<{ id: number; name: string; color: string; }[]>({
    queryKey: ['/api/tags'],
    enabled: isOpen,
  });
  
  interface Note {
    id: number;
    title: string;
    content: string;
    tags?: { id: number; name: string; color: string; }[];
    createdAt?: string;
    updatedAt?: string;
  }
  
  // Fetch note data if editing existing note
  const { data: existingNote, isLoading: isLoadingNote } = useQuery<Note>({
    queryKey: [`/api/notes/${noteId}`],
    enabled: isOpen && !!noteId,
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      tags: [],
    },
  });
  
  // Set form values when editing existing note
  useEffect(() => {
    if (existingNote) {
      form.reset({
        title: existingNote.title,
        content: existingNote.content,
        tags: existingNote.tags?.map((tag: any) => tag.id) || [],
      });
      setSelectedTags(existingNote.tags?.map((tag: any) => tag.id) || []);
    } else if (isOpen) {
      form.reset({
        title: '',
        content: '',
        tags: [],
      });
      setSelectedTags([]);
    }
  }, [existingNote, isOpen, form]);
  
  // Create or update note
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (noteId) {
        // Update existing note
        return apiRequest('PUT', `/api/notes/${noteId}`, values);
      } else {
        // Create new note
        return apiRequest('POST', '/api/notes', values);
      }
    },
    onSuccess: () => {
      toast({
        title: noteId ? 'Note updated' : 'Note created',
        description: noteId ? 'Your note has been updated' : 'Your new note has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to ${noteId ? 'update' : 'create'} note: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Add selected tags to the form values
    values.tags = selectedTags;
    mutation.mutate(values);
  };
  
  // Handle tag selection
  const addTag = (tagId: string) => {
    const id = Number(tagId);
    if (!selectedTags.includes(id)) {
      setSelectedTags([...selectedTags, id]);
      form.setValue('tags', [...selectedTags, id]);
    }
  };
  
  const removeTag = (tagId: number) => {
    const updatedTags = selectedTags.filter(id => id !== tagId);
    setSelectedTags(updatedTags);
    form.setValue('tags', updatedTags);
  };
  
  // Auto-tagging functionality
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  
  const handleAutoTagging = async () => {
    try {
      setIsAutoTagging(true);
      const content = form.getValues('content');
      
      if (!content.trim()) {
        toast({
          title: "Error",
          description: "Please add some content to your note first.",
          variant: "destructive"
        });
        return;
      }
      
      const response = await apiRequest('POST', '/api/auto-tag', { content });
      
      if (response.suggestedTags && Array.isArray(response.suggestedTags)) {
        const newTags = [...response.suggestedTags];
        const tagsToApply: number[] = [];
        
        // Process each suggested tag
        for (const tagName of newTags) {
          // Check if tag already exists
          const existingTag = tags?.find(t => 
            t.name.toLowerCase() === tagName.toLowerCase()
          );
          
          if (existingTag) {
            // Add to the current selection if not already selected
            if (!selectedTags.includes(existingTag.id)) {
              tagsToApply.push(existingTag.id);
            }
          } else if (response.newTags) {
            // Find the newly created tag from the response
            const newCreatedTag = response.newTags.find((t: any) => 
              t.name.toLowerCase() === tagName.toLowerCase()
            );
            
            if (newCreatedTag && !selectedTags.includes(newCreatedTag.id)) {
              tagsToApply.push(newCreatedTag.id);
            }
          }
        }
        
        // Add tags to the note
        if (tagsToApply.length > 0) {
          const newSelectedTags = [...selectedTags, ...tagsToApply];
          setSelectedTags(newSelectedTags);
          form.setValue('tags', newSelectedTags);
          
          toast({
            title: 'Tags added',
            description: `Added ${tagsToApply.length} tag${tagsToApply.length === 1 ? '' : 's'} to your note.`,
          });
        } else {
          toast({
            title: 'No new tags',
            description: 'No new tags were found for your content.'
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to auto-tag content: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsAutoTagging(false);
    }
  };
  
  // Get tag name by id
  const getTagById = (tagId: number) => {
    return tags?.find((tag: any) => tag.id === tagId);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{noteId ? 'Edit Note' : 'Create New Note'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Note title" 
                      {...field} 
                      className="text-lg font-medium"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <FormLabel>Tags</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex items-center gap-1"
                  onClick={handleAutoTagging}
                  disabled={isAutoTagging || !form.getValues('content')}
                >
                  {isAutoTagging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                  {isAutoTagging ? 'Auto-tagging...' : 'Auto-tag'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tagId => {
                  const tag = getTagById(tagId);
                  return tag ? (
                    <div 
                      key={tagId} 
                      className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      <span style={{ color: tag.color }}>#{tag.name}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 ml-1" 
                        onClick={() => removeTag(tagId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : null;
                })}
                
                {tags && tags.length > 0 && (
                  <Select onValueChange={addTag}>
                    <SelectTrigger className="h-8 w-auto">
                      <SelectValue placeholder="Add tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags
                        .filter((tag: any) => !selectedTags.includes(tag.id))
                        .map((tag: any) => (
                          <SelectItem key={tag.id} value={tag.id.toString()}>
                            <div className="flex items-center">
                              <span 
                                className="w-2 h-2 rounded-full mr-2" 
                                style={{ backgroundColor: tag.color }}
                              ></span>
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <TiptapEditor 
                      content={field.value} 
                      onChange={field.onChange}
                      placeholder="Start writing..."
                      tags={tags}
                      onTagSelect={(tagId) => {
                        if (!selectedTags.includes(tagId)) {
                          addTag(tagId.toString());
                        }
                      }}
                      className="min-h-[400px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : 'Save Note'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
