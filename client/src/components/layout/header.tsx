import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Settings,
  LogOut,
  Bell,
  Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

import { Activity, User as UserType, Asset } from "@shared/schema";
import { Clock } from "lucide-react";


// Component for the notification dropdown in the header
const NotificationDropdown = () => {
  // Fetch activities data with auto-refresh
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities");
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      return response.json();
    },
    staleTime: 500, // 0.5 seconds
    refetchInterval: 1000 * 3, // Refetch every 3 seconds
    refetchIntervalInBackground: true, // Continue refetching in background
    refetchOnWindowFocus: true,
  });

  // Fetch users for name lookup
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch assets for details
  const { data: assets = [] } = useQuery({
    queryKey: ['/api/assets'],
    staleTime: 1000 * 5, // 5 seconds
    refetchInterval: 1000 * 5, // Refetch every 5 seconds
  });

  const [, setLocation] = useLocation();

  const getUserName = (userId: number | null | undefined) => {
    if (userId === null || userId === undefined || !users) return "System";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const getAssetDetails = (itemId: number, itemType: string) => {
    if (itemType === 'asset') {
      const asset = assets.find((a: any) => a.id === itemId);
      return asset ? {
        name: asset.name,
        tag: asset.assetTag,
        category: asset.category
      } : null;
    }
    return null;
  };

  const getNotificationColor = (action: string) => {
    switch (action) {
      case "checkout":
        return "blue-500";
      case "checkin":
        return "green-500";
      case "create":
        return "purple-500";
      case "update":
        return "yellow-500";
      case "delete":
        return "red-500";
      default:
        return "gray-500";
    }
  };

  const getNotificationTitle = (activity: Activity) => {
    switch (activity.action) {
      case 'checkout':
        return "Asset Checked Out";
      case 'checkin':
        return "Asset Checked In";
      case 'create':
        return `New ${activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)} Created`;
      case 'update':
        return `${activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)} Updated`;
      case 'delete':
        return `${activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)} Deleted`;
      default:
        return `${activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} Action`;
    }
  };

  const getNotificationDescription = (activity: Activity) => {
    const user = getUserName(activity.userId);
    const assetDetails = getAssetDetails(activity.itemId, activity.itemType);

    switch (activity.action) {
      case 'checkout':
        return assetDetails
          ? `${user} checked out ${assetDetails.name} (${assetDetails.tag})`
          : `${user} checked out ${activity.itemType} #${activity.itemId}`;
      case 'checkin':
        return assetDetails
          ? `${user} checked in ${assetDetails.name} (${assetDetails.tag})`
          : `${user} checked in ${activity.itemType} #${activity.itemId}`;
      case 'create':
        return assetDetails
          ? `${user} created new asset: ${assetDetails.name} (${assetDetails.tag})`
          : `${user} created new ${activity.itemType}: ${activity.notes}`;
      case 'update':
        return assetDetails
          ? `${user} updated ${assetDetails.name} (${assetDetails.tag})`
          : `${user} updated ${activity.itemType}: ${activity.notes}`;
      case 'delete':
        return `${user} deleted ${activity.itemType}: ${activity.notes}`;
      default:
        return `${user}: ${activity.notes}`;
    }
  };

  const getNotificationTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = Math.round((now.getTime() - past.getTime()) / 1000);

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const handleNotificationClick = (activity: Activity) => {
    // Navigate to relevant page based on activity type
    if (activity.itemType === 'asset') {
      setLocation(`/assets/${activity.itemId}`);
    } else if (activity.itemType === 'user') {
      setLocation(`/users/${activity.itemId}`);
    } else if (activity.itemType === 'component') {
      setLocation('/components');
    } else if (activity.itemType === 'license') {
      setLocation('/licenses');
    } else {
      setLocation('/activities');
    }
  };

  // Show recent activities as notifications (limit to 10 most recent)
  const recentActivities = activities?.slice(0, 10) || [];
  const notificationCount = recentActivities.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {notificationCount > 0 && (
              <Badge variant="secondary" className="text-xs">{notificationCount} new</Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-3 hover:bg-muted/50 cursor-pointer border-b"
                onClick={() => handleNotificationClick(activity)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 bg-${getNotificationColor(activity.action)} rounded-full mt-2 flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{getNotificationTitle(activity)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{getNotificationDescription(activity)}</p>
                    <p className="text-xs text-muted-foreground mt-1"><Clock className="inline w-3 h-3 mr-1" />{getNotificationTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-muted-foreground">No new notifications</div>
          )}
        </div>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => setLocation("/notifications")}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


interface HeaderProps {
  onMenuToggle?: () => void;
  onSidebarToggle?: () => void;
}

export function Header({ onMenuToggle, onSidebarToggle }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const response = await fetch('/api/me');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false
  });

  const handleLogout = async () => {
    await logout();
  };

  const handleProfile = () => {
    setLocation("/profile");
  };

  const handleSettings = () => {
    setLocation("/settings");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 w-full">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle || onMenuToggle}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <span className="text-sm text-muted-foreground hidden md:inline">IT Asset Management System</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar} alt={user?.username} />
                  <AvatarFallback>
                    {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <Badge variant="secondary" className="w-fit mt-1">
                      {user.role}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfile}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Header;