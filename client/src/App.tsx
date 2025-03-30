import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import NotesPage from "@/pages/notes/index";
import NotePage from "@/pages/notes/[id]";
import NoteEditorPage from "@/pages/notes/editor";
import LinksPage from "@/pages/links/index";
import LinkPage from "@/pages/links/[id]";
import GraphPage from "@/pages/graph";
import DailyPromptsPage from "@/pages/daily-prompts";
import TagsPage from "@/pages/tags/index";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/notes" component={NotesPage} />
      <Route path="/notes/new" component={NoteEditorPage} />
      <Route path="/notes/:id/edit" component={NoteEditorPage} />
      <Route path="/notes/:id" component={NotePage} />
      <Route path="/links" component={LinksPage} />
      <Route path="/links/:id" component={LinkPage} />
      <Route path="/tags" component={TagsPage} />
      <Route path="/graph" component={GraphPage} />
      <Route path="/daily-prompts" component={DailyPromptsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
