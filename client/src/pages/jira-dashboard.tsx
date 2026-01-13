import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RefreshCw, 
  AlertCircle, 
  Filter,
  Search,
  Settings,
  Layout,
  RotateCcw,
  Grid3X3,
  Plus,
  Download,
  Upload,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DraggableWidget, { Widget } from '@/components/dashboard/draggable-widget';
import {
  StatsOverviewWidget,
  RecentIssuesWidget,
  PriorityDistributionWidget,
  IssueTypeWidget,
  ActivityFeedWidget,
  AssigneeWorkloadWidget,
  QuickActionsWidget
} from '@/components/dashboard/jira-widgets';

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: {
    name: string;
    statusCategory: {
      name: string;
      colorName: string;
    };
  };
  priority: {
    name: string;
    iconUrl?: string;
  };
  issuetype: {
    name: string;
    iconUrl?: string;
  };
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  reporter: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
  resolutiondate?: string;
}

interface JiraStats {
  total: number;
  open: number;
  inProgress: number;
  done: number;
  byPriority: { [key: string]: number };
  byType: { [key: string]: number };
  recentlyCreated: number;
}

interface DashboardLayout {
  widgets: Widget[];
  version: number;
}

const defaultWidgets: Widget[] = [
  {
    id: 'stats-overview',
    type: 'stats',
    title: 'Statistics Overview',
    visible: true,
    position: { x: 0, y: 0 },
    size: { width: 12, height: 2 },
    refreshable: true
  },
  {
    id: 'recent-issues',
    type: 'recent-issues',
    title: 'Recent Issues',
    visible: true,
    position: { x: 0, y: 2 },
    size: { width: 8, height: 4 },
    refreshable: true,
    configurable: true,
    settings: { maxItems: 5 }
  },
  {
    id: 'priority-chart',
    type: 'priority-chart',
    title: 'Priority Distribution',
    visible: true,
    position: { x: 8, y: 2 },
    size: { width: 4, height: 4 },
    refreshable: true
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    visible: true,
    position: { x: 0, y: 6 },
    size: { width: 3, height: 3 }
  },
  {
    id: 'type-chart',
    type: 'type-chart',
    title: 'Issue Types',
    visible: true,
    position: { x: 3, y: 6 },
    size: { width: 3, height: 3 },
    refreshable: true
  },
  {
    id: 'activity-feed',
    type: 'activity-feed',
    title: 'Recent Activity',
    visible: true,
    position: { x: 6, y: 6 },
    size: { width: 3, height: 3 },
    refreshable: true,
    configurable: true,
    settings: { maxItems: 8 }
  },
  {
    id: 'assignee-breakdown',
    type: 'assignee-breakdown',
    title: 'Assignee Workload',
    visible: true,
    position: { x: 9, y: 6 },
    size: { width: 3, height: 3 },
    refreshable: true,
    configurable: true,
    settings: { maxItems: 8 }
  }
];

export default function JiraDashboard() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>({
    widgets: defaultWidgets,
    version: 1
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('jira-dashboard-layout');
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        // Migrate old layouts if needed
        if (!parsed.version || parsed.version < 1) {
          setDashboardLayout({ widgets: defaultWidgets, version: 1 });
        } else {
          setDashboardLayout(parsed);
        }
      } catch (error) {
        console.error('Failed to load saved layout:', error);
        setDashboardLayout({ widgets: defaultWidgets, version: 1 });
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = (layout: DashboardLayout) => {
    setDashboardLayout(layout);
    localStorage.setItem('jira-dashboard-layout', JSON.stringify(layout));
  };

  // Fetch JIRA settings
  const { data: jiraSettings } = useQuery({
    queryKey: ['/api/admin/jira-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/jira-settings', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Fetch JIRA issues
  const { data: jiraData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/jira-dashboard', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/jira-dashboard', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch JIRA data');
      }
      return response.json();
    },
    enabled: jiraSettings?.enabled,
    refetchInterval: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
    toast({
      title: "Refreshing JIRA Data",
      description: "Fetching latest issues from JIRA...",
    });
  };

  const resetLayout = () => {
    saveLayout({ widgets: defaultWidgets, version: 1 });
    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to default",
    });
  };

  const exportLayout = () => {
    const dataStr = JSON.stringify(dashboardLayout, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jira-dashboard-layout.json';
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Layout Exported",
      description: "Dashboard layout has been exported to file",
    });
  };

  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.widgets && Array.isArray(imported.widgets)) {
          saveLayout({ ...imported, version: imported.version || 1 });
          toast({
            title: "Layout Imported",
            description: "Dashboard layout has been imported successfully",
          });
        } else {
          throw new Error('Invalid layout format');
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import layout: Invalid format",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const newLayout = {
      ...dashboardLayout,
      widgets: dashboardLayout.widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, visible: !widget.visible }
          : widget
      )
    };
    saveLayout(newLayout);
  };

  const refreshWidget = (widgetId: string) => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Widget Refreshed",
      description: `Refreshing ${dashboardLayout.widgets.find(w => w.id === widgetId)?.title}...`,
    });
  };

  const resizeWidget = (widgetId: string, size: { width: number; height: number }) => {
    const newLayout = {
      ...dashboardLayout,
      widgets: dashboardLayout.widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, size }
          : widget
      )
    };
    saveLayout(newLayout);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setDashboardLayout(prevLayout => ({
      ...prevLayout,
      widgets: prevLayout.widgets.filter(widget => widget.id !== widgetId)
    }));
    toast({
      title: "Widget Removed",
      description: "Widget has been removed from the dashboard.",
    });
  };

  const handleConfigureWidget = (widgetId: string) => {
    toast({
      title: "Widget Configuration",
      description: `Configuration for ${widgetId} widget is not yet implemented.`,
    });
  };

  const handleAddWidget = () => {
    const availableTypes = ['stats', 'recent-issues', 'priority-chart', 'type-chart', 'activity-feed', 'assignee-breakdown', 'quick-actions'];
    const enabledTypes = dashboardLayout.widgets.map(w => w.type);
    const missingTypes = availableTypes.filter(type => !enabledTypes.includes(type));

    if (missingTypes.length > 0) {
      const newType = missingTypes[0];
      let newWidget: Widget;
      // Assign default settings based on type
      switch(newType) {
        case 'recent-issues':
          newWidget = { id: `${newType}-${Date.now()}`, type: newType, title: 'Recent Issues', visible: true, position: { x: 0, y: 0 }, size: { width: 6, height: 3 }, refreshable: true, configurable: true, settings: { maxItems: 5 } };
          break;
        case 'activity-feed':
          newWidget = { id: `${newType}-${Date.now()}`, type: newType, title: 'Recent Activity', visible: true, position: { x: 0, y: 0 }, size: { width: 3, height: 3 }, refreshable: true, configurable: true, settings: { maxItems: 8 } };
          break;
        case 'assignee-breakdown':
          newWidget = { id: `${newType}-${Date.now()}`, type: newType, title: 'Assignee Workload', visible: true, position: { x: 0, y: 0 }, size: { width: 3, height: 3 }, refreshable: true, configurable: true, settings: { maxItems: 8 } };
          break;
        default:
          newWidget = { id: `${newType}-${Date.now()}`, type: newType, title: newType.replace('-', ' ').toUpperCase(), visible: true, position: { x: 0, y: 0 }, size: { width: 3, height: 3 }, refreshable: true };
      }
      
      setDashboardLayout(prevLayout => ({
        ...prevLayout,
        widgets: [...prevLayout.widgets, newWidget]
      }));
      toast({
        title: "Widget Added",
        description: `${newWidget.title} widget has been added to the dashboard.`,
      });
    } else {
      toast({
        title: "All Widgets Active",
        description: "All available widgets are already on the dashboard.",
        variant: "default",
      });
    }
  };

  const handleResetLayout = () => {
    saveLayout({ widgets: defaultWidgets, version: 1 });
    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to default.",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">JIRA Dashboard</h1>
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading JIRA dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!jiraSettings?.enabled) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">JIRA Dashboard</h1>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              JIRA integration is not enabled. Please configure JIRA settings first.
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.href = '/admin/jira-settings'}>
            Configure JIRA Settings
          </Button>
        </div>
      </div>
    );
  }

  const issues: JiraIssue[] = jiraData?.issues || [];
  const stats: JiraStats = jiraData?.stats || {
    total: 0,
    open: 0,
    inProgress: 0,
    done: 0,
    byPriority: {},
    byType: {},
    recentlyCreated: 0
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = searchQuery === '' || 
      issue.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.key.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      issue.status.statusCategory.name.toLowerCase() === statusFilter.toLowerCase();

    const matchesPriority = priorityFilter === 'all' || 
      issue.priority.name.toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const renderWidget = (widget: Widget) => {
    let content;
    switch (widget.type) {
      case 'stats':
        content = <StatsOverviewWidget issues={filteredIssues} stats={stats} settings={widget.settings} />;
        break;
      case 'recent-issues':
        content = <RecentIssuesWidget issues={filteredIssues} stats={stats} jiraSettings={jiraSettings} settings={widget.settings} />;
        break;
      case 'priority-chart':
        content = <PriorityDistributionWidget issues={filteredIssues} stats={stats} settings={widget.settings} />;
        break;
      case 'type-chart':
        content = <IssueTypeWidget issues={filteredIssues} stats={stats} settings={widget.settings} />;
        break;
      case 'activity-feed':
        content = <ActivityFeedWidget issues={filteredIssues} stats={stats} settings={widget.settings} />;
        break;
      case 'assignee-breakdown':
        content = <AssigneeWorkloadWidget issues={filteredIssues} stats={stats} settings={widget.settings} />;
        break;
      case 'quick-actions':
        content = <QuickActionsWidget issues={filteredIssues} stats={stats} jiraSettings={jiraSettings} settings={widget.settings} />;
        break;
      default:
        content = <div className="text-muted-foreground">Widget type "{widget.type}" not implemented</div>;
    }

    return (
      <DraggableWidget
        key={widget.id}
        widget={widget}
        isEditMode={isEditMode}
        onRemove={handleRemoveWidget}
        onConfigure={handleConfigureWidget}
        onRefresh={refreshWidget}
        onResize={resizeWidget}
      >
        {content}
      </DraggableWidget>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">JIRA Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and track JIRA issues and projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddWidget}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Layout
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Dashboard Settings</DialogTitle>
                <DialogDescription>
                  Customize your dashboard layout and widgets
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Widget Visibility</h4>
                  <div className="space-y-3">
                    {dashboardLayout.widgets.map((widget) => (
                      <div key={widget.id} className="flex items-center justify-between">
                        <Label htmlFor={widget.id} className="text-sm flex-1">
                          {widget.title}
                        </Label>
                        <Switch
                          id={widget.id}
                          checked={widget.visible}
                          onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Layout Management</h4>
                  <div className="flex gap-2">
                    <Button onClick={handleResetLayout} variant="outline" size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button onClick={exportLayout} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={importLayout}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to fetch JIRA data: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {isEditMode && (
        <Alert>
          <Grid3X3 className="h-4 w-4" />
          <AlertDescription>
            Edit mode is active. Drag widgets to rearrange them, use widget menus to configure settings, resize, or hide widgets.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Quick Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="indeterminate">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      <div 
        className="grid gap-4 transition-all duration-200"
        style={{
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gridAutoRows: 'minmax(100px, auto)'
        }}
      >
        {dashboardLayout.widgets
          .filter(widget => widget.visible)
          .map(renderWidget)}
      </div>

      {isLoading && !jiraData && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading JIRA data...</p>
        </div>
      )}
    </div>
  );
}