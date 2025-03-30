import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ImageIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface ImageUploadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageUploadForm({ isOpen, onClose }: ImageUploadFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: 'No image selected',
        description: 'Please select an image to upload',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64String = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Image = base64String.split(',')[1];
        
        // Create note from image
        const result = await apiRequest('POST', '/api/image/create-note', {
          title: title || 'Image Note',
          base64Image,
        });
        
        toast({
          title: 'Note created',
          description: 'Successfully created note from image',
        });
        
        // Refresh notes list
        queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
        
        // Clear form and close
        setTitle('');
        setFile(null);
        setPreview(null);
        onClose();
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error processing your image',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Note from Image</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Image Note"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('image')?.click()}>
              {preview ? (
                <div className="relative w-full h-40">
                  <img src={preview} alt="Preview" className="h-full mx-auto object-contain" />
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center text-gray-500">
                  <ImageIcon className="h-10 w-10 mb-2" />
                  <p>Click to upload an image</p>
                  <p className="text-xs">JPG, PNG, GIF up to 5MB</p>
                </div>
              )}
              <Input
                id="image"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Note
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}