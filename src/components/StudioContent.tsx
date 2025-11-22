import React from 'react';
import { Card } from '@/components/ui/card';
import { ResultsGallery } from '@/components/ResultsGallery';
import { PreprocessPreview } from '@/components/PreprocessPreview';
import { GenerationSettings } from '@/components/GenerationSettings';
import { ImageUpload } from '@/components/ImageUpload';
import { ControlNetSelector } from '@/components/ControlNetSelector';
import { LiveEdits } from '@/components/LiveEdits';
import { RunwareService, type PreprocessedImage, type GeneratedImage } from '@/services/RunwareService';

interface StudioContentProps {
  activeTab: string;
  runwareService: RunwareService | null;
  children: React.ReactNode;
}

export function StudioContent({ activeTab, runwareService, children }: StudioContentProps) {
  return (
    <div className="w-full">
      {children}
    </div>
  );
}
