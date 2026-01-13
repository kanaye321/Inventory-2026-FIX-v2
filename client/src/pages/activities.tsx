
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, User, Asset } from "@shared/schema";
import { getTimeSince } from "@/lib/utils";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  HistoryIcon, 
  BoxIcon, 
  CheckIcon, 
  PlusIcon, 
  PencilIcon, 
  AlertTriangleIcon,
  UserIcon,
  BoxesIcon,
  ShieldIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  ExternalLinkIcon
} from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export default function Activities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Query all activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const response = await fetch('/api/activities');
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
  });

  // Query all users to map IDs to names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Query all assets to get detailed info
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  const getUserName = (userId: number | null | undefined) => {
    if (userId === null || userId === undefined || !users) return "System";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const getUserDepartment = (userId: number | null | undefined) => {
    if (userId === null || userId === undefined || !users) return null;
    const user = users.find(u => u.id === userId);
    return user?.department || null;
  };

  const getAssetDetails = (itemId: number, itemType: string) => {
    if (itemType === 'asset') {
      const asset = assets.find(a => a.id === itemId);
      return asset ? {
        name: asset.name,
        tag: asset.assetTag,
        model: asset.model,
        category: asset.category,
        location: asset.location
      } : null;
    }
    return null;
  };

  const getActivityIcon = (action: string, itemType: string) => {
    // First determine the background color based on the action
    let bgColorClass = "bg-gray-100 dark:bg-gray-800";
    let textColorClass = "text-gray-600 dark:text-gray-400";

    switch (action) {
      case 'checkout':
        bgColorClass = "bg-blue-100 dark:bg-blue-900/30";
        textColorClass = "text-blue-600 dark:text-blue-400";
        break;
      case 'checkin':
        bgColorClass = "bg-green-100 dark:bg-green-900/30";
        textColorClass = "text-green-600 dark:text-green-400";
        break;
      case 'create':
        bgColorClass = "bg-purple-100 dark:bg-purple-900/30";
        textColorClass = "text-purple-600 dark:text-purple-400";
        break;
      case 'update':
        bgColorClass = "bg-yellow-100 dark:bg-yellow-900/30";
        textColorClass = "text-yellow-600 dark:text-yellow-400";
        break;
      case 'delete':
        bgColorClass = "bg-red-100 dark:bg-red-900/30";
        textColorClass = "text-red-600 dark:text-red-400";
        break;
    }

    // Then determine the icon based on the item type
    let Icon = HistoryIcon;
    switch (itemType) {
      case 'asset':
        Icon = BoxIcon;
        break;
      case 'user':
        Icon = UserIcon;
        break;
      case 'license':
        Icon = ShieldIcon;
        break;
      case 'component':
      case 'accessory':
        Icon = BoxesIcon;
        break;
    }

    return (
      <div className={`h-12 w-12 rounded-full ${bgColorClass} flex items-center justify-center ring-8 ring-white dark:ring-gray-900`}>
        <Icon className={`h-6 w-6 ${textColorClass}`} />
      </div>
    );
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'checkout':
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case 'checkin':
        return "bg-green-500/10 text-green-700 dark:text-green-300";
      case 'create':
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case 'update':
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case 'delete':
        return "bg-red-500/10 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
    }
  };

  // Filter activities based on search and filters
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchTerm === "" || 
      activity.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(activity.userId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || activity.action === actionFilter;
    const matchesItemType = itemTypeFilter === "all" || activity.itemType === itemTypeFilter;
    const matchesUser = userFilter === "all" || activity.userId?.toString() === userFilter;

    return matchesSearch && matchesAction && matchesItemType && matchesUser;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Get unique values for filters
  const uniqueActions = [...new Set(activities.map(a => a.action))];
  const uniqueItemTypes = [...new Set(activities.map(a => a.itemType))];
  const uniqueUsers = [...new Set(activities.map(a => a.userId).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <Breadcrumb className="text-sm text-muted-foreground mt-1">
            <BreadcrumbItem>
              <Link href="/">Dashboard</Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              Activities
            </BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} activities
          </span>
        </div>
      </div>

      <Separator />

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={(value) => {
              setActionFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={itemTypeFilter} onValueChange={(value) => {
              setItemTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueItemTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={(value) => {
              setUserFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(userId => (
                  <SelectItem key={userId} value={userId.toString()}>
                    {getUserName(userId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setActionFilter("all");
                setItemTypeFilter("all");
                setUserFilter("all");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-8">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedActivities && paginatedActivities.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {paginatedActivities.map((activity, idx) => {
                  const assetDetails = getAssetDetails(activity.itemId, activity.itemType);
                  const userDepartment = getUserDepartment(activity.userId);
                  
                  return (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {idx < paginatedActivities.length - 1 && (
                          <span className="absolute top-6 left-6 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                        )}
                        <div className="relative flex items-start space-x-4">
                          <div className="relative">
                            {getActivityIcon(activity.action, activity.itemType)}
                          </div>
                          <div className="min-w-0 flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getActionBadgeColor(activity.action)}>
                                    {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}
                                  </Badge>
                                  <Badge variant="outline">
                                    {activity.itemType.charAt(0).toUpperCase() + activity.itemType.slice(1)}
                                  </Badge>
                                  {assetDetails && (
                                    <Badge variant="secondary">
                                      {assetDetails.tag}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                                  <Link href={`/users/${activity.userId}`} className="font-medium text-primary hover:underline">
                                    {getUserName(activity.userId)}
                                  </Link>
                                  {userDepartment && (
                                    <span className="text-muted-foreground"> ({userDepartment})</span>
                                  )}
                                  {' '}
                                  {activity.notes}
                                </div>

                                {assetDetails && (
                                  <div className="bg-white dark:bg-gray-900 rounded p-3 mt-3 border border-gray-200 dark:border-gray-600">
                                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                                      <BoxIcon className="h-4 w-4" />
                                      Asset Details
                                      <Link href={`/assets/${activity.itemId}`} className="ml-auto">
                                        <ExternalLinkIcon className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                      </Link>
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Name:</span>
                                        <span className="ml-1 font-medium">{assetDetails.name}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Model:</span>
                                        <span className="ml-1 font-medium">{assetDetails.model}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Category:</span>
                                        <span className="ml-1 font-medium">{assetDetails.category}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Location:</span>
                                        <span className="ml-1 font-medium">{assetDetails.location}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-3">
                                  <p className="text-xs text-muted-foreground">
                                    {getTimeSince(activity.timestamp)}
                                  </p>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {activity.itemType}#{activity.itemId}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12">
              <HistoryIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {activities.length === 0 ? "No activity has been recorded yet" : "No activities match your filters"}
              </p>
              {activities.length > 0 && filteredActivities.length === 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setActionFilter("all");
                    setItemTypeFilter("all");
                    setUserFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {filteredActivities.length > itemsPerPage && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
