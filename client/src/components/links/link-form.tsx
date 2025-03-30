import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { X, Loader2 } from 'lucide-react';

// Form validation schema
const formSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL' }),
  title: z.string().min(1, { message: 'Title is required' }),
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
  
  // Fetch tags for the dropdown
  const { data: tags } = useQuery({
    queryKey: ['/api/tags'],
    enabled: isOpen,
  });
  
  // Fetch link data if editing existing link
  const { data: existingLink, isLoading: isLoadingLink } = useQuery({
    queryKey: ['/api/links', linkId],
    enabled: isOpen && !!linkId,
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      tags: [],
    },
  });
  
  // Set form values when editing existing link
  useEffect(() => {
    if (existingLink) {
      form.reset({
        url: existingLink.url,
        title: existingLink.title,
        description: existingLink.description || '',
        tags: existingLink.tags?.map((tag: any) => tag.id) || [],
      });
      setSelectedTags(existingLink.tags?.map((tag: any) => tag.id) || []);
    } else if (isOpen) {
      form.reset({
        url: '',
        title: '',
        description: '',
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
        return apiRequest('PUT', `/api/links/${linkId}`, values);
      } else {
        // Create new link
        setIsFetchingMetadata(true);
        const response = await apiRequest('POST', '/api/links', values);
        setIsFetchingMetadata(false);
        return response;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: linkId ? 'Link updated' : 'Link saved',
        description: linkId ? 'Your link has been updated' : `Successfully saved: ${variables.title}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/links'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to ${linkId ? 'update' : 'save'} link: ${error.message}`,
        variant: 'destructive',
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
    if (!url || !url.startsWith('http') || linkId) return;
    
    try {
      setIsFetchingMetadata(true);
      const response = await fetch(`/api/links?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          form.setValue('title', data.title);
        }
        if (data.description) {
          form.setValue('description', data.description);
        }
      }
    } catch (error) {
      console.error('Error fetching URL metadata:', error);
    } finally {
      setIsFetchingMetadata(false);
    }
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
          <DialogTitle>{linkId ? 'Edit Link' : 'Save New Link'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="https://example.com" 
                        {...field} 
                        className="pr-10"
                        onBlur={() => fetchUrlMetadata(field.value)}
                        disabled={!!linkId || mutation.isPending || isFetchingMetadata}
                      />
                      {isFetchingMetadata && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                  </FormControl>
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
                      placeholder="Link title" 
                      {...field} 
                      disabled={mutation.isPending || isFetchingMetadata}
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
                      placeholder="Description or notes about this link" 
                      {...field} 
                      className="resize-y"
                      disabled={mutation.isPending || isFetchingMetadata}
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
                        disabled={mutation.isPending || isFetchingMetadata}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : null;
                })}
                
                {tags && tags.length > 0 && (
                  <Select 
                    onValueChange={addTag}
                    disabled={mutation.isPending || isFetchingMetadata}
                  >
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
                disabled={mutation.isPending || isFetchingMetadata}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending || isFetchingMetadata}
              >
                {mutation.isPending || isFetchingMetadata ? 'Saving...' : 'Save Link'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
