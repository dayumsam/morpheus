import { useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import FloatingActionButton from '@/components/layout/floating-action-button';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Get page title based on current location
  const getPageTitle = (path: string) => {
    const routes: Record<string, string> = {
      '/': 'Dashboard',
      '/notes': 'All Notes',
      '/links': 'Saved Links',
      '/graph': 'Knowledge Graph',
      '/daily-prompts': 'Daily Prompts',
      '/search': 'Smart Search',
    };
    
    // Check for dynamic routes
    if (path.startsWith('/notes/')) return 'Note Details';
    if (path.startsWith('/links/')) return 'Link Details';
    if (path.startsWith('/tags/')) return 'Tagged Items';
    
    return routes[path] || 'Not Found';
  };
  
  const pageTitle = getPageTitle(location);
  
  return (
    <div className="flex h-screen">
      {/* Sidebar - hidden on mobile, visible on md screens and up */}
      <Sidebar 
        className={`fixed z-20 h-full md:relative ${showMobileSidebar ? 'block' : 'hidden md:flex'}`} 
      />
      
      {/* Sidebar overlay when open on mobile */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm h-16 flex items-center">
          <div className="px-4 flex justify-between w-full">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-600 md:hidden"
                onClick={() => setShowMobileSidebar(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="ml-4 text-xl font-semibold">{pageTitle}</h1>
            </div>
            <div className="flex items-center">
              {/* Add any header controls here */}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background p-4">
          {children}
        </main>
      </div>
      
      {/* Floating action button */}
      <FloatingActionButton />
    </div>
  );
}
