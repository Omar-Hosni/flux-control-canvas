import { useState, useEffect } from 'react';
import { SimpleTextToImage } from '@/components/SimpleTextToImage';
import { ApiKeySetup } from '@/components/ApiKeySetup';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RunwareService } from '@/services/RunwareService';
import { useWorkflowStore } from '@/stores/workflowStore';

const SimpleTextToImagePage = () => {
  const [apiKey, setApiKey] = useState<string | null>("v8r2CamVZNCtye7uypGvHfQOh48ZQQaZ");
  const { setRunwareService, runwareService } = useWorkflowStore();

  useEffect(() => {
    // Try to get API key from localStorage first, otherwise use default
    const savedApiKey = localStorage.getItem('runware_api_key');
    const keyToUse = savedApiKey || "v8r2CamVZNCtye7uypGvHfQOh48ZQQaZ";
    setApiKey(keyToUse);
    const service = new RunwareService(keyToUse);
    setRunwareService(service);
  }, [setRunwareService]);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    localStorage.setItem('runware_api_key', key);
    const service = new RunwareService(key);
    setRunwareService(service);
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-ai-surface">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Studio
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Simple Text-to-Image
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Generate images without ControlNet preprocessing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Setup */}
        <div className="max-w-2xl mx-auto px-4 py-12">
          <ApiKeySetup onApiKeySet={handleApiKeySet} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-ai-surface">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Studio
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Simple Text-to-Image
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate images without ControlNet preprocessing
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <SimpleTextToImage />
      </div>
    </div>
  );
};

export default SimpleTextToImagePage;