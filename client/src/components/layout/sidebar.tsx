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
  Tag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // Extract tag ID from URL if present
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(location.split("?")[1] || "");
      const tagId = urlParams.get("tagId");
      if (tagId) {
        const numericTagId = parseInt(tagId);
        setSelectedTagId(numericTagId);
      } else {
        setSelectedTagId(null);
      }
    } catch (error) {
      console.error("Error parsing tagId:", error);
      setSelectedTagId(null);
    }
  }, [location]);

  // Define tag type
  interface Tag {
    id: number;
    name: string;
    color: string;
    count?: number;
  }

  // Fetch tags for sidebar
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    staleTime: 60 * 1000, // 1 minute
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
    { path: "/tags", label: "Manage Tags", icon: <Tag className="w-5 h-5" /> },
    {
      path: "/graph",
      label: "Knowledge Graph",
      icon: <Network className="w-5 h-5" />,
    },
    {
      path: "/daily-prompts",
      label: "Daily Prompts",
      icon: <Lightbulb className="w-5 h-5" />,
    },
  ];

  // Handle tag click
  const handleTagClick = (tagId: number) => {
    if (selectedTagId === tagId) {
      // If the tag is already selected, clear the filter
      setLocation('/notes');
    } else {
      // Otherwise, filter by the tag
      setLocation(`/notes?tagId=${tagId}`);
    }
  };

  return (
    <div
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } ${className}`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center text-white">
            <Network className="w-4 h-4" />
          </div>
          {!collapsed && <h1 className="ml-3 font-semibold text-lg">Cognos</h1>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-primary"
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
              className="pl-9 text-sm bg-gray-100 border-transparent"
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
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              NAVIGATION
            </h2>
          )}
          <div className="mt-3 space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <div
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    location.startsWith(item.path)
                      ? "bg-gray-100 text-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {item.icon}
                  {!collapsed && <span className="ml-2">{item.label}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        {!collapsed && tags && tags.length > 0 && (
          <div className="px-4 py-2 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                TAGS
              </h2>
              <Link to="/tags">
                <span className="text-xs text-primary hover:underline cursor-pointer">
                  Manage
                </span>
              </Link>
            </div>
            <div className="mt-3 space-y-1">
              {tags?.map((tag: Tag) => (
                <div
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={`flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md cursor-pointer ${
                    selectedTagId === tag.id
                      ? "bg-gray-100 text-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center">
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    ></span>
                    <span>{tag.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {tag.count || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-500">user@example.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
