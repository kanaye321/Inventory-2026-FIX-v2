import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  FileText, 
  Activity, 
  Key,
  ChevronLeft,
  ChevronRight,
  MonitorSpeaker,
  Cpu,
  HardDrive,
  Wrench,
  BookOpen,
  ChevronDown,
  Database,
  UserCog,
  Shield,
  BarChart,
  Network,
  Zap,
  HelpCircle,
  FileQuestion,
  Phone,
  Mail, // Added Mail import
  Globe,
  Computer,
  Router,
  Server,
  Wifi,
  Cloud,
  Tablet,
  Smartphone,
  Gamepad2,
  Headphones,
  Keyboard,
  Mouse,
  Printer,
  Scanner,
  Camera,
  Projector,
  Webcam,
  Microphone,
  ShoppingCart,
  Menu,
  X,
  BarChart3,
  Monitor,
  ExternalLink,
  Lock,
  Home, // Added Home icon
  MailCheck // Import MailCheck icon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Dashboard
const dashboardItems = [
  { 
    title: "Dashboard", 
    icon: LayoutDashboard, 
    href: "/",
    badge: null
  },
  { 
    title: "New Dashboard", 
    icon: BarChart3, 
    href: "/dashboard-new",
    badge: "New"
  },
];

// Asset Management
const assetItems = [
  { 
    title: "Assets", 
    icon: Package, 
    href: "/assets",
    badge: null
  },
  { 
    title: "Components", 
    icon: Cpu, 
    href: "/components",
    badge: null
  },
  { 
    title: "Accessories", 
    icon: Wrench, 
    href: "/accessories",
    badge: null
  },
  { 
    title: "Consumables", 
    icon: ShoppingCart, 
    href: "/it-equipment",
    badge: null
  },
  {
    title: "Monitor Inventory",
    icon: Monitor,
    href: "/monitor-inventory",
    badge: null
  }
];

// Users & Licenses
const userLicenseItems = [
  { 
    title: "Users", 
    icon: Users, 
    href: "/users",
    badge: null
  },
  { 
    title: "Licenses", 
    icon: FileText, 
    href: "/licenses",
    badge: null
  },
];

// Cloud & Virtual Infrastructure
const cloudInfraItems = [
  {
    title: "Azure Inventory",
    icon: Cloud,
    href: "/azure-inventory",
    badge: null,
  },
  {
    title: "GCP Inventory",
    icon: Globe,
    href: "/gcp-inventory",
    badge: null,
  },
  {
    title: "AWS Inventory",
    icon: Cloud,
    href: "/aws-inventory",
    badge: null,
  },
  { 
    title: "VM Inventory", 
    icon: Server, 
    href: "/vm-inventory",
    badge: null
  },
  { 
    title: "Servers Monitoring", 
    icon: MonitorSpeaker, 
    href: "/servers-monitoring",
    badge: null
  },
];

// Network & Monitoring
const networkMonitoringItems = [
  { 
    title: "Network Discovery", 
    icon: Network, 
    href: "/network-discovery",
    badge: null
  },
  { 
    title: "Discovery Dashboard", 
    icon: BarChart3, 
    href: "/network-discovery-dashboard",
    badge: null
  },
  { 
    title: "System Monitoring", 
    icon: Activity, 
    href: "/monitoring",
    badge: null
  },
];

// Security & Compliance
const securityItems = [
  { 
    title: "BitLocker Keys", 
    icon: Key, 
    href: "/bitlocker-keys",
    badge: null
  },
  { 
    title: "IAM Accounts", 
    icon: Shield, 
    href: "/iam-accounts",
    badge: null
  },
];

// Reports & Analytics
const reportingItems = [
  { 
    title: "Activity Log", 
    icon: Activity, 
    href: "/activities",
    badge: null
  },
  { 
    title: "Reports", 
    icon: BarChart, 
    href: "/reports",
    badge: null
  },
  { 
    title: "Advanced Reports", 
    icon: FileText, 
    href: "/reports-secondary",
    badge: null
  },
  { 
    title: "JIRA Dashboard", 
    icon: ExternalLink, 
    href: "/jira-dashboard",
    badge: null
  },
];

const adminMenuItems = [
  { 
    title: "Account Management", 
    icon: UserCog, 
    href: "/admin/account-management",
    badge: null
  },
  { 
    title: "User Management", 
    icon: Shield, 
    href: "/user-management",
    badge: null
  },
  { 
    title: "Database", 
    icon: Database, 
    href: "/admin/database",
    badge: null
  },
  { 
    title: "System Setup", 
    icon: Settings, 
    href: "/admin/system-setup",
    badge: null
  },
  { 
    title: "JIRA Settings", 
    icon: Zap, 
    href: "/admin/jira-settings",
    badge: null
  },
  { 
    title: "System Logs", 
    icon: FileText, 
    href: "/admin/system-logs",
    badge: null
  },
  { 
    title: "Email Notifications", 
    icon: Mail, 
    href: "/admin/email-notifications",
    badge: null
  },
  { 
    title: "Page Builder", 
    icon: FileText, 
    href: "/admin/page-builder",
    badge: "New"
  },
];

const helpMenuItems = [
  { 
    title: "User Manual", 
    icon: BookOpen, 
    href: "/user-manual",
    badge: null
  },
  { 
    title: "Report an Issue", 
    icon: HelpCircle, 
    href: "/report-issue",
    badge: null
  },
  { 
    title: "Settings", 
    icon: Settings, 
    href: "/settings",
    badge: null
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

// Helper component to render a section of the sidebar
function SidebarSection({ title, items, isCollapsed }: { title: string; items: any[]; isCollapsed: boolean }) {
  return (
    <>
      {!isCollapsed && (
        <div className="px-2 py-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
        </div>
      )}
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          isActive={false} // This will be set by the parent component
          isCollapsed={isCollapsed}
        />
      ))}
    </>
  );
}


function Sidebar({ isCollapsed = false, onToggle, className = "" }: SidebarProps) {
  const [location] = useLocation();
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [isCustomPagesExpanded, setIsCustomPagesExpanded] = useState(false);

  // Fetch user data to check permissions
  const { data: user } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const response = await fetch('/api/me', {
        credentials: 'include',
      });
      if (!response.ok) {
        return null;
      }
      const result = await response.json();
      return result.user || result;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch custom pages
  const { data: customPages } = useQuery({
    queryKey: ['/api/page-builder/pages'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/page-builder/pages');
      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  });

  const isAdmin = user?.isAdmin === true;

  return (
    <div className={cn(
      "flex flex-col h-full border-r bg-background transition-all duration-200",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center p-4",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Animated pulse indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              {/* Main icon with gradient background */}
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                <Database className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                SRPH-MIS
              </h2>
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                Asset Management
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="relative">
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
              <Database className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (onToggle) {
              onToggle();
            }
          }}
          className="h-9 w-9 hover:bg-muted/50 transition-colors"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 py-2">
          {/* Dashboard */}
          <SidebarSection title="Overview" items={dashboardItems} isCollapsed={isCollapsed} />

          {/* Asset Management */}
          <SidebarSection title="Asset Management" items={assetItems} isCollapsed={isCollapsed} />

          {/* Users & Licenses */}
          <SidebarSection title="Users & Licenses" items={userLicenseItems} isCollapsed={isCollapsed} />

          {/* Cloud & Virtual Infrastructure */}
          <SidebarSection title="Cloud & Virtual" items={cloudInfraItems} isCollapsed={isCollapsed} />

          {/* Network & Monitoring */}
          <SidebarSection title="Network & Monitoring" items={networkMonitoringItems} isCollapsed={isCollapsed} />

          {/* Security & Compliance */}
          <SidebarSection title="Security" items={securityItems} isCollapsed={isCollapsed} />

          {/* Reports & Analytics */}
          <SidebarSection title="Reports & Analytics" items={reportingItems} isCollapsed={isCollapsed} />

          {/* Approval Monitoring */}
          <SidebarSection 
            title="Approval Monitoring" 
            items={[
              {
                title: "Approval Monitoring",
                icon: FileText,
                href: "/approval-monitoring",
                badge: null,
              },
            ]} 
            isCollapsed={isCollapsed} 
          />

          {/* Custom Pages Section */}
          {customPages && customPages.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-2">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full px-2 py-1 h-8",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                  onClick={() => setIsCustomPagesExpanded(!isCustomPagesExpanded)}
                >
                  <FileText className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">Custom Pages</span>
                      {isCustomPagesExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </Button>
                {isCustomPagesExpanded && !isCollapsed && (
                  <div className="ml-4 space-y-1 mt-1">
                    {customPages.map((page: any) => {
                      const slug = page.pageSlug || page.page_slug;
                      const name = page.pageName || page.page_name;
                      return (
                        <SidebarItem
                          key={slug}
                          item={{
                            title: name,
                            icon: FileText,
                            href: `/custom/${slug}`,
                            badge: null,
                          }}
                          isActive={location === `/custom/${slug}`}
                          isCollapsed={false}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tools Section */}
          <>
            <Separator className="my-2" />
            <div className="px-2 py-2">
              <Button
                variant="ghost"
                className={cn(
                  "w-full px-2 py-1 h-8",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
                onClick={() => { /* No expansion needed for this item */ }}
              >
                <Mail className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && (
                  <Link href="/email-bulk-sender">
                    <span className="flex-1 text-left">Email Bulk Sender</span>
                  </Link>
                )}
              </Button>
            </div>
          </>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-2">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full px-2 py-1 h-8",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                  onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                >
                  <Shield className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">Admin</span>
                      {isAdminExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </Button>
                {isAdminExpanded && !isCollapsed && (
                  <div className="ml-4 space-y-1 mt-1">
                    {adminMenuItems.map((item) => (
                      <SidebarItem
                        key={item.href}
                        item={item}
                        isActive={location.pathname === item.href}
                        isCollapsed={false}
                      />
                    ))}
                    <Button
                      variant={location.pathname === "/admin/data-encryption" ? "secondary" : "ghost"}
                      className="w-full justify-start px-3 py-2 h-auto"
                      asChild
                    >
                      <Link to="/admin/data-encryption">
                        <Lock className="h-4 w-4 mr-3" />
                        Data Encryption
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Help Section */}
          <Separator className="my-2" />
          <div className="px-2 py-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full px-2 py-1 h-8",
                isCollapsed ? "justify-center" : "justify-start"
              )}
              onClick={() => setIsHelpExpanded(!isHelpExpanded)}
            >
              <BookOpen className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Help</span>
                  {isHelpExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </Button>
            {isHelpExpanded && !isCollapsed && (
              <div className="ml-4 space-y-1 mt-1">
                {helpMenuItems.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    isActive={location.pathname === item.href}
                    isCollapsed={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default Sidebar;
export { Sidebar };

interface SidebarItemProps {
  item: {
    title: string;
    icon: any;
    href: string;
    badge: string | null;
  };
  isActive: boolean;
  isCollapsed: boolean;
}

function SidebarItem({ item, isActive, isCollapsed }: SidebarItemProps) {
  const { title, icon: Icon, href, badge } = item;

  const handleClick = (e: React.MouseEvent) => {
    console.log(`Sidebar navigation clicked: ${href}`);
    // Don't prevent default since Link handles navigation
  };

  return (
    <Link href={href} className="w-full block" onClick={handleClick}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full px-2 py-1 h-8 border-0 cursor-pointer",
          isCollapsed ? "justify-center" : "justify-start",
          isActive && "bg-secondary"
        )}
        type="button"
      >
        <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{title}</span>
            {badge && (
              <Badge variant="secondary" className="ml-auto">
                {badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    </Link>
  );
}