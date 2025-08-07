import { useState, useEffect } from 'react';
import { WorkflowEditor } from '../components/workflow/WorkflowEditor';
import { ApiKeySetup } from '../components/ApiKeySetup';
import { RunwareService } from '../services/RunwareService';
import { useWorkflowStore } from '../stores/workflowStore';

const WorkflowApp = () => {
  const [apiKey, setApiKey] = useState<string | null>("J9GGKxXu8hDhbW1mXOPaNHBH8S48QnhT");
  const { setRunwareService } = useWorkflowStore();

  useEffect(() => {
    if (apiKey) {
      console.log('Creating RunwareService with API key');
      const service = new RunwareService(apiKey);
      setRunwareService(service);
    }
  }, [apiKey, setRunwareService]);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    localStorage.setItem('runware_api_key', key);
  };

  if (!apiKey) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  return <WorkflowEditor />;
};

export default WorkflowApp;