import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Bug,
  CheckCircle,
  AlertCircle,
  Activity,
  BarChart3,
  GripVertical,
  Lightbulb,
  Target,
  AlertTriangle
} from 'lucide-react';

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

interface JiraMetrics {
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  closedIssues: number;
  highPriorityIssues: number;
  avgResolutionTime: number;
  issuesByType: Record<string, number>;
  issuesByPriority: Record<string, number>;
}

interface WidgetProps {
  issues: JiraIssue[];
  stats: JiraMetrics;
  jiraSettings?: any;
  settings?: any;
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'done': return 'bg-green-100 text-green-800';
    case 'indeterminate': return 'bg-blue-100 text-blue-800';
    case 'new': return 'bg-gray-100 text-gray-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

export const StatsOverviewWidget: React.FC<WidgetProps> = ({ stats }) => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Stats Overview</CardTitle>
        </div>
        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
      </div>
      <CardDescription>Overall project statistics</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm text-blue-600">Total Issues</div>
          <Bug className="h-4 w-4 text-blue-500 mx-auto mt-1" />
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <div className="text-2xl font-bold text-orange-700">{stats.open}</div>
          <div className="text-sm text-orange-600">Open</div>
          <AlertCircle className="h-4 w-4 text-orange-500 mx-auto mt-1" />
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
          <div className="text-sm text-blue-600">In Progress</div>
          <Clock className="h-4 w-4 text-blue-500 mx-auto mt-1" />
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{stats.done}</div>
          <div className="text-sm text-green-600">Completed</div>
          <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-1" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export function JiraRecentIssuesWidget({ issues = [] }: { issues?: JiraIssue[] }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'closed':
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'to do':
      case 'todo':
      case 'open':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Recent Issues</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Latest JIRA tickets and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {issues.slice(0, 5).map((issue) => (
            <div key={issue.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{issue.key}</span>
                  <Badge variant="outline" className={getStatusColor(issue.status.name)}>
                    {issue.status.name}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(issue.priority.name)}>
                    {issue.priority.name}
                  </Badge>
                </div>
                <div className="text-sm text-gray-900 mb-1 line-clamp-2">{issue.summary}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {issue.assignee ? issue.assignee.displayName : 'Unassigned'}
                  </span>
                  <span>Updated {new Date(issue.updated).toLocaleDateString()}</span>
                </div>
              </div>
              {issue.jiraSettings && (
                <Button variant="ghost" size="sm" className="flex-shrink-0" asChild>
                  <a
                    href={`${issue.jiraSettings.webhookUrl.replace('/rest/api/2/issue', '')}/browse/${issue.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


export function JiraProgressWidget({ metrics }: { metrics?: JiraMetrics }) {
  const defaultMetrics: JiraMetrics = {
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    closedIssues: 0,
    highPriorityIssues: 0,
    avgResolutionTime: 0,
    issuesByType: {},
    issuesByPriority: {}
  };

  const data = metrics || defaultMetrics;
  const completionRate = data.totalIssues > 0 ? Math.round((data.closedIssues / data.totalIssues) * 100) : 0;
  const inProgressRate = data.totalIssues > 0 ? Math.round((data.inProgressIssues / data.totalIssues) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Project Progress</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Overall project completion status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-4 h-full">
          <div className="relative w-32 h-32">
            <Progress
              value={completionRate}
              indicatorColor="bg-purple-600"
              className="w-32 h-32 [&>circle:last-child]:stroke-purple-300"
            />
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-purple-700">
              {completionRate}%
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">In Progress:</p>
            <p className="text-lg font-semibold text-blue-700">{inProgressRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Completed:</p>
            <p className="text-lg font-semibold text-green-700">{completionRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function JiraPriorityWidget({ metrics }: { metrics?: JiraMetrics }) {
  const defaultMetrics: JiraMetrics = {
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    closedIssues: 0,
    highPriorityIssues: 0,
    avgResolutionTime: 0,
    issuesByType: {},
    issuesByPriority: {}
  };

  const data = metrics || defaultMetrics;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">Priority Distribution</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Issues broken down by priority</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(data.issuesByPriority)
            .sort(([,a], [,b]) => b - a)
            .map(([priority, count]) => {
              const percentage = data.totalIssues > 0 ? (count / data.totalIssues) * 100 : 0;
              return (
                <div key={priority} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getPriorityColor(priority)}>
                      {priority}
                    </Badge>
                    <span className="text-sm font-medium">{count} issues</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}% of total
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
};

export function JiraTypeWidget({ metrics }: { metrics?: JiraMetrics }) {
  const defaultMetrics: JiraMetrics = {
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    closedIssues: 0,
    highPriorityIssues: 0,
    avgResolutionTime: 0,
    issuesByType: {},
    issuesByPriority: {}
  };

  const data = metrics || defaultMetrics;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg">Issue Type Distribution</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Issues broken down by type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(data.issuesByType)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => {
              const percentage = data.totalIssues > 0 ? (count / data.totalIssues) * 100 : 0;
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{type}</Badge>
                    <span className="text-sm font-medium">{count} issues</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}% of total
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
};

export function JiraQuickActionsWidget() {
  const actions = [
    {
      title: 'Create Issue',
      description: 'Create a new JIRA ticket',
      icon: <Target className="h-5 w-5" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => {
        // TODO: Implement create issue functionality
        console.log('Create issue clicked');
      }
    },
    {
      title: 'View Board',
      description: 'Open JIRA board',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => {
        // TODO: Open JIRA board in new tab
        window.open('https://your-jira-instance.atlassian.net', '_blank');
      }
    },
    {
      title: 'Reports',
      description: 'View JIRA reports',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => {
        // TODO: Navigate to reports page
        console.log('Reports clicked');
      }
    },
    {
      title: 'Settings',
      description: 'Configure JIRA integration',
      icon: <User className="h-5 w-5" />,
      color: 'bg-gray-500 hover:bg-gray-600',
      onClick: () => {
        // TODO: Navigate to JIRA settings
        window.location.href = '/admin/jira-settings';
      }
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Common JIRA operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className={`h-auto p-4 flex-col gap-2 ${action.color}`}
              onClick={action.onClick}
            >
              {action.icon}
              <span className="text-sm">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Missing widget exports that are imported in jira-dashboard.tsx
export const RecentIssuesWidget = JiraRecentIssuesWidget;
export const PriorityDistributionWidget = JiraPriorityWidget;
export const IssueTypeWidget = JiraTypeWidget;
export const QuickActionsWidget = JiraQuickActionsWidget;

export function ActivityFeedWidget({ issues = [], stats, settings }: WidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Latest JIRA activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {issues.slice(0, settings?.maxItems || 8).map((issue) => (
            <div key={issue.id} className="flex items-start gap-3 p-2 border rounded hover:bg-gray-50">
              <div className="flex-1">
                <div className="text-sm font-medium">{issue.key}</div>
                <div className="text-xs text-muted-foreground">{issue.summary}</div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(issue.updated).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AssigneeWorkloadWidget({ issues = [], stats, settings }: WidgetProps) {
  const assigneeStats = issues.reduce((acc, issue) => {
    const assignee = issue.assignee?.displayName || 'Unassigned';
    acc[assignee] = (acc[assignee] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Assignee Workload</CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </div>
        <CardDescription>Issues by assignee</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(assigneeStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, settings?.maxItems || 5)
            .map(([assignee, count]) => (
              <div key={assignee} className="flex items-center justify-between">
                <span className="text-sm font-medium">{assignee}</span>
                <Badge variant="outline">{count} issues</Badge>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}