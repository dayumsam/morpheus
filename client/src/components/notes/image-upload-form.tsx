import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ImageUploadFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageUploadForm({ isOpen, onClose }: ImageUploadFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setImage(selectedFile);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string || null);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Convert image to base64
  const getBase64FromImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!image) {
        reject('No image selected');
        return;
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Create a note from the image
  const handleCreateNote = async () => {
    try {
      if (!image) {
        toast({
          title: 'No image selected',
          description: 'Please select an image to analyze',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);

      // Get base64 representation of the image
      const base64Image = await getBase64FromImage();
      
      // Set a default title if none provided
      const noteTitle = title || `Image Analysis: ${image.name.split('.')[0]}`;
      
      // Send to API for processing
      const response = await apiRequest('POST', '/api/image/create-note', {
        base64Image,
        title: noteTitle
      });

      // Success
      toast({
        title: 'Note created',
        description: 'Your image has been analyzed and saved as a note',
      });
      
      // Refresh notes list
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      
      // Close modal
      resetForm();
      onClose();
    } catch (error) {
      let errorMessage = 'Failed to analyze image';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form 
  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setTitle('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Note from Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title for your note"
            />
            <p className="text-sm text-gray-500">
              If left blank, a title will be generated based on the image filename.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center justify-center border-2 border-dashed rounded-md p-4 hover:bg-gray-50 cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {imagePreview ? (
                <div className="w-full">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full max-h-64 object-contain mb-2"
                  />
                  <p className="text-center text-sm text-gray-500">
                    {image?.name}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Select Image
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-500">
            The image will be analyzed using AI vision to extract content, which will be saved as a note with auto-generated tags.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateNote} disabled={!image || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Create Note'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}