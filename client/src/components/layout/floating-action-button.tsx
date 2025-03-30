import { useState } from 'react';
import { Plus, FilePlus, Link, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoteForm from '@/components/notes/note-form';
import LinkForm from '@/components/links/link-form';

export default function FloatingActionButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  
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
            >
              <Link className="h-5 w-5" />
            </Button>
            
            <Button
              className="w-12 h-12 rounded-full bg-secondary text-white shadow-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
              onClick={() => {
                setIsExpanded(false);
                setShowNoteForm(true);
              }}
            >
              <FilePlus className="h-5 w-5" />
            </Button>
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
    </>
  );
}
