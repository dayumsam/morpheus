import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
import { X } from 'lucide-react';

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
  const { data: tags } = useQuery({
    queryKey: ['/api/tags'],
    enabled: isOpen,
  });
  
  // Fetch note data if editing existing note
  const { data: existingNote, isLoading: isLoadingNote } = useQuery({
    queryKey: ['/api/notes', noteId],
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Tags</FormLabel>
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
