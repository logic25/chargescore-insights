import { BarChart3, Zap, TrendingUp, FileText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const items = [
  { id: "waterfall", title: "Portfolio Waterfall", icon: BarChart3 },
  { id: "chargescore", title: "ChargeRank (Stall Sizer)", icon: Zap },
  { id: "documents", title: "Documents", icon: FileText },
  { id: "exit", title: "Exit Scenarios", icon: TrendingUp, disabled: true },
];

export default function PortfolioSidebar({ activeTab, onTabChange }: Props) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-navy text-navy-foreground pt-4">
        {!collapsed && (
          <div className="px-4 pb-3 border-b border-border/20">
            <h2 className="text-sm font-heading font-bold text-navy-foreground">AR Spark Energy</h2>
            <p className="text-[10px] text-navy-foreground/60">Powered by ChargeRank</p>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="text-navy-foreground/50 text-[10px]">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => !item.disabled && onTabChange(item.id)}
                    className={`${activeTab === item.id ? 'bg-primary/20 text-primary' : 'text-navy-foreground/80 hover:bg-navy-card hover:text-navy-foreground'} ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="text-xs">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
