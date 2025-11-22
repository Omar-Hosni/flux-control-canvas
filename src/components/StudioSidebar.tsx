import { Zap, ImageIcon, Palette, Wand2, Upload, MessageSquare, Sparkles } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from '@/lib/utils';

interface StudioSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  {
    title: "Generation",
    items: [
      { id: "texttoimage", label: "Text-to-Image", icon: Zap },
      { id: "img2img", label: "Image-to-Image", icon: ImageIcon },
      { id: "flux", label: "Flux Kontext", icon: Palette },
      { id: "merger", label: "Merger (Re-mix)", icon: Palette },
    ]
  },
  {
    title: "Tools",
    items: [
      { id: "tools", label: "Image Tools", icon: Wand2 },
      { id: "liveedits", label: "Live Edits", icon: Sparkles },
      { id: "caption", label: "Caption", icon: MessageSquare },
    ]
  },
  {
    title: "Advanced",
    items: [
      { id: "modelupload", label: "Model Upload", icon: Upload },
    ]
  }
];

export function StudioSidebar({ activeTab, onTabChange }: StudioSidebarProps) {
  return (
    <Sidebar className="border-r border-border">
      <SidebarContent>
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Runware AI Studio
          </h2>
        </div>
        
        {navItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="px-6 text-xs uppercase tracking-wider text-muted-foreground">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full justify-start gap-3 px-6 py-3 transition-all",
                        activeTab === item.id
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
