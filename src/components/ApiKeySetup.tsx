import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
}

export const ApiKeySetup = ({ onApiKeySet }: ApiKeySetupProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setIsValidating(true);
    
    try {
      // Basic validation - just check if it looks like an API key
      if (apiKey.length < 10) {
        throw new Error('Invalid API key format');
      }
      
      onApiKeySet(apiKey);
      toast.success('API key set successfully!');
    } catch (error) {
      toast.error('Invalid API key. Please check and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 bg-ai-surface border-border shadow-card">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full bg-gradient-primary mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome to Runware AI
          </h1>
          <p className="text-muted-foreground">
            Enter your API key to start generating images with ControlNet
          </p>
        </div>

        <Alert className="mb-6 bg-ai-surface-elevated border-border">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Get your API key from{' '}
            <a
              href="https://runware.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              runware.ai
              <ExternalLink className="w-3 h-3" />
            </a>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium">
              Runware API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-ai-surface-elevated border-border focus:border-primary/50"
              required
            />
          </div>

          <Button
            type="submit"
            variant="ai"
            size="lg"
            className="w-full"
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Set API Key
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Your API key is stored locally and never sent to our servers
          </p>
        </div>
      </Card>
    </div>
  );
};