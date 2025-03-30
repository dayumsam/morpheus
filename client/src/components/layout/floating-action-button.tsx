import { useState } from 'react';
import { Plus, FilePlus, Link as LinkIcon, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import NoteForm from '@/components/notes/note-form';
import LinkForm from '@/components/links/link-form';
import ImageUploadForm from '@/components/ui/image-upload-form';

export default function FloatingActionButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showImageForm, setShowImageForm] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <>
      <div className="fixed right-6 bottom-6 flex flex-col-reverse space-y-3 space-y-reverse">
        {/* Action buttons - only visible when expanded */}
        {isExpanded && (
          <>
            <Button
              className="w-12 h-12 rounded-full bg-accent text-white shadow-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
              onClick={() => {
                setIsExpanded(false);
                setShowLinkForm(true);
              }}
              title="Add Link"
            >
              <LinkIcon className="h-5 w-5" />
            </Button>
            
            <Button
              className="w-12 h-12 rounded-full bg-green-500 text-white shadow-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
              onClick={() => {
                setIsExpanded(false);
                setShowImageForm(true);
              }}
              title="Create Note from Image"
            >
              <Image className="h-5 w-5" />
            </Button>
            
            <Link href="/notes/new">
              <Button
                className="w-12 h-12 rounded-full bg-secondary text-white shadow-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                onClick={() => {
                  setIsExpanded(false);
                }}
                title="Create Note"
              >
                <FilePlus className="h-5 w-5" />
              </Button>
            </Link>
          </>
        )}
        
        {/* Main FAB button */}
        <Button
          className="w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
          onClick={toggleExpand}
        >
          {isExpanded ? (
            <X className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      {/* Note form modal */}
      <NoteForm 
        isOpen={showNoteForm} 
        onClose={() => setShowNoteForm(false)} 
      />
      
      {/* Link form modal */}
      <LinkForm 
        isOpen={showLinkForm} 
        onClose={() => setShowLinkForm(false)} 
      />
      
      {/* Image upload form modal */}
      <ImageUploadForm
        isOpen={showImageForm}
        onClose={() => setShowImageForm(false)}
      />
    </>
  );
}
