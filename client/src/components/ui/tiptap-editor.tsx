import { useEditor, EditorContent, Editor, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { useCallback, useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading as HeadingIcon, 
  Heading1,
  Heading2,
  Heading3, 
  Code, 
  Link as LinkIcon, 
  Undo, 
  Redo,
  Quote,
  Tag,
  Info
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  tags?: { id: number; name: string; color: string; }[];
  onTagSelect?: (tagId: number) => void;
}

// Custom extension for frontmatter support
const Frontmatter = Extension.create({
  name: 'frontmatter',
  addKeyboardShortcuts() {
    return {
      'Mod-m': () => {
        const { editor } = this;
        const currentContent = editor.getHTML();
        
        // Check if frontmatter already exists
        if (!currentContent.includes('---')) {
          const frontmatter = `<p>---</p><p>tags: </p><p>date: ${new Date().toISOString().split('T')[0]}</p><p>---</p><p></p>`;
          editor.commands.insertContentAt(0, frontmatter);
          return true;
        }
        
        return false;
      },
    };
  },
});

const MenuBar = ({ 
  editor,
  tags,
  onTagSelect 
}: { 
  editor: Editor | null;
  tags?: { id: number; name: string; color: string; }[];
  onTagSelect?: (tagId: number) => void;
}) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addFrontmatter = useCallback(() => {
    const frontmatter = `<p>---</p><p>tags: </p><p>date: ${new Date().toISOString().split('T')[0]}</p><p>---</p><p></p>`;
    editor.commands.insertContentAt(0, frontmatter);
  }, [editor]);

  const [showTagPopover, setShowTagPopover] = useState(false);
  const tagPopoverRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(e.target as Node)) {
        setShowTagPopover(false);
      }
    };
    
    if (showTagPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagPopover]);
  
  const handleTagSelect = useCallback((tagId: number) => {
    if (onTagSelect) {
      onTagSelect(tagId);
      setShowTagPopover(false);
    }
  }, [onTagSelect]);

  return (
    <div className="flex flex-wrap items-center border-b p-2 bg-gray-50 rounded-t-md gap-1">
      <div className="flex items-center space-x-1 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="border-l h-6 mr-2"></div>
      
      <div className="flex items-center space-x-1 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'bg-gray-200' : ''}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="border-l h-6 mr-2"></div>
      
      <div className="flex items-center space-x-1 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="border-l h-6 mr-2"></div>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={setLink}
        className={editor.isActive('link') ? 'bg-gray-200' : ''}
        title="Insert Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      
      <div className="flex-1"></div>
      
      {tags && tags.length > 0 && onTagSelect && (
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTagPopover(!showTagPopover)}
            title="Add Tag"
          >
            <Tag className="h-4 w-4" />
          </Button>
          
          {showTagPopover && (
            <div 
              ref={tagPopoverRef}
              className="absolute top-full right-0 mt-1 z-50 bg-white rounded-md shadow-lg border p-2 w-48"
            >
              <div className="text-sm font-medium text-gray-700 mb-1 px-2">Add Tag</div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                    onClick={() => handleTagSelect(tag.id)}
                  >
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addFrontmatter}
        title="Add Frontmatter (Ctrl+M)"
      >
        <Info className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  tags,
  onTagSelect
}: TiptapEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({
        levels: [1, 2, 3, 4],
      }),
      Link.configure({
        openOnClick: false,
      }),
      StarterKit.configure({
        document: false,
        paragraph: false,
        text: false,
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Frontmatter,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] p-4 font-sans',
        placeholder,
      },
    },
  });

  // Update editor content when the content prop changes
  useEffect(() => {
    if (editor && content) {
      // Only update if the content actually changed and is different from current editor content
      const currentContent = editor.getHTML();
      if (content !== currentContent) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Add keyboard shortcut for frontmatter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' && (e.ctrlKey || e.metaKey) && editor) {
        e.preventDefault();
        const frontmatter = `<p>---</p><p>tags: </p><p>date: ${new Date().toISOString().split('T')[0]}</p><p>---</p><p></p>`;
        editor.commands.insertContentAt(0, frontmatter);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);
  
  // Add support for pasting markdown content
  useEffect(() => {
    if (!editor) return;
    
    const handlePaste = (event: Event) => {
      const clipboardEvent = event as ClipboardEvent;
      const text = clipboardEvent.clipboardData?.getData('text/plain');
      
      if (!text) return;
      
      // Check if the content looks like markdown
      const isMarkdown = 
        text.includes('#') || 
        text.includes('*') || 
        text.includes('- ') || 
        text.includes('1. ') || 
        (text.includes('[') && text.includes('](')) || 
        text.includes('```');
      
      if (isMarkdown) {
        event.preventDefault();
        
        // Convert markdown to HTML using basic regex replacements
        let html = text
          // Headers
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
          
          // Bold and italic
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          
          // Lists
          .replace(/^- (.+)$/gm, '<li>$1</li>')
          .replace(/^[0-9]+\. (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>.+<\/li>\n)+/g, (m) => `<ul>${m.replace(/\n/g, '')}</ul>`)
          
          // Links
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
          
          // Code blocks
          .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
          
          // Inline code
          .replace(/`(.+?)`/g, '<code>$1</code>')
          
          // Paragraphs
          .replace(/^(?!<[uh][l1-5>])(.+)$/gm, '<p>$1</p>');
        
        // Insert the HTML content
        editor.commands.insertContent(html);
      }
    };
    
    // Add the paste event listener to the editor DOM element
    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste as EventListener);
    
      return () => {
        editorElement.removeEventListener('paste', handlePaste as EventListener);
      };
    }
  }, [editor]);

  return (
    <div className={`border rounded-md overflow-hidden ${isFocused ? 'ring-2 ring-secondary ring-opacity-50' : ''} ${className}`}>
      <MenuBar editor={editor} tags={tags} onTagSelect={onTagSelect} />
      <EditorContent editor={editor} className="w-full" />
    </div>
  );
}
