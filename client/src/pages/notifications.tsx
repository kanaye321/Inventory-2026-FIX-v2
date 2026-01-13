
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Activity, User, Asset } from "@shared/schema";
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock,
  Trash2,
  Settings,
  BoxIcon,
  PlusIcon,
  PencilIcon,
  UserIcon
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
  category: 'assets' | 'system' | 'inventory' | 'users';
  activityId?: number;
  userId?: number;
  itemType?: string;
  itemId?: number;
}

export default function Notifications() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Query all activities to create notifications with real-time updates
  const { data: activities = [], isLoading: activitiesLoading, refetch: refetchActivities } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      console.log('Fetching activities for notifications...');
      const response = await fetch('/api/activities');
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      console.log('Activities fetched:', data?.length || 0, 'activities');
      return data;
    },
    staleTime: 0, // Always consider data stale
    refetchInterval: 1000, // Refetch every 1 second for real-time updates
    refetchIntervalInBackground: true, // Continue refetching in background
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Query all users to map IDs to names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });

  // Query all assets to get detailed info
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    queryFn: async () => {
      const response = await fetch('/api/assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      return response.json();
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 15, // Refetch every 15 seconds
  });

  const getUserName = (userId: number | null | undefined) => {
    if (userId === null || userId === undefined || !users) return "System";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const getAssetDetails = (itemId: number, itemType: string) => {
    if (itemType === 'asset') {
      const asset = assets.find(a => a.id === itemId);
      return asset ? {
        name: asset.name,
        tag: asset.assetTag,
        category: asset.category
      } : null;
    }
    return null;
  };

  // Convert activities to notifications
  const convertActivityToNotification = (activity: Activity): Notification => {
    const user = getUserName(activity.userId);
    const assetDetails = getAssetDetails(activity.itemId, activity.itemType);
    
    let title = "";
    let message = "";
    let type: 'info' | 'warning' | 'success' | 'error' = 'info';
    let category: 'assets' | 'system' | 'inventory' | 'users' = 'system';

    switch (activity.action) {
      case 'checkout':
        title = "Asset Checked Out";
        message = assetDetails 
          ? `${user} checked out ${assetDetails.name} (${assetDetails.tag})`
          : `${user} checked out ${activity.itemType} #${activity.itemId}`;
        type = 'info';
        category = 'assets';
        break;
      
      case 'checkin':
        title = "Asset Checked In";
        message = assetDetails 
          ? `${user} checked in ${assetDetails.name} (${assetDetails.tag})`
          : `${user} checked in ${activity.itemType} #${activity.itemId}`;
        type = 'success';
        category = 'assets';
        break;
      
      case 'create':
        title = `New ${activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)} Created`;
        message = assetDetails 
          ? `${user} created new asset: ${assetDetails.name} (${assetDetails.tag})`
          : `${user} created new ${activity.itemType}: ${activity.notes}`;
        type = 'success';
        category = activity.itemType === 'asset' ? 'assets' : activity.itemType === 'user' ? 'users' : 'inventory';
        break;
      
      case 'update':
        title = `${activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)} Updated`;
        message = assetDetails 
          ? `${user} updated ${assetDetails.name} (${assetDetails.tag})`
          : `${user} updated ${activity.itemType}: ${activity.notes}`;
        type = 'info';
        category = activity.itemType === 'asset' ? 'assets' : activity.itemType === 'user' ? 'users' : 'inventory';
        break;
      
      case 'delete':
        title = `${activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)} Deleted`;
        message = `${user} deleted ${activity.itemType}: ${activity.notes}`;
        type = 'warning';
        category = activity.itemType === 'asset' ? 'assets' : activity.itemType === 'user' ? 'users' : 'inventory';
        break;
      
      default:
        title = `${activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} Action`;
        message = `${user}: ${activity.notes}`;
        type = 'info';
        category = 'system';
    }

    return {
      id: `activity-${activity.id}`,
      title,
      message,
      type,
      timestamp: activity.timestamp,
      read: readNotifications.has(`activity-${activity.id}`),
      category,
      activityId: activity.id,
      userId: activity.userId,
      itemType: activity.itemType,
      itemId: activity.itemId
    };
  };

  // Convert activities to notifications (most recent first)
  const notifications = activities
    .filter(activity => activity && activity.id) // Filter out any invalid activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100) // Limit to 100 most recent activities for better coverage
    .map(convertActivityToNotification)
    .filter(notification => notification && notification.id); // Filter out any invalid notifications

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-l-amber-500 bg-amber-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifications(new Set(allIds));
  };

  const deleteNotification = (id: string) => {
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate to relevant page based on notification type and data
    if (notification.category === 'assets' && notification.itemType === 'asset' && notification.itemId) {
      setLocation(`/assets/${notification.itemId}`);
    } else if (notification.category === 'users' && notification.itemType === 'user' && notification.itemId) {
      setLocation(`/users/${notification.itemId}`);
    } else if (notification.category === 'assets') {
      setLocation('/assets');
    } else if (notification.category === 'users') {
      setLocation('/users');
    } else if (notification.category === 'inventory') {
      setLocation('/components');
    } else {
      setLocation('/activities');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "unread") return matchesSearch && !notification.read;
    if (activeTab === "read") return matchesSearch && notification.read;
    return matchesSearch && notification.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notifications" 
        description={`Manage your system notifications and alerts • ${activities.length} total activities`}
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetchActivities()}
            disabled={activitiesLoading}
          >
            <Bell className="h-4 w-4 mr-2" />
            {activitiesLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" onClick={() => setLocation("/settings")}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Bell className="h-3 w-3" />
          {unreadCount} unread
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {activitiesLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading notifications from activities...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Fetching real-time data from the server
                </p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm 
                    ? "Try adjusting your search criteria" 
                    : activities.length === 0 
                      ? "No activities have been recorded yet. Start by creating assets, users, or performing actions to see notifications here." 
                      : "You're all caught up!"}
                </p>
                {activities.length === 0 && (
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => setLocation("/assets")}
                  >
                    Go to Assets to Start
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`border-l-4 transition-all hover:shadow-md cursor-pointer ${
                    getTypeColor(notification.type)
                  } ${!notification.read ? 'ring-2 ring-blue-100' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getTypeIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium truncate ${!notification.read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 break-words">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">{formatTimestamp(notification.timestamp)}</span>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {notification.category}
                            </Badge>
                            {notification.activityId && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                ID: {notification.activityId}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
