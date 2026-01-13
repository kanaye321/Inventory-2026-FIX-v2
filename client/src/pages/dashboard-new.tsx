import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Laptop, Server, Shield, TrendingUp, Activity, CheckCircle, Clock,
  AlertTriangle, XCircle, Package, Database, Cloud, HardDrive,
  Monitor, Lock, Key, BarChart3, Zap, Users, Bell, Download,
  ArrowUpRight, ArrowDownRight, Cpu, Network, Mail, Settings,
  FileText, Calendar, Eye, Plus, RefreshCw, ChevronRight, Layers
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, LineChart, Line, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format } from "date-fns";

export default function DashboardNew() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const response = await fetch("/api/assets", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch assets");
      return response.json();
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });

  const { data: licenses } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch licenses");
      return response.json();
    },
  });

  const { data: iamAccounts } = useQuery({
    queryKey: ["iam-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/iam-accounts", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch IAM accounts");
      return response.json();
    },
  });

  const { data: vmInventory } = useQuery({
    queryKey: ["vm-inventory"],
    queryFn: async () => {
      const response = await fetch("/api/vm-inventory", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch VM inventory");
      return response.json();
    },
  });

  const { data: itEquipment } = useQuery({
    queryKey: ["it-equipment"],
    queryFn: async () => {
      const response = await fetch("/api/it-equipment", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch IT equipment");
      return response.json();
    },
  });

  const { data: monitors } = useQuery({
    queryKey: ["monitor-inventory"],
    queryFn: async () => {
      const response = await fetch("/api/monitor-inventory", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch monitors");
      return response.json();
    },
  });

  const { data: azureResources } = useQuery({
    queryKey: ["azure-inventory"],
    queryFn: async () => {
      const response = await fetch("/api/azure-inventory", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch Azure resources");
      return response.json();
    },
  });

  const { data: gcpResources } = useQuery({
    queryKey: ["gcp-inventory"],
    queryFn: async () => {
      const response = await fetch("/api/gcp-inventory", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch GCP resources");
      return response.json();
    },
  });

  const { data: awsInventory = [] } = useQuery({
    queryKey: ['/api/aws-inventory'],
    enabled: !!user,
  });

  const calculateVMStatus = (startDate: string, endDate: string, currentStatus: string) => {
    if (currentStatus === "Overdue - Notified" || currentStatus === "Decommissioned") {
      return currentStatus;
    }
    if (!startDate || !endDate) return "Active";
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (today >= start && today <= end) return "Active";
    else if (today > end) return "Overdue - Not Notified";
    else return "Active";
  };

  const processedVMs = vmInventory?.map(vm => ({
    ...vm,
    vmStatus: calculateVMStatus(vm.startDate, vm.endDate, vm.vmStatus)
  })) || [];

  // Calculate metrics
  const totalAssets = assets?.length || 0;
  const activeAssets = assets?.filter((a: any) => a.status === 'Deployed').length || 0;
  const totalLicenses = licenses?.length || 0;
  const activeLicenses = licenses?.filter((l: any) => !l.expiryDate || new Date(l.expiryDate) > new Date()).length || 0;
  const totalIAM = iamAccounts?.length || 0;
  const activeIAM = iamAccounts?.filter((i: any) => i.status === 'active').length || 0;
  const expiredNotifiedIAM = iamAccounts?.filter((i: any) => i.status === 'expired_notified').length || 0;
  const expiredNotNotifiedIAM = iamAccounts?.filter((i: any) => i.status === 'expired_not_notified').length || 0;
  const inactiveIAM = iamAccounts?.filter((i: any) => i.status === 'inactive').length || 0;
  const pendingIAM = iamAccounts?.filter((i: any) => i.status === 'pending').length || 0;
  const disabledIAM = iamAccounts?.filter((i: any) => i.status === 'disabled').length || 0;

  const totalVMs = processedVMs.length;
  const activeVMs = processedVMs.filter(v => v.vmStatus === "Active").length;
  const overdueNotifiedVMs = processedVMs.filter(v => v.vmStatus === "Overdue - Notified").length;
  const overdueNotNotifiedVMs = processedVMs.filter(v => v.vmStatus === "Overdue - Not Notified").length;
  const decommissionedVMs = processedVMs.filter(v => v.vmStatus === "Decommissioned").length;

  const totalMonitors = monitors?.length || 0;
  const totalITEquipment = itEquipment?.length || 0;
  const totalAzure = azureResources?.length || 0;
  const totalGCP = gcpResources?.length || 0;
  const totalAWS = awsInventory.length;

  // Asset status breakdown
  const assetStatusData = [
    { name: 'Deployed', value: activeAssets, fill: '#22C55E' },
    { name: 'Pending', value: assets?.filter((a: any) => a.status === 'pending').length || 0, fill: '#3B82F6' },
    { name: 'Maintenance', value: assets?.filter((a: any) => a.condition === 'Bad').length || 0, fill: '#F59E0B' },
    { name: 'Retired', value: assets?.filter((a: any) => a.status === 'retired').length || 0, fill: '#6B7280' },
  ].filter(s => s.value > 0);

  // Category distribution
  const categoryData = assets?.reduce((acc: any, asset: any) => {
    const cat = asset.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {}) || {};

  const pieData = Object.entries(categoryData).map(([name, value], idx) => ({
    name,
    value: value as number,
    fill: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'][idx % 6]
  }));

  // Infrastructure overview data
  const infrastructureData = [
    { name: 'Assets', count: totalAssets, icon: Database, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600' },
    { name: 'VMs', count: totalVMs, icon: Server, color: 'from-purple-500 to-purple-600', textColor: 'text-purple-600' },
    { name: 'IAM', count: totalIAM, icon: Shield, color: 'from-green-500 to-green-600', textColor: 'text-green-600' },
    { name: 'Licenses', count: totalLicenses, icon: Key, color: 'from-orange-500 to-orange-600', textColor: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-[1920px] mx-auto px-6 py-6 space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Layers className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">IT Asset Dashboard</h1>
                    <p className="text-white/90 text-sm mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {format(currentTime, 'EEEE, MMMM dd, yyyy • HH:mm:ss')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button className="bg-white text-indigo-600 hover:bg-white/90">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 shadow-lg border-0 p-1.5 rounded-2xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl">
              <Eye className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="vm" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl">
              <Server className="h-4 w-4 mr-2" />
              VM Inventory
            </TabsTrigger>
            <TabsTrigger value="iam" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-xl">
              <Shield className="h-4 w-4 mr-2" />
              IAM Accounts
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white rounded-xl">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {infrastructureData.map((item, idx) => (
                <Card 
                  key={idx}
                  className={`bg-gradient-to-br ${item.color} border-0 shadow-xl hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1`}
                  onClick={() => {
                    const routes: any = {
                      'Assets': '/assets',
                      'VMs': '/vm-inventory',
                      'IAM': '/iam-accounts',
                      'Licenses': '/licenses'
                    };
                    window.location.href = routes[item.name];
                  }}
                >
                  <CardContent className="p-6 text-white">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <item.icon className="h-8 w-8" />
                      </div>
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="text-4xl font-bold mb-1">{item.count}</div>
                    <p className="text-white/90 text-sm font-medium">Total {item.name}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Progress value={65} className="bg-white/20" />
                      <span className="text-xs">65%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-600" />
                    Asset Category Distribution
                  </CardTitle>
                  <CardDescription>Breakdown by asset categories</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={110} 
                          dataKey="value" 
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No category data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Asset Status Overview
                  </CardTitle>
                  <CardDescription>Current status distribution</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={assetStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {assetStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Infrastructure Resources */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-purple-600" />
                  Infrastructure Resources
                </CardTitle>
                <CardDescription>IT equipment and cloud resources overview</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div 
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.location.href = '/it-equipment'}
                  >
                    <Laptop className="h-12 w-12 text-cyan-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-cyan-600 mb-1">{totalITEquipment}</div>
                    <p className="text-sm text-gray-600">IT Equipment</p>
                  </div>

                  <div 
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.location.href = '/monitor-inventory'}
                  >
                    <Monitor className="h-12 w-12 text-pink-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-pink-600 mb-1">{totalMonitors}</div>
                    <p className="text-sm text-gray-600">Monitors</p>
                  </div>

                  <div 
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.location.href = '/azure-inventory'}
                  >
                    <Cloud className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-indigo-600 mb-1">{totalAzure}</div>
                    <p className="text-sm text-gray-600">Azure Resources</p>
                  </div>

                  <div 
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.location.href = '/gcp-inventory'}
                  >
                    <Cloud className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-teal-600 mb-1">{totalGCP}</div>
                    <p className="text-sm text-gray-600">GCP Resources</p>
                  </div>

                  <div 
                    className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.location.href = '/aws-inventory'}
                  >
                    <Cloud className="h-12 w-12 text-orange-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-orange-600 mb-1">{totalAWS}</div>
                    <p className="text-sm text-gray-600">AWS Resources</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VM Inventory Tab */}
          <TabsContent value="vm" className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-6 w-6 text-purple-600" />
                  Virtual Machine Status Overview
                </CardTitle>
                <CardDescription>Complete VM inventory lifecycle management</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/vm-inventory'}
                  >
                    <Server className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{totalVMs}</div>
                    <p className="text-sm text-blue-100">Total VMs</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/vm-inventory?statusFilter=Active'}
                  >
                    <CheckCircle className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{activeVMs}</div>
                    <p className="text-sm text-green-100">Active</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/vm-inventory?statusFilter=Overdue - Notified'}
                  >
                    <AlertTriangle className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{overdueNotifiedVMs}</div>
                    <p className="text-sm text-orange-100">Overdue - Notified</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/vm-inventory?statusFilter=Overdue - Not Notified'}
                  >
                    <XCircle className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{overdueNotNotifiedVMs}</div>
                    <p className="text-sm text-red-100">Overdue - Not Notified</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/vm-inventory?statusFilter=Decommissioned'}
                  >
                    <Database className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{decommissionedVMs}</div>
                    <p className="text-sm text-gray-100">Decommissioned</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IAM Accounts Tab */}
          <TabsContent value="iam" className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-green-600" />
                  IAM Account Status Overview
                </CardTitle>
                <CardDescription>Identity and Access Management status breakdown</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/iam-accounts'}
                  >
                    <Shield className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{totalIAM}</div>
                    <p className="text-sm text-blue-100">Total Accounts</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/iam-accounts?statusFilter=active'}
                  >
                    <CheckCircle className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{activeIAM}</div>
                    <p className="text-sm text-green-100">Active</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/iam-accounts?statusFilter=expired_notified'}
                  >
                    <AlertTriangle className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{expiredNotifiedIAM}</div>
                    <p className="text-sm text-orange-100">Expired - Notified</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/iam-accounts?statusFilter=expired_not_notified'}
                  >
                    <XCircle className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{expiredNotNotifiedIAM}</div>
                    <p className="text-sm text-red-100">Expired - Not Notified</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/iam-accounts?statusFilter=pending'}
                  >
                    <Clock className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{pendingIAM}</div>
                    <p className="text-sm text-yellow-100">Pending</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div 
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 p-6 text-white cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                    onClick={() => window.location.href = '/iam-accounts?statusFilter=disabled'}
                  >
                    <Lock className="h-10 w-10 mb-4 opacity-80" />
                    <div className="text-4xl font-bold mb-2">{disabledIAM}</div>
                    <p className="text-sm text-gray-100">Disabled</p>
                    <div className="absolute top-2 right-2">
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  Resource Analytics Dashboard
                </CardTitle>
                <CardDescription>Comprehensive resource distribution and trends</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={[
                    { name: 'Assets', value: totalAssets, fill: '#3B82F6' },
                    { name: 'VMs', value: totalVMs, fill: '#8B5CF6' },
                    { name: 'IAM', value: totalIAM, fill: '#10B981' },
                    { name: 'Licenses', value: totalLicenses, fill: '#F59E0B' },
                    { name: 'IT Equipment', value: totalITEquipment, fill: '#EC4899' },
                    { name: 'Monitors', value: totalMonitors, fill: '#14B8A6' },
                    { name: 'Cloud', value: totalAzure + totalGCP + totalAWS, fill: '#6366F1' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}