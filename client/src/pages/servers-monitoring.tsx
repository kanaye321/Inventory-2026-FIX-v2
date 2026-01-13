import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, Settings, Loader2, Server, CheckCircle, XCircle, 
  AlertTriangle, Activity, Clock, Wifi, WifiOff, Search, Filter,
  TrendingUp, HardDrive, Cpu, MemoryStick
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, LineChart, Line, BarChart, Bar
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ZabbixSettings {
  zabbixUrl: string;
  zabbixApiToken: string;
  refreshInterval: number;
}

interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available?: string;
  availabilityStatus: string;
  ipAddress: string;
  groups: string;
  monitoringEnabled: boolean;
  icmpStatus: string;
  agentStatus: string;
  directPingStatus: string;
}

interface HostMetrics {
  hostid: string;
  hostname: string;
  cpuUtilization: number;
  memoryUtilization: number;
  diskUsage: number;
  uptime: string;
  status: string;
  networkIn: number;
  networkOut: number;
  ipAddress: string;
}

interface Problem {
  eventid: string;
  name: string;
  severity: number;
  hostname: string;
  acknowledged: string;
  clock: string;
}

export default function ServersMonitoring() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ZabbixSettings>(() => {
    // Load saved settings from localStorage on initial render
    const saved = localStorage.getItem('zabbix-settings');
    return saved ? JSON.parse(saved) : {
      zabbixUrl: "",
      zabbixApiToken: "",
      refreshInterval: 60
    };
  });
  const [selectedHosts, setSelectedHosts] = useState<string[]>(() => {
    // Load saved hosts from localStorage on initial render
    const saved = localStorage.getItem('zabbix-selected-hosts');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHostSelectorOpen, setIsHostSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "unavailable" | "issues">("all");

  // Fetch Zabbix settings
  const { data: savedSettings, isLoading: settingsLoading } = useQuery<ZabbixSettings>({
    queryKey: ["/api/zabbix/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/zabbix/settings");
      return response.json();
    },
  });

  useEffect(() => {
    if (savedSettings && !settingsLoading) {
      const newSettings = {
        zabbixUrl: savedSettings.zabbixUrl || "",
        zabbixApiToken: savedSettings.zabbixApiToken || "",
        refreshInterval: savedSettings.refreshInterval || 60
      };
      setSettings(newSettings);
      // Save to localStorage for persistence
      localStorage.setItem('zabbix-settings', JSON.stringify(newSettings));
    }
  }, [savedSettings, settingsLoading]);

  // Fetch hosts
  const { data: availableHosts = [], isLoading: hostsLoading, refetch: refetchHosts } = useQuery<ZabbixHost[]>({
    queryKey: ["/api/zabbix/hosts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/zabbix/hosts");
      return response.json();
    },
    enabled: !!settings.zabbixUrl && !!settings.zabbixApiToken,
    refetchInterval: settings.refreshInterval * 1000,
  });

  // Fetch metrics for selected hosts
  const { data: hostMetrics = [], isLoading: metricsLoading } = useQuery<HostMetrics[]>({
    queryKey: ["/api/zabbix/metrics", selectedHosts],
    queryFn: async () => {
      if (selectedHosts.length === 0) return [];
      const response = await apiRequest("POST", "/api/zabbix/metrics", {
        hostIds: selectedHosts
      });
      return response.json();
    },
    enabled: selectedHosts.length > 0,
    refetchInterval: settings.refreshInterval * 1000,
  });

  // Fetch problems
  const { data: problems = [] } = useQuery<Problem[]>({
    queryKey: ["/api/zabbix/problems"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/zabbix/problems");
      return response.json();
    },
    enabled: !!settings.zabbixUrl && !!settings.zabbixApiToken,
    refetchInterval: settings.refreshInterval * 1000,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: ZabbixSettings) => {
      const response = await apiRequest("POST", "/api/zabbix/settings", {
        zabbixUrl: newSettings.zabbixUrl,
        zabbixApiToken: newSettings.zabbixApiToken,
        refreshInterval: newSettings.refreshInterval
      });
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const updatedSettings = {
        zabbixUrl: data.zabbixUrl || data.zabbix_url || settings.zabbixUrl,
        zabbixApiToken: data.zabbixApiToken || data.zabbix_api_token || settings.zabbixApiToken,
        refreshInterval: data.refreshInterval || data.refresh_interval || settings.refreshInterval
      };
      setSettings(updatedSettings);
      // Save to localStorage
      localStorage.setItem('zabbix-settings', JSON.stringify(updatedSettings));
      toast({ 
        title: "Settings saved successfully",
        description: "Your Zabbix configuration has been updated."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/zabbix/settings"] });
      setIsSettingsOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to save settings",
        description: error.message || "An error occurred while saving settings",
        variant: "destructive"
      });
    }
  });

  const handleSaveSettings = () => {
    console.log('Saving Zabbix settings:', settings);
    saveSettingsMutation.mutate(settings);
  };

  // Auto-select healthy hosts on initial load only if no saved selection exists
  useEffect(() => {
    const savedHosts = localStorage.getItem('zabbix-selected-hosts');
    if (availableHosts.length > 0 && selectedHosts.length === 0 && !savedHosts) {
      const healthyHosts = availableHosts
        .filter(h => h.availabilityStatus === "available")
        .map(h => h.hostid);
      if (healthyHosts.length > 0) {
        setSelectedHosts(healthyHosts);
        localStorage.setItem('zabbix-selected-hosts', JSON.stringify(healthyHosts));
      }
    }
  }, [availableHosts]);

  // Filter hosts based on search and status
  const filteredHosts = availableHosts.filter((host: ZabbixHost) => {
    const matchesSearch = host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         host.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === "available") {
      matchesStatus = host.availabilityStatus === "available" && host.icmpStatus === "responding";
    } else if (statusFilter === "unavailable") {
      matchesStatus = host.availabilityStatus === "unavailable" || host.icmpStatus === "no response";
    } else if (statusFilter === "issues") {
      const hostProblems = problems.filter(p => p.hostname === host.name);
      matchesStatus = hostProblems.length > 0;
    }
    return matchesSearch && matchesStatus;
  });

  // Toggle host selection
  const toggleHostSelection = (hostId: string) => {
    setSelectedHosts(prev => {
      const updated = prev.includes(hostId)
        ? prev.filter(id => id !== hostId)
        : [...prev, hostId];
      // Save to localStorage
      localStorage.setItem('zabbix-selected-hosts', JSON.stringify(updated));
      return updated;
    });
  };

  // Calculate statistics
  const totalHosts = availableHosts.length;
  const availableCount = availableHosts.filter(h => 
    h.availabilityStatus === "available" && 
    (h.icmpStatus === "responding" || h.agentStatus === "available")
  ).length;
  const offlineCount = availableHosts.filter(h => 
    h.availabilityStatus === "unavailable" || 
    h.icmpStatus === "no response"
  ).length;
  const criticalProblems = problems.filter(p => p.severity >= 4).length;
  const totalIssues = problems.length;

  // Get severity details
  const getSeverityDetails = (severity: number) => {
    const severities = {
      0: { label: "Not classified", color: "bg-gray-500" },
      1: { label: "Information", color: "bg-blue-500" },
      2: { label: "Warning", color: "bg-yellow-500" },
      3: { label: "Average", color: "bg-orange-500" },
      4: { label: "High", color: "bg-red-500" },
      5: { label: "Disaster", color: "bg-purple-500" }
    };
    return severities[severity as keyof typeof severities] || severities[0];
  };

  // Chart data for metrics
  const chartData = hostMetrics.map((m, idx) => ({
    time: new Date(Date.now() - (hostMetrics.length - idx) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpu: m.cpuUtilization,
    memory: m.memoryUtilization,
    disk: m.diskUsage
  }));

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
              Infrastructure Monitoring
            </h1>
            <p className="text-lg text-muted-foreground">Real-time server health & performance analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isHostSelectorOpen} onOpenChange={setIsHostSelectorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="border-slate-700 hover:bg-slate-800">
                  <Filter className="h-5 w-5 mr-2" />
                  Hosts ({selectedHosts.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Select Monitoring Targets</DialogTitle>
                  <DialogDescription>Choose which servers to display on the dashboard</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      const all = availableHosts.map(h => h.hostid);
                      setSelectedHosts(all);
                      localStorage.setItem('zabbix-selected-hosts', JSON.stringify(all));
                    }}>
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedHosts([]);
                      localStorage.setItem('zabbix-selected-hosts', JSON.stringify([]));
                    }}>
                      Deselect All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const available = availableHosts.filter(h => h.availabilityStatus === "available").map(h => h.hostid);
                      setSelectedHosts(available);
                      localStorage.setItem('zabbix-selected-hosts', JSON.stringify(available));
                    }}>
                      Available Only
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredHosts.map(host => (
                      <div key={host.hostid} className="flex items-center space-x-3 p-4 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                        <Checkbox
                          checked={selectedHosts.includes(host.hostid)}
                          onCheckedChange={() => toggleHostSelection(host.hostid)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-slate-100">{host.name}</p>
                            {host.directPingStatus === "responding" ? (
                              <Activity className="h-4 w-4 text-green-400" title="Direct Ping: Responding" />
                            ) : host.directPingStatus === "no response" ? (
                              <Activity className="h-4 w-4 text-red-400" title="Direct Ping: No Response" />
                            ) : null}
                            {host.icmpStatus === "responding" ? (
                              <Wifi className="h-4 w-4 text-blue-400" title="Zabbix ICMP: Responding" />
                            ) : host.icmpStatus === "no response" ? (
                              <WifiOff className="h-4 w-4 text-orange-400" title="Zabbix ICMP: No Response" />
                            ) : null}
                            {host.agentStatus === "available" ? (
                              <CheckCircle className="h-4 w-4 text-cyan-400" title="Zabbix Agent: Available" />
                            ) : null}
                          </div>
                          <p className="text-sm text-slate-400">{host.ipAddress}</p>
                        </div>
                        <Badge className={`${
                          host.availabilityStatus === 'available' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }`}>
                          {host.availabilityStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="lg" onClick={() => queryClient.invalidateQueries()} className="border-slate-700 hover:bg-slate-800">
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="border-slate-700 hover:bg-slate-800">
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Zabbix Configuration</DialogTitle>
                  <DialogDescription>Configure your monitoring server connection</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="zabbix-url">Zabbix Server URL</Label>
                    <Input
                      id="zabbix-url"
                      placeholder="https://zabbix.example.com"
                      value={settings.zabbixUrl}
                      onChange={(e) => setSettings({ ...settings, zabbixUrl: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-token">API Token</Label>
                    <Input
                      id="api-token"
                      type="password"
                      placeholder="Enter your API token"
                      value={settings.zabbixApiToken}
                      onChange={(e) => setSettings({ ...settings, zabbixApiToken: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refresh-interval"
                      type="number"
                      value={settings.refreshInterval}
                      onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full bg-blue-600 hover:bg-blue-700" disabled={saveSettingsMutation.isPending}>
                    {saveSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Total Servers</p>
                <p className="text-4xl font-bold text-foreground">{totalHosts}</p>
              </div>
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Server className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Available</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{availableCount}</p>
              </div>
              <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-1">Offline</p>
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">{offlineCount}</p>
              </div>
              <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium mb-1">Active Issues</p>
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{totalIssues}</p>
              </div>
              <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Critical</p>
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{criticalProblems}</p>
              </div>
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Server Cards */}
        <div className="col-span-8 space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2">
          {selectedHosts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-16 text-center">
              <Server className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">No Servers Selected</h3>
              <p className="text-muted-foreground">Click the Hosts button to select servers to monitor</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {selectedHosts.map(hostId => {
                const host = availableHosts.find(h => h.hostid === hostId);
                const metrics = hostMetrics.find(m => m.hostid === hostId);
                const hostProblems = problems.filter(p => p.hostname === host?.name);

                if (!host) return null;

                // Determine accurate status - prioritize direct ping, then ICMP, then agent
                let actualStatus = "unavailable";
                
                // Direct ping is most reliable
                if (host.directPingStatus === "responding") {
                  actualStatus = "available";
                } else if (host.directPingStatus === "no response") {
                  actualStatus = "unavailable";
                } else {
                  // Fall back to ICMP and Agent checks if direct ping is inconclusive
                  if (host.icmpStatus === "responding" || host.agentStatus === "available") {
                    actualStatus = "available";
                  } else if (host.icmpStatus === "no response" || host.agentStatus === "unavailable") {
                    actualStatus = "unavailable";
                  } else {
                    // Use the host's calculated availability status as final fallback
                    actualStatus = host.availabilityStatus === "available" ? "available" : "unavailable";
                  }
                }

                return (
                  <div key={hostId} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground mb-1">{host.name}</h3>
                        <p className="text-sm text-muted-foreground">{host.ipAddress}</p>
                      </div>
                      <Badge className={`${
                        actualStatus === 'available' 
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50' 
                          : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50'
                      }`}>
                        {actualStatus}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                        {host.directPingStatus === "responding" ? (
                          <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Activity className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-foreground truncate font-semibold">Direct Ping: {host.directPingStatus || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                          {host.icmpStatus === "responding" ? (
                            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className="text-foreground truncate">ICMP: {host.icmpStatus || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                          {host.agentStatus === "available" ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className="text-foreground truncate">Agent: {host.agentStatus || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {metrics ? (
                      <>
                        {/* Show metrics if available - but only if host is actually reachable */}
                        {actualStatus === "available" && (metrics.cpuUtilization > 0 || metrics.memoryUtilization > 0) ? (
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Cpu className="h-3 w-3" /> CPU
                                </span>
                                <span className="font-bold text-cyan-600 dark:text-cyan-400">{metrics.cpuUtilization.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${metrics.cpuUtilization > 80 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                  style={{ width: `${Math.min(metrics.cpuUtilization, 100)}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <MemoryStick className="h-3 w-3" /> Memory
                                </span>
                                <span className="font-bold text-green-600 dark:text-green-400">{metrics.memoryUtilization.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${metrics.memoryUtilization > 85 ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(metrics.memoryUtilization, 100)}%` }}
                                />
                              </div>
                            </div>

                            {metrics.uptime && metrics.uptime !== 'N/A' && (
                              <div className="flex items-center justify-between pt-2 border-t border-border">
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Uptime
                                </span>
                                <span className="text-sm font-medium text-foreground">{metrics.uptime}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            {/* Use actualStatus for accurate display */}
                            {actualStatus === 'available' ? (
                              <div>
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                                <p>Host is online</p>
                                <p className="text-xs mt-1">Performance metrics not configured</p>
                              </div>
                            ) : (
                              <div>
                                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                                <p>Host is offline</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {actualStatus === 'available' ? (
                          <>
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                            <p>Loading metrics...</p>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                            <p>Host is offline</p>
                          </>
                        )}
                      </div>
                    )}

                    {hostProblems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">{hostProblems.length} active issue{hostProblems.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column - Charts & Problems */}
        <div className="col-span-4 space-y-6">
          {/* Performance Chart */}
          {hostMetrics.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Trends
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))"
                    }} 
                  />
                  <Line type="monotone" dataKey="cpu" stroke="#06b6d4" name="CPU %" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="disk" stroke="#f59e0b" name="Disk %" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Active Problems */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Active Problems ({problems.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {problems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-muted-foreground">All systems normal</p>
                </div>
              ) : (
                problems.slice(0, 10).map((problem: Problem) => {
                  const severityInfo = getSeverityDetails(problem.severity);
                  return (
                    <div key={problem.eventid} className="bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          problem.severity >= 4 ? 'text-red-600 dark:text-red-400' : 
                          problem.severity >= 3 ? 'text-orange-600 dark:text-orange-400' : 
                          'text-yellow-600 dark:text-yellow-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate mb-1">{problem.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{problem.hostname}</span>
                            <Badge className={`${severityInfo.color} text-white text-xs`}>
                              {severityInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}