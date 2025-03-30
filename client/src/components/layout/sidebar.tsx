import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  StickyNote,
  Link as LinkIcon,
  Network,
  Lightbulb,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Tag as TagIcon,
  Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface Tag {
  id: number;
  name: string;
  color: string;
  count: number;
}

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Define loading state manually to avoid circular reference
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  
  // Ensure we fetch tags immediately when the sidebar mounts
  useEffect(() => {
    console.log("[Sidebar] Initializing and triggering immediate tags fetch");
    const tagsQueryKey = ["/api/tags"];

    // Always force an immediate fetch to ensure tags are loaded
    setIsLoadingTags(true);
    queryClient.fetchQuery({
      queryKey: tagsQueryKey,
      staleTime: 60 * 1000, // 1 minute
    })
    .then(() => setIsLoadingTags(false))
    .catch(() => setIsLoadingTags(false));
  }, [queryClient]);

  // Fetch tags for sidebar
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    staleTime: 60 * 1000, // 1 minute
    initialData: [] as Tag[],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Define navigation items
  const navItems = [
    { path: "/", label: "Dashboard", icon: <Home className="w-5 h-5" /> },
    {
      path: "/notes",
      label: "All Notes",
      icon: <StickyNote className="w-5 h-5" />,
    },
    {
      path: "/links",
      label: "Saved Links",
      icon: <LinkIcon className="w-5 h-5" />,
    },
    {
      path: "/tags",
      label: "Manage Tags",
      icon: <TagIcon className="w-5 h-5" />,
    },
    {
      path: "/graph",
      label: "Knowledge Graph",
      icon: <Network className="w-5 h-5" />,
    },
    {
      path: "/search",
      label: "Smart Search",
      icon: <Search className="w-5 h-5" />,
    },
    {
      path: "/daily-prompts",
      label: "Daily Prompts",
      icon: <Lightbulb className="w-5 h-5" />,
    },
  ];

  // Check if a navigation item is active
  const isNavItemActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  // Check if a tag is currently selected
  const isTagSelected = (tagId: number) => {
    const currentParams = new URLSearchParams(location.split("?")[1] || "");
    return currentParams.get("tagId") === tagId.toString();
  };

  return (
    <div
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      } ${className}`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white transition-colors duration-200">
            <Network className="w-4 h-4" />
          </div>
          {!collapsed && (
            <h1 className="ml-3 font-semibold text-lg text-gray-800">
              Morpheus
            </h1>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-primary transition-colors duration-200"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search Box */}
      {!collapsed && (
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-9 text-sm bg-gray-50 border-gray-200 focus:border-primary transition-colors duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          {!collapsed && (
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              NAVIGATION
            </h2>
          )}
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <div
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    isNavItemActive(item.path)
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {item.icon}
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        {!collapsed && (
          <div className="px-4 py-2 mt-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                TOP TAGS
              </h2>
              <Link to="/tags">
                <span className="text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer transition-colors duration-200">
                  All Tags
                </span>
              </Link>
            </div>

            {isLoadingTags ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : tags && tags.length > 0 ? (
              <div className="space-y-1">
                {tags
                  .sort((a: Tag, b: Tag) => (b.count || 0) - (a.count || 0))
                  .map((tag: Tag) => (
                    <Link key={tag.id} to={`/notes?tagId=${tag.id}`}>
                      <div
                        className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 ${
                          isTagSelected(tag.id)
                            ? "bg-primary/10 text-primary"
                            : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                        }`}
                      >
                        <div className="flex items-center">
                          <span
                            className={`w-2 h-2 rounded-full mr-3`}
                            style={{ backgroundColor: tag.color }}
                          ></span>
                          <span>{tag.name}</span>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {tag.count || 0}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-2 text-center">
                No tags found
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center transition-colors duration-200">
            <User className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">User</p>
              <p className="text-xs text-gray-500">user@example.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
