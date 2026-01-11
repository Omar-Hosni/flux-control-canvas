import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WorkflowApp from "./pages/WorkflowApp";
import SimpleTextToImagePage from "./pages/SimpleTextToImagePage";
import { modelPreloader } from "./services/ModelPreloader";

const queryClient = new QueryClient();

// Preload models on app startup
const preloadModels = () => {
  console.log('[App] Starting model preload on app launch...');
  modelPreloader.preloadAll().then(() => {
    console.log('[App] Model preloading complete!');
  });
};

// Start preloading immediately when this module loads
preloadModels();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/simple" element={<SimpleTextToImagePage />} />
          <Route path="/workflow" element={<WorkflowApp />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
