import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LinkCard from "@/components/links/link-card";
import LinkForm from "@/components/links/link-form";
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

export default function LinksPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<number | null>(null);
  
  // Fetch all links
  const { data: links, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/links'],
  });
  
  // Fetch tags to pass to the links
  const { data: tags } = useQuery({
    queryKey: ['/api/tags'],
  });
  
  // Delete link
  const handleDeleteLink = async () => {
    if (!deletingLinkId) return;
    
    try {
      await apiRequest('DELETE', `/api/links/${deletingLinkId}`);
      toast({
        title: "Link deleted",
        description: "Your link has been deleted successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete link: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setDeletingLinkId(null);
    }
  };
  
  // Filter links based on search query
  const filteredLinks = links?.filter((link: any) => {
    if (!searchQuery) return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return (
      link.title.toLowerCase().includes(lowerCaseQuery) ||
      (link.description && link.description.toLowerCase().includes(lowerCaseQuery)) ||
      (link.url && link.url.toLowerCase().includes(lowerCaseQuery))
    );
  });
  
  // Edit link
  const handleEditLink = (id: number) => {
    setEditingLinkId(id);
    setShowLinkForm(true);
  };
  
  return (
    <div>
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64 md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search links..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => {
          setEditingLinkId(null);
          setShowLinkForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Save New Link
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
            Failed to load links. Please try again later.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Empty state */}
      {!isLoading && !error && (!links || links.length === 0) && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved links yet</h3>
          <p className="text-gray-500 mb-6">Save your first web link to start building your knowledge base</p>
          <Button onClick={() => {
            setEditingLinkId(null);
            setShowLinkForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Save your first link
          </Button>
        </div>
      )}
      
      {/* Links grid */}
      {!isLoading && !error && filteredLinks && filteredLinks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLinks.map((link: any) => (
            <LinkCard
              key={link.id}
              link={link}
              onEdit={handleEditLink}
              onDelete={() => setDeletingLinkId(link.id)}
            />
          ))}
        </div>
      )}
      
      {/* Link form modal */}
      <LinkForm
        linkId={editingLinkId || undefined}
        isOpen={showLinkForm}
        onClose={() => {
          setShowLinkForm(false);
          setEditingLinkId(null);
        }}
      />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingLinkId} onOpenChange={() => setDeletingLinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the saved link
              and remove it from your knowledge graph.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
