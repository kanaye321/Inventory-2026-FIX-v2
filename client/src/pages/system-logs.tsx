
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, RefreshCw, Calendar, LogIn, LogOut, AlertTriangle, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemLogsPage() {
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const { data: logFiles = [], refetch: refetchLogs } = useQuery({
    queryKey: ['/api/logs'],
    queryFn: async () => {
      const res = await fetch('/api/logs', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    }
  });

  const { data: logContent } = useQuery({
    queryKey: ['/api/logs', selectedLog],
    queryFn: async () => {
      const res = await fetch(`/api/logs/${selectedLog}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch log content');
      return res.json();
    },
    enabled: !!selectedLog
  });

  // Get authentication logs separately
  const authLogs = logFiles.filter((file: string) => file.startsWith('auth_'));

  const downloadLog = (filename: string) => {
    if (logContent && logContent.filename === filename) {
      const blob = new Blob([logContent.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const parseAuthLog = (content: string) => {
    const lines = content.trim().split('\n');
    return lines.map(line => {
      try {
        // Try parsing as formatted log first: [timestamp] [AUTH] {...}
        const match = line.match(/\[(.*?)\] \[AUTH\] (.*)/);
        if (match) {
          const timestamp = match[1];
          const data = JSON.parse(match[2]);
          return { timestamp, ...data };
        }
        
        // Try parsing as plain JSON
        const data = JSON.parse(line);
        return data;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-blue-600" />;
      case 'failed_login':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <UserCheck className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login':
        return <Badge className="bg-green-100 text-green-800">Login</Badge>;
      case 'logout':
        return <Badge className="bg-blue-100 text-blue-800">Logout</Badge>;
      case 'failed_login':
        return <Badge className="bg-red-100 text-red-800">Failed Login</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Logs</h1>
        <Button onClick={() => refetchLogs()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="auth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="auth">Authentication Logs</TabsTrigger>
          <TabsTrigger value="all">All System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Authentication Log Files</CardTitle>
                <CardDescription>Login/Logout activity logs</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {authLogs.map((file: string) => (
                      <Button
                        key={file}
                        variant={selectedLog === file ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedLog(file)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {file.replace('auth_', '').replace('.log', '')}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Authentication Activity</CardTitle>
                    <CardDescription>
                      {selectedLog || 'Select a date to view authentication logs'}
                    </CardDescription>
                  </div>
                  {selectedLog && (
                    <Button onClick={() => downloadLog(selectedLog)} size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logContent && selectedLog?.startsWith('auth_') ? (
                    <div className="space-y-2">
                      {parseAuthLog(logContent.content).map((entry: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">{getActionIcon(entry.action)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getActionBadge(entry.action)}
                                  <span className="font-medium text-sm">{entry.username || 'Unknown'}</span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                  <div>Time: {new Date(entry.timestamp).toLocaleString()}</div>
                                  {entry.ipAddress && <div>IP: {entry.ipAddress}</div>}
                                  {entry.userAgent && <div className="truncate max-w-md">Agent: {entry.userAgent}</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-20">
                      Select an authentication log file to view login activity
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>All Log Files</CardTitle>
                <CardDescription>Select a log file to view</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {logFiles.map((file: string) => (
                      <Button
                        key={file}
                        variant={selectedLog === file ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedLog(file)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {file}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Log Content</CardTitle>
                    <CardDescription>
                      {selectedLog || 'Select a log file to view its content'}
                    </CardDescription>
                  </div>
                  {selectedLog && (
                    <Button onClick={() => downloadLog(selectedLog)} size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logContent ? (
                    <pre className="text-xs font-mono bg-slate-950 text-green-400 p-4 rounded-lg overflow-x-auto">
                      {logContent.content}
                    </pre>
                  ) : (
                    <div className="text-center text-gray-500 py-20">
                      Select a log file to view its content
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
