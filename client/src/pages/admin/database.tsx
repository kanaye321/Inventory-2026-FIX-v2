import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  FileUp, 
  FileDown, 
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Table as TableIcon,
  Settings,
  Loader2, 
  Clock,
  FileCog
} from "lucide-react";

interface DatabaseTable {
  name: string;
  columns: number;
  size: string;
  sizeBytes: number;
}

interface DatabaseBackup {
  filename: string;
  path: string;
  size: string;
  created: string;
}

interface DatabaseStatus {
  status: string;
  name: string;
  version: string;
  size: string;
  sizeBytes: number;
  tables: DatabaseTable[];
  tablesCount: number;
  lastBackup: string;
  connectionError?: boolean;
  errorMessage?: string;
  storageMode?: string;
}

export default function DatabaseManagementPage() {
  const [activeTab, setActiveTab] = useState("status");
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isRestoreAllDialogOpen, setIsRestoreAllDialogOpen] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupFilename, setBackupFilename] = useState(`backup-${new Date().toISOString().split('T')[0]}.sql`);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreAllFile, setRestoreAllFile] = useState<File | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState('');
  const [restoreAllConfirmation, setRestoreAllConfirmation] = useState('');
  const [selectedBackupPath, setSelectedBackupPath] = useState('');
  const [selectedBackupFilename, setSelectedBackupFilename] = useState('');

  const [autoBackup, setAutoBackup] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [backupTime, setBackupTime] = useState('03:00');
  const [optimizeTime, setOptimizeTime] = useState('04:00');
  const { toast } = useToast();

  // Load saved maintenance settings
  useQuery({
    queryKey: ['/api/database/schedule'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/database/schedule');
        const data = await response.json();
        console.log('Loaded schedule settings:', data);
        if (data) {
          setAutoBackup(data.autoBackup || false);
          setAutoOptimize(data.autoOptimize || false);
          setBackupTime(data.backupTime || '03:00');
          setOptimizeTime(data.optimizeTime || '04:00');
        }
        return data;
      } catch (error) {
        console.error('Failed to load schedule settings:', error);
        // Set defaults if loading fails
        setAutoBackup(false);
        setAutoOptimize(false);
        setBackupTime('03:00');
        setOptimizeTime('04:00');
        return null;
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Ensure it always fetches fresh data on mount
  });

  // Fetch database status
  const { data: databaseStatus, isLoading: isStatusLoading, error: statusError } = useQuery<DatabaseStatus>({
    queryKey: ['/api/database/status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/database/status');
        const data = await res.json();

        if (!res.ok) {
          console.warn('Database status API returned non-OK status:', res.status, data);
          return {
            ...data,
            connectionError: true
          };
        }

        console.log('Database status response:', data);
        return {
          ...data,
          connectionError: data.connectionError || false,
          storageMode: data.storageMode || "Managed Storage" // Default if not provided
        };
      } catch (error: any) {
        console.error('Database status fetch error:', error);
        // Return fallback data when request fails completely
        return {
          status: "Disconnected", 
          name: "PostgreSQL Database",
          version: "Connection Failed",
          size: "Not Available",
          sizeBytes: 0,
          tables: [],
          tablesCount: 0,
          lastBackup: "Connection required",
          connectionError: true,
          errorMessage: error.message || 'Failed to connect to database',
          storageMode: "In-Memory Storage (Temporary)"
        };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1, // Retry once on mount if initial fetch fails
    retryOnMount: true,
    retryDelay: 2000,
  });

  // Fetch backups
  const { 
    data: backups, 
    isLoading: isBackupsLoading,
    error: backupsError,
    refetch: refetchBackups
  } = useQuery<DatabaseBackup[]>({
    queryKey: ['/api/database/backups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/database/backups');
      const data = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      // Simulate progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += 15;
        setBackupProgress(Math.min(progress, 90));
        if (progress >= 90) clearInterval(interval);
      }, 300);

      try {
        // Perform the backup
        const response = await apiRequest('POST', '/api/database/backup', {
          filename: backupFilename,
          tables: selectedTables.length > 0 ? selectedTables : undefined,
          includeData: true,
          compress: true
        });

        // Complete the progress
        clearInterval(interval);
        setBackupProgress(100);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || 'Backup failed');
        }

        // Clear selected tables
        setSelectedTables([]);

        // Always treat response as file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backupFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true, message: 'Backup downloaded successfully' };
      } catch (error: any) {
        clearInterval(interval);
        setBackupProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Backup created",
        description: `Database backup "${backupFilename}" has been created successfully.`,
      });
      setIsBackupDialogOpen(false);
      refetchBackups();
      // Reset progress after a short delay
      setTimeout(() => setBackupProgress(0), 1000);
    },
    onError: (error: any) => {
      setBackupProgress(0);
      toast({
        title: "Backup failed",
        description: error.message || "There was an error creating the database backup.",
        variant: "destructive",
      });
    }
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupPath: string) => {
      const response = await apiRequest('POST', '/api/database/restore', {
        backupPath
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Restore failed' }));
        throw new Error(errorData.message || 'Restore failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backup restored",
        description: `Database has been restored from backup successfully. File: ${data.filename || 'backup file'}`,
      });
      setIsRestoreDialogOpen(false);
      refetchStatus();
      // Refresh the page data after restore
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Restore failed",
        description: error.message || "There was an error restoring the database from backup.",
        variant: "destructive",
      });
    }
  });

  // Optimize database mutation
  const optimizeDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/database/optimize', {
        tables: ['users', 'assets', 'activities', 'licenses', 'components', 'accessories']
      });
      if (!response.ok) {
        throw new Error('Database optimization failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Database Optimized",
        description: `Database optimization completed successfully. ${data.optimizedTables?.length || 0} tables optimized.`,
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "There was an error optimizing the database. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Schedule maintenance mutation
  const scheduleMaintenanceMutation = useMutation({
    mutationFn: async (settings: { autoBackup: boolean; autoOptimize: boolean; backupTime: string; optimizeTime: string }) => {
      console.log('Sending schedule settings:', settings);
      const response = await apiRequest('POST', '/api/database/schedule', {
        ...settings,
        retentionDays: 30, // Assuming a default or previously saved value
        emailNotifications: true // Assuming a default or previously saved value
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Schedule update failed' }));
        throw new Error(errorData.message || 'Schedule update failed');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      const backupStatus = variables.autoBackup 
        ? `enabled at ${variables.backupTime}` 
        : 'disabled';
      const optimizeStatus = variables.autoOptimize 
        ? `enabled at ${variables.optimizeTime}` 
        : 'disabled';

      toast({
        title: "Maintenance schedule updated",
        description: `Automatic backup ${backupStatus}. Optimization ${optimizeStatus}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Schedule update failed",
        description: error.message || "There was an error updating the maintenance schedule.",
        variant: "destructive",
      });
    }
  });

  // Backup all data mutation
  const backupAllDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/database/backup-all', {
        format: 'json',
        includeSystemData: true
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Backup all failed' }));
        throw new Error(errorData.message || 'Backup all failed');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complete-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Complete backup created",
        description: "All data has been backed up and downloaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Backup failed",
        description: error.message || "There was an error creating the complete backup.",
        variant: "destructive",
      });
    }
  });

  // Restore all data mutation
  const restoreAllDataMutation = useMutation({
    mutationFn: async (file: File) => {
      // Basic file validation
      if (!file) {
        throw new Error('No file selected');
      }

      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File too large. Please select a file smaller than 50MB');
      }

      // For JSON restore, validate content
      if (file.name.toLowerCase().endsWith('.json')) {
        const fileContent = await file.text();

        try {
          JSON.parse(fileContent);
        } catch (parseError) {
          // Check if it's HTML content (common issue)
          if (fileContent.trim().toLowerCase().startsWith('<!doctype') || 
              fileContent.trim().toLowerCase().startsWith('<html')) {
            throw new Error('Invalid file format: HTML content detected. Please select a valid JSON backup file.');
          }
          throw new Error('Invalid JSON format: Please select a valid JSON backup file.');
        }
      }

      const formData = new FormData();
      formData.append('backup', file);

      const response = await apiRequest('POST', '/api/database/restore-all', formData, {
        headers: {}, // Let browser set Content-Type for FormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Restore all failed' }));
        throw new Error(errorData.message || 'Restore all failed');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data restored",
        description: "All data has been restored successfully.",
      });
      setIsRestoreAllDialogOpen(false);
      setRestoreAllFile(null);
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Restore failed",
        description: error.message || "There was an error restoring the data.",
        variant: "destructive",
      });
    }
  });

  // Handle saving maintenance schedule (initial call or explicit save)
  const saveMaintenanceSchedule = () => {
    scheduleMaintenanceMutation.mutate({
      autoBackup,
      autoOptimize,
      backupTime,
      optimizeTime
    });
  };

  // Auto-save when settings change
  const handleAutoBackupChange = (checked: boolean) => {
    setAutoBackup(checked);
    console.log('Saving autoBackup setting:', checked);
    scheduleMaintenanceMutation.mutate({
      autoBackup: checked,
      backupTime: backupTime || '03:00', // Ensure backupTime is always sent
      autoOptimize,
      optimizeTime
    });
  };

  const handleAutoOptimizeChange = (checked: boolean) => {
    setAutoOptimize(checked);
    console.log('Saving autoOptimize setting:', checked);
    scheduleMaintenanceMutation.mutate({
      autoBackup,
      autoOptimize: checked,
      backupTime,
      optimizeTime: optimizeTime || '04:00', // Ensure optimizeTime is always sent
    });
  };

  const handleBackupTimeChange = (time: string) => {
    setBackupTime(time);
    console.log('Saving backupTime setting:', time);
    scheduleMaintenanceMutation.mutate({
      autoBackup: autoBackup ?? false, // Ensure autoBackup is always sent
      backupTime: time,
      autoOptimize,
      optimizeTime
    });
  };

  const handleOptimizeTimeChange = (time: string) => {
    setOptimizeTime(time);
    console.log('Saving optimizeTime setting:', time);
    scheduleMaintenanceMutation.mutate({
      autoBackup,
      autoOptimize,
      backupTime,
      optimizeTime: time
    });
  };

  // Add refetchStatus function
  const refetchStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/database/status'] });
  };

  // Handle file upload for restore backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file extension
      const allowedExtensions = ['.sql', '.backup'];
      const hasValidExtension = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );

      if (!hasValidExtension) {
        toast({
          title: "Invalid file type",
          description: "Please select an SQL or BACKUP file",
          variant: "destructive",
        });
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file size (max 50MB for safety)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        });
        e.target.value = ''; // Clear the input
        return;
      }

      setRestoreFile(file);
    }
  };

  // Toggle table selection
  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(name => name !== tableName)
        : [...prev, tableName]
    );
  };

  // Select all tables
  const selectAllTables = () => {
    if (databaseStatus && databaseStatus.tables) {
      setSelectedTables(databaseStatus.tables.map(table => table.name));
    }
  };

  // Deselect all tables
  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center">
          <Database className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8" />
          Database Management
        </h1>
        <Button
          onClick={() => {
            refetchStatus();
            refetchBackups();
          }}
          variant="outline"
          size="sm"
          className="flex items-center mt-2 sm:mt-0 text-xs sm:text-sm"
        >
          <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="status" className="flex items-center text-xs sm:text-sm">
            <HardDrive className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center text-xs sm:text-sm">
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center text-xs sm:text-sm">
            <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Maintenance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Database Status</CardTitle>
              <CardDescription>
                Current status and information about your database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {databaseStatus?.connectionError ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-yellow-600 font-medium">Database Connection Issue</p>
                <p className="text-sm text-gray-500 mt-2">
                  There may be a temporary connection issue with the database.
                </p>

                {databaseStatus?.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">Error Details:</p>
                    <p className="text-sm text-red-600">{databaseStatus.errorMessage}</p>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Current Status:</strong> {databaseStatus?.storageMode || "Checking..."}
                  </p>
                  <p className="text-sm text-blue-700 mt-2">
                    If this persists, try:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                    <li>Refresh the page</li>
                    <li>Check your PostgreSQL database status in Replit</li>
                    <li>Restart the application if needed</li>
                  </ul>
                </div>

                <div className="mt-4 flex gap-2 justify-center">
                  <Button 
                    onClick={() => {
                      refetchStatus();
                      refetchBackups();
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Connection
                  </Button>
                </div>
              </div>
            ) : isStatusLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Checking database status...</p>
              </div>
            ) : (
              databaseStatus ? (
                <div className="space-y-4">
                  {/* Storage Mode Indicator */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="font-medium text-green-800">Storage Mode</h3>
                    </div>
                    <p className="mt-2 text-green-700">{databaseStatus.storageMode}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Connection Status: <span className="font-medium">{databaseStatus.status}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-4 border rounded-md">
                      <div className="flex items-center">
                        <Database className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Database Name</h3>
                      </div>
                      <p className="mt-2">{databaseStatus.name}</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center">
                        <HardDrive className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Database Size</h3>
                      </div>
                      <p className="mt-2">{databaseStatus.size}</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center">
                        <FileCog className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Database Version</h3>
                      </div>
                      <p className="mt-2">{databaseStatus.version}</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center">
                        <TableIcon className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Tables</h3>
                      </div>
                      <p className="mt-2">{databaseStatus.tablesCount}</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Last Backup</h3>
                      </div>
                      <p className="mt-2">{databaseStatus.lastBackup || 'No backups yet'}</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center">
                        <RefreshCw className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Last Updated</h3>
                      </div>
                      <p className="mt-2">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Data</AlertTitle>
                  <AlertDescription>
                    No database statistics available.
                  </AlertDescription>
                </Alert>
              )
            )}

              {databaseStatus && databaseStatus.tables && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Database Tables</h3>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-10 px-4 text-left font-medium">Table Name</th>
                          <th className="h-10 px-4 text-left font-medium">Columns</th>
                          <th className="h-10 px-4 text-left font-medium">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {databaseStatus.tables.map((table) => (
                          <tr key={table.name} className="border-b">
                            <td className="p-4 align-middle">{table.name}</td>
                            <td className="p-4 align-middle">{table.columns}</td>
                            <td className="p-4 align-middle">{table.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Backup (SQL)</CardTitle>
                <CardDescription>
                  Create a PostgreSQL dump of your database schema and data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  SQL backups contain all your database tables, columns, and data. They can be used to restore your system in case of failure.
                </p>
                <Button 
                  onClick={() => setIsBackupDialogOpen(true)}
                  className="w-full"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Create SQL Backup
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complete Data Backup (JSON)</CardTitle>
                <CardDescription>
                  Export all database data in JSON format for easy restoration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  JSON backups contain complete application data and can be restored to any database instance.
                </p>
                <Button 
                  onClick={() => backupAllDataMutation.mutate()}
                  disabled={backupAllDataMutation.isPending}
                  className="w-full"
                >
                  {backupAllDataMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Backup All Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restore SQL Backup</CardTitle>
                <CardDescription>
                  Restore your database from a PostgreSQL backup file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Restoring will replace your current database with a previous SQL backup.
                </p>
                <Button 
                  onClick={() => setIsRestoreDialogOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Restore SQL Backup
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restore Complete Data</CardTitle>
                <CardDescription>
                  Restore all data from a JSON backup file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload a complete JSON backup to restore all application data.
                </p>
                <Button 
                  onClick={() => setIsRestoreAllDialogOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Restore All Data
                </Button>
              </CardContent>
            </Card>
          </div>

          {isBackupsLoading ? (
            <div className="flex items-center justify-center py-8 mt-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading backup history...</span>
            </div>
          ) : backupsError ? (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load backup history. Please try again.
              </AlertDescription>
            </Alert>
          ) : backups && backups.length > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>
                  Previous database backups available for restoration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left font-medium">Filename</th>
                        <th className="h-10 px-4 text-left font-medium">Size</th>
                        <th className="h-10 px-4 text-left font-medium">Created</th>
                        <th className="h-10 px-4 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((backup) => (
                        <tr key={backup.path} className="border-b">
                          <td className="p-4 align-middle">{backup.filename}</td>
                          <td className="p-4 align-middle">{backup.size}</td>
                          <td className="p-4 align-middle">{new Date(backup.created).toLocaleString()}</td>
                          <td className="p-4 align-middle">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Store the backup path for restoration
                                  setSelectedBackupPath(backup.path);
                                  setSelectedBackupFilename(backup.filename);
                                  setRestoreConfirmation('');
                                  setIsRestoreDialogOpen(true);
                                }}
                                disabled={restoreBackupMutation.isPending}
                              >
                                {restoreBackupMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileUp className="h-4 w-4" />
                                )}
                                <span className="ml-2">Restore</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Create download link for backup file
                                  // NOTE: This assumes backups are accessible via a static path.
                                  // If not, this needs to be changed to use an API endpoint.
                                  const link = document.createElement('a');
                                  link.href = `/api/download-backup?filename=${encodeURIComponent(backup.filename)}`; // Use API for download
                                  link.download = backup.filename;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                disabled={restoreBackupMutation.isPending} // Disable while restore is in progress
                              >
                                <Download className="h-4 w-4" />
                                <span className="ml-2">Download</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>
                  No backups found. Create your first backup to protect your data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No backups available</AlertTitle>
                  <AlertDescription>
                    It's recommended to create regular backups of your database to prevent data loss.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Database Maintenance</CardTitle>
              <CardDescription>
                Optimize and maintain your database for better performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="border rounded-md p-6">
                  <h3 className="text-lg font-medium mb-2">Optimize Database</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Optimize tables to reclaim unused space and improve performance.
                  </p>
                  <Button 
                    onClick={() => optimizeDatabaseMutation.mutate()}
                    disabled={optimizeDatabaseMutation.isPending || databaseStatus?.connectionError}
                  >
                    {optimizeDatabaseMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="mr-2 h-4 w-4" />
                    )}
                    Optimize Database
                  </Button>
                </div>

                <div className="border rounded-md p-6">
                  <h3 className="text-lg font-medium mb-2">Automatic Database Maintenance</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure automatic maintenance tasks to keep your database healthy and backed up.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="auto-backup" 
                          checked={autoBackup}
                          onCheckedChange={(checked) => 
                            handleAutoBackupChange(checked)
                          }
                          disabled={databaseStatus?.connectionError || scheduleMaintenanceMutation.isPending}
                        />
                        <label
                          htmlFor="auto-backup"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Enable automatic daily backups
                        </label>
                      </div>
                      {autoBackup && (
                        <div className="ml-6">
                          <Label htmlFor="backup-time" className="text-xs">Backup Time</Label>
                          <Input
                            id="backup-time"
                            type="time"
                            value={backupTime}
                            onChange={(e) => handleBackupTimeChange(e.target.value)}
                            className="w-32"
                            disabled={scheduleMaintenanceMutation.isPending}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="auto-optimize" 
                          checked={autoOptimize}
                          onCheckedChange={(checked) => 
                            handleAutoOptimizeChange(checked)
                          }
                          disabled={databaseStatus?.connectionError || scheduleMaintenanceMutation.isPending}
                        />
                        <label
                          htmlFor="auto-optimize"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Enable automatic weekly optimization
                        </label>
                      </div>
                      {autoOptimize && (
                        <div className="ml-6">
                          <Label htmlFor="optimize-time" className="text-xs">Optimize Time</Label>
                          <Input
                            id="optimize-time"
                            type="time"
                            value={optimizeTime}
                            onChange={(e) => handleOptimizeTimeChange(e.target.value)}
                            className="w-32"
                            disabled={scheduleMaintenanceMutation.isPending}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Backup Retention:</strong> All backups will be retained indefinitely. 
                        You can manually delete old backups from the backup history below if needed.
                      </p>
                    </div>

                    {scheduleMaintenanceMutation.isPending && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-green-600" />
                        <p className="text-sm text-green-800">
                          Saving schedule settings...
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      <CheckCircle2 className="inline h-4 w-4 mr-1 text-green-600" />
                      Settings are automatically saved when you make changes
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setBackupFilename(`backup-${new Date().toISOString().split('T')[0]}.sql`);
                        setIsBackupDialogOpen(true);
                      }}
                      className="w-full"
                      disabled={databaseStatus?.connectionError}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Create Manual Backup Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Backup Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Database Backup</DialogTitle>
            <DialogDescription>
              Create a backup of your database. You can select specific tables or backup the entire database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-filename">Backup Filename</Label>
              <Input
                id="backup-filename"
                value={backupFilename}
                onChange={(e) => setBackupFilename(e.target.value)}
                disabled={createBackupMutation.isPending}
              />
            </div>

            {databaseStatus && databaseStatus.tables && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Select Tables to Backup</Label>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllTables}
                      disabled={createBackupMutation.isPending}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={deselectAllTables}
                      disabled={createBackupMutation.isPending}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-4">
                  {databaseStatus.tables.map((table) => (
                    <div key={table.name} className="flex items-center space-x-2">
                      <Switch
                        id={`table-${table.name}`}
                        checked={selectedTables.includes(table.name)}
                        onCheckedChange={() => toggleTableSelection(table.name)}
                        disabled={createBackupMutation.isPending}
                      />
                      <label
                        htmlFor={`table-${table.name}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {table.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedTables.length === 0 
                    ? "All database tables will be automatically discovered and backed up with complete data." 
                    : `${selectedTables.length} specific tables selected for backup.`}
                </p>
              </div>
            )}

            {backupProgress > 0 && (
              <div className="space-y-2">
                <Label>Backup Progress</Label>
                <Progress value={backupProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {backupProgress < 100 
                    ? "Creating backup..." 
                    : "Backup completed successfully!"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsBackupDialogOpen(false)}
              disabled={createBackupMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending || backupProgress > 0}
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Create Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={(open) => {
        setIsRestoreDialogOpen(open);
        if (!open) {
          setRestoreConfirmation('');
          setSelectedBackupPath('');
          setSelectedBackupFilename('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Database from Backup</DialogTitle>
            <DialogDescription>
              You are about to restore from backup: {selectedBackupFilename}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Warning</AlertTitle>
              <AlertDescription>
                Restoring this backup will completely replace ALL current data in your database. 
                This action is IRREVERSIBLE and cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="restore-confirmation">
                Type <strong>RESTORE</strong> in all capital letters to confirm this action:
              </Label>
              <Input
                id="restore-confirmation"
                type="text"
                value={restoreConfirmation}
                onChange={(e) => setRestoreConfirmation(e.target.value)}
                placeholder="Type RESTORE to confirm"
                className="font-mono"
                disabled={restoreBackupMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                You must type exactly "RESTORE" (all capitals) to enable the restore button.
              </p>
            </div>

            {selectedBackupFilename && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Backup to restore:</strong> {selectedBackupFilename}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRestoreDialogOpen(false)}
              disabled={restoreBackupMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedBackupPath) {
                  restoreBackupMutation.mutate(selectedBackupPath);
                  setIsRestoreDialogOpen(false); // Close dialog on mutate
                } else {
                  toast({
                    title: "No backup selected",
                    description: "Please select a backup file to restore.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={restoreConfirmation !== 'RESTORE' || !selectedBackupPath || restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              Restore Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore All Data Dialog */}
      <Dialog open={isRestoreAllDialogOpen} onOpenChange={(open) => {
        setIsRestoreAllDialogOpen(open);
        if (!open) {
          setRestoreAllConfirmation('');
          setRestoreAllFile(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore All Data</DialogTitle>
            <DialogDescription>
              Upload a complete backup file to restore all data to in-memory storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Warning</AlertTitle>
              <AlertDescription>
                This will completely replace ALL data in memory with the backup data. 
                All current data will be permanently lost and cannot be recovered.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="restore-all-file">Select Complete Backup File</Label>
              <Input
                id="restore-all-file"
                type="file"
                accept=".json,.sql,.backup"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const file = files[0];

                    // Validate file extension
                    const allowedExtensions = ['.json', '.sql', '.backup'];
                    const hasValidExtension = allowedExtensions.some(ext => 
                      file.name.toLowerCase().endsWith(ext)
                    );

                    if (!hasValidExtension) {
                      toast({
                        title: "Invalid file type",
                        description: "Please select a JSON, SQL, or BACKUP file",
                        variant: "destructive",
                      });
                      e.target.value = ''; // Clear the input
                      return;
                    }

                    // Validate file size (max 50MB for safety)
                    if (file.size > 50 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "Please select a file smaller than 50MB",
                        variant: "destructive",
                      });
                      e.target.value = ''; // Clear the input
                      return;
                    }

                    setRestoreAllFile(file);
                  }
                }}
                disabled={restoreAllDataMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Select a backup file created with "Backup All Data". Accepts .json, .sql, or .backup files.
              </p>
              {restoreAllFile && (
                <p className="text-sm text-green-600">
                  Selected: {restoreAllFile.name} ({(restoreAllFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="restore-all-confirmation">
                Type <strong>RESTORE</strong> in all capital letters to confirm this action:
              </Label>
              <Input
                id="restore-all-confirmation"
                type="text"
                value={restoreAllConfirmation}
                onChange={(e) => setRestoreAllConfirmation(e.target.value)}
                placeholder="Type RESTORE to confirm"
                className="font-mono"
                disabled={restoreAllDataMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                You must type exactly "RESTORE" (all capitals) to enable the restore button.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRestoreAllDialogOpen(false);
                setRestoreAllFile(null);
                setRestoreAllConfirmation('');
              }}
              disabled={restoreAllDataMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (restoreAllFile) {
                  restoreAllDataMutation.mutate(restoreAllFile);
                  setIsRestoreAllDialogOpen(false); // Close dialog on mutate
                } else {
                  toast({
                    title: "No file selected",
                    description: "Please select a backup file to restore.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={restoreAllConfirmation !== 'RESTORE' || !restoreAllFile || restoreAllDataMutation.isPending}
            >
              {restoreAllDataMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Restore All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}