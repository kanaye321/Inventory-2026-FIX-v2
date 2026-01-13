import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Users,
  Package,
  Activity,
  Laptop,
  Monitor,
  Building2,
  PieChart,
  BarChart3,
  Clock,
  User,
  CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportData {
  assets: any[];
  users: any[];
  activities: any[];
  consumables: any[];
  licenses: any[];
}

// Helper function to memoize expensive calculations
const memoizeFunction = (fn: (...args: any[]) => any) => {
  const cache = new Map();
  return (...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};


export default function ReportsSecondary() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const queryClient = useQueryClient(); // Initialize useQueryClient

  // State for filters (assuming these are used by the queries, not fully shown)
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Date range filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Date range additional filters
  const [dateRangeCategoryFilter, setDateRangeCategoryFilter] = useState("all");
  const [dateRangeStatusFilter, setDateRangeStatusFilter] = useState("all");
  const [dateRangeConditionFilter, setDateRangeConditionFilter] = useState("all");


  // Refetch data when component mounts
  useEffect(() => {
    // Refetch data on mount
    queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    queryClient.invalidateQueries({ queryKey: ['/api/it-equipment'] });
    queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
  }, [queryClient]);


  const { data: assets = [], isLoading: isLoadingAssets, isError: isErrorAssets } = useQuery({
    queryKey: ["assets", statusFilter, categoryFilter, departmentFilter, conditionFilter, searchTerm, page, pageSize], // Include filters in queryKey
    queryFn: async () => {
      // Construct URL with filters
      const url = new URL("/api/assets", window.location.origin);
      if (statusFilter !== "all") url.searchParams.append("statusFilter", statusFilter);
      if (categoryFilter !== "all") url.searchParams.append("categoryFilter", categoryFilter);
      if (departmentFilter !== "all") url.searchParams.append("departmentFilter", departmentFilter);
      if (conditionFilter !== "all") url.searchParams.append("conditionFilter", conditionFilter);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("pageSize", pageSize.toString());

      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch assets");
      return response.json();
    },
    keepPreviousData: true, // Keep previous data while fetching new data
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });

  const { data: consumables = [], isLoading: isLoadingConsumables } = useQuery({
    queryKey: ["it-equipment"],
    queryFn: async () => {
      const response = await fetch("/api/it-equipment", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch IT equipment");
      return response.json();
    },
  });

  const { data: licenses = [], isLoading: isLoadingLicenses } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch licenses");
      return response.json();
    },
  });

  useEffect(() => {
    setReportData({ assets, users, activities, consumables, licenses });
  }, [assets, users, activities, consumables, licenses]);

  // Memoized calculation for device age
  const calculateDeviceAge = useMemo(() => memoizeFunction((purchaseDate: string) => {
    if (!purchaseDate) return 0;
    const purchase = new Date(purchaseDate);
    const now = new Date();
    return Math.floor((now.getTime() - purchase.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }), []);

  const navigateWithFilters = useCallback((filters: {
    categoryFilter?: string;
    statusFilter?: string;
    departmentFilter?: string;
    conditionFilter?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.categoryFilter && filters.categoryFilter !== 'all') {
      params.append('categoryFilter', filters.categoryFilter);
    }
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      params.append('statusFilter', filters.statusFilter);
    }
    if (filters.departmentFilter && filters.departmentFilter !== 'all') {
      params.append('departmentFilter', filters.departmentFilter);
    }
    if (filters.conditionFilter && filters.conditionFilter !== 'all') {
      params.append('conditionFilter', filters.conditionFilter);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    const queryString = params.toString();
    navigate(`/assets${queryString ? `?${queryString}` : ''}`);
  }, [navigate]);

  // Memoized filtering operations
  const laptops = useMemo(() => assets.filter(a => a.category?.toLowerCase() === 'laptop'), [assets]);
  const desktops = useMemo(() => assets.filter(a => a.category?.toLowerCase() === 'desktop'), [assets]);
  const deployedAssets = useMemo(() => assets.filter(a => a.status === 'Deployed'), [assets]);
  const availableAssets = useMemo(() => assets.filter(a => a.status === 'available' || a.status === 'On-Hand'), [assets]);
  const goodCondition = useMemo(() => assets.filter(a => a.condition === 'Good'), [assets]);
  const badCondition = useMemo(() => assets.filter(a => a.condition === 'Bad'), [assets]);

  const laptopStats = useMemo(() => ({
    total: laptops.length,
    onHand: laptops.filter(laptop => laptop.status === 'available' || laptop.status === 'On-Hand').length,
    deployed: laptops.filter(laptop => laptop.status === 'Deployed').length,
    pendingDeployment: laptops.filter(laptop => laptop.status === 'pending').length,
    goodCondition: laptops.filter(laptop => laptop.condition === 'Good').length,
    badCondition: laptops.filter(laptop => laptop.condition === 'Bad').length,
    reserved: laptops.filter(laptop => laptop.status === 'Reserved').length
  }), [laptops]);

  const desktopStats = useMemo(() => ({
    total: desktops.length,
    onHand: desktops.filter(desktop => desktop.status === 'available' || desktop.status === 'On-Hand').length,
    deployed: desktops.filter(desktop => desktop.status === 'Deployed').length,
    pendingDeployment: desktops.filter(desktop => desktop.status === 'pending').length,
    goodCondition: desktops.filter(desktop => desktop.condition === 'Good').length,
    badCondition: desktops.filter(desktop => desktop.condition === 'Bad').length,
    reserved: desktops.filter(desktop => desktop.status === 'Reserved').length
  }), [desktops]);

  const departmentData = useMemo(() => assets.reduce((acc: any, asset: any) => {
    if (asset.department && asset.status === 'Deployed') {
      if (!acc[asset.department]) {
        acc[asset.department] = {
          laptops: 0,
          desktops: 0
        };
      }
      if (asset.category?.toLowerCase() === 'laptop') {
        acc[asset.department].laptops++;
      } else if (asset.category?.toLowerCase() === 'desktop') {
        acc[asset.department].desktops++;
      }
    }
    return acc;
  }, {}), [assets]);

  const ageDistribution = useMemo(() => ({
    new: laptops.filter(l => calculateDeviceAge(l.purchaseDate) <= 1).length,
    good: laptops.filter(l => calculateDeviceAge(l.purchaseDate) > 1 && calculateDeviceAge(l.purchaseDate) <= 3).length,
    aging: laptops.filter(l => calculateDeviceAge(l.purchaseDate) > 3 && calculateDeviceAge(l.purchaseDate) <= 5).length,
    old: laptops.filter(l => calculateDeviceAge(l.purchaseDate) > 5).length,
  }), [laptops, calculateDeviceAge]);

  // Filter assets by date range
  const dateRangeAssets = useMemo(() => assets.filter(asset => {
    // If no date filters are set, return all assets with purchase dates
    if (!dateFrom && !dateTo) {
      if (!asset.purchaseDate) return false;
    } else {
      // Skip assets without purchase dates when filters are active
      if (!asset.purchaseDate) return false;
    }

    // Apply date range filter
    let passesDateFilter = true;
    if (dateFrom || dateTo) {
      const purchaseDate = new Date(asset.purchaseDate);
      purchaseDate.setHours(0, 0, 0, 0);

      if (dateFrom && dateTo) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        passesDateFilter = purchaseDate >= from && purchaseDate <= to;
      } else if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        passesDateFilter = purchaseDate >= from;
      } else if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        passesDateFilter = purchaseDate <= to;
      }
    }

    if (!passesDateFilter) return false;

    // Apply category filter
    if (dateRangeCategoryFilter !== "all" && asset.category?.toLowerCase() !== dateRangeCategoryFilter.toLowerCase()) {
      return false;
    }

    // Apply status filter
    if (dateRangeStatusFilter !== "all" && asset.status !== dateRangeStatusFilter) {
      return false;
    }

    // Apply condition filter
    if (dateRangeConditionFilter !== "all" && asset.condition !== dateRangeConditionFilter) {
      return false;
    }

    return true;
  }), [assets, dateFrom, dateTo, dateRangeCategoryFilter, dateRangeStatusFilter, dateRangeConditionFilter]);

  // Date range statistics
  const dateRangeStats = useMemo(() => ({
    total: dateRangeAssets.length,
    laptops: dateRangeAssets.filter(a => a.category?.toLowerCase() === 'laptop').length,
    desktops: dateRangeAssets.filter(a => a.category?.toLowerCase() === 'desktop').length,
    deployed: dateRangeAssets.filter(a => a.status === 'Deployed').length,
    available: dateRangeAssets.filter(a => a.status === 'available' || a.status === 'On-Hand').length
  }), [dateRangeAssets]);

  // Log for debugging when date filters are active
  useEffect(() => {
    if (dateFrom || dateTo) {
      console.log('Date Range Filter Active:', {
        from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : 'Not set',
        to: dateTo ? format(dateTo, 'yyyy-MM-dd') : 'Not set',
        assetsFound: dateRangeAssets.length,
        stats: dateRangeStats
      });
    }
  }, [dateFrom, dateTo, dateRangeAssets, dateRangeStats]);

  // Get unique Knox IDs from deployed assets
  const knoxIDUsers = useMemo(() => {
    const deployedAssets = assets.filter(asset => {
      // Only include deployed assets with valid Knox IDs
      const isDeployed = asset.status === 'Deployed';
      const hasKnoxId = asset.knoxId && asset.knoxId.trim() !== '';
      return isDeployed && hasKnoxId;
    });

    const knoxIDMap = new Map();
    deployedAssets.forEach(asset => {
      const knoxId = asset.knoxId.trim().toLowerCase(); // Normalize to lowercase for consistency
      if (!knoxIDMap.has(knoxId)) {
        knoxIDMap.set(knoxId, []);
      }
      knoxIDMap.get(knoxId).push(asset);
    });

    return knoxIDMap;
  }, [assets]);

  // Category 1: Knox IDs with single 5+ year old laptop (no desktop, only 1 laptop that is 5+ years old)
  const usersWithOldSingleLaptop = useMemo(() => Array.from(knoxIDUsers.entries())
    .filter(([knoxId, userAssets]) => {
      const userLaptops = userAssets.filter(asset =>
        asset.category?.toLowerCase() === 'laptop'
      );

      const userDesktops = userAssets.filter(asset =>
        asset.category?.toLowerCase() === 'desktop'
      );

      // Must have exactly 1 laptop and 0 desktops
      if (userLaptops.length !== 1 || userDesktops.length !== 0) {
        return false;
      }

      const singleLaptop = userLaptops[0];
      const deviceAge = calculateDeviceAge(singleLaptop.purchaseDate);

      // Laptop must be 5 years or older
      return deviceAge >= 5;
    })
    .map(([knoxId, userAssets]) => ({
      knoxId,
      assets: userAssets,
      laptopAge: calculateDeviceAge(userAssets.find(a => a.category?.toLowerCase() === 'laptop')?.purchaseDate)
    })), [knoxIDUsers, calculateDeviceAge]);

  // Category 2: Knox IDs with one desktop and a 5+ year old laptop
  const usersWithDesktopAndOldLaptop = useMemo(() => Array.from(knoxIDUsers.entries())
    .filter(([knoxId, userAssets]) => {
      const userLaptops = userAssets.filter(asset =>
        asset.category?.toLowerCase() === 'laptop'
      );

      const userDesktops = userAssets.filter(asset =>
        asset.category?.toLowerCase() === 'desktop'
      );

      // Must have exactly 1 laptop and 1 desktop
      if (userLaptops.length !== 1 || userDesktops.length !== 1) {
        return false;
      }

      // Check if the laptop is 5+ years old
      const laptop = userLaptops[0];
      const deviceAge = calculateDeviceAge(laptop.purchaseDate);

      return deviceAge >= 5;
    })
    .map(([knoxId, userAssets]) => ({ knoxId, assets: userAssets })), [knoxIDUsers, calculateDeviceAge]);

  // Category 3: Knox IDs with two laptops but no desktop
  const usersWithTwoLaptopsNoDesktop = useMemo(() => Array.from(knoxIDUsers.entries())
    .filter(([knoxId, userAssets]) => {
      const userLaptops = userAssets.filter(asset =>
        asset.category?.toLowerCase() === 'laptop'
      );

      const userDesktops = userAssets.filter(asset =>
        asset.category?.toLowerCase() === 'desktop'
      );

      // Must have exactly 2 laptops and 0 desktops
      return userLaptops.length === 2 && userDesktops.length === 0;
    })
    .map(([knoxId, userAssets]) => ({ knoxId, assets: userAssets })), [knoxIDUsers]);

  // Log Knox ID analysis for debugging
  useEffect(() => {
    console.log('Knox ID User Analysis:', {
      totalKnoxIDs: knoxIDUsers.size,
      category1Count: usersWithOldSingleLaptop.length,
      category2Count: usersWithDesktopAndOldLaptop.length,
      category3Count: usersWithTwoLaptopsNoDesktop.length
    });
  }, [knoxIDUsers, usersWithOldSingleLaptop, usersWithDesktopAndOldLaptop, usersWithTwoLaptopsNoDesktop]);

  const exportToExcel = useCallback((data: any[], filename: string, sheetName: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Export Error",
        description: "No data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Separate summary data from detail data
      const summaryData = data.filter(row =>
        row['Device Type']?.includes('SUMMARY') ||
        row['category']?.includes('SUMMARY') ||
        row['analysisType']?.includes('SUMMARY') ||
        row['department']?.includes('SUMMARY') ||
        row['Device Type'] === 'SUMMARY - Total All Devices' ||
        row['Device Type'] === 'GRAND TOTAL'
      );

      const detailData = data.filter(row =>
        !row['Device Type']?.includes('SUMMARY') &&
        !row['category']?.includes('SUMMARY') &&
        !row['analysisType']?.includes('SUMMARY') &&
        !row['department']?.includes('SUMMARY') &&
        row['Device Type'] !== '--- DETAILED RECORDS START BELOW ---' &&
        row['category'] !== '--- DETAILED RECORDS START BELOW ---' &&
        row['analysisType'] !== '--- DETAILED RECORDS START BELOW ---' &&
        row['department'] !== '--- DETAILED RECORDS START BELOW ---'
      );

      // Create workbook content in HTML table format (Excel can import this)
      let excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Summary</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
                <x:ExcelWorksheet>
                  <x:Name>Details</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
            caption { font-size: 1.5em; margin: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
      `;

      // Summary Sheet
      if (summaryData.length > 0) {
        excelContent += '<table border="1"><caption>Summary</caption>';
        const summaryKeys = Object.keys(summaryData[0]);
        excelContent += '<thead><tr>';
        summaryKeys.forEach(key => {
          const header = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          excelContent += `<th>${header}</th>`;
        });
        excelContent += '</tr></thead><tbody>';

        summaryData.forEach(row => {
          excelContent += '<tr>';
          summaryKeys.forEach(key => {
            excelContent += `<td>${row[key] || ''}</td>`;
          });
          excelContent += '</tr>';
        });
        excelContent += '</tbody></table><br/><br/>';
      }

      // Details Sheet
      if (detailData.length > 0) {
        excelContent += '<table border="1"><caption>Details</caption>';
        const detailKeys = Object.keys(detailData[0]);
        excelContent += '<thead><tr>';
        detailKeys.forEach(key => {
          const header = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          excelContent += `<th>${header}</th>`;
        });
        excelContent += '</tr></thead><tbody>';

        detailData.forEach(row => {
          excelContent += '<tr>';
          detailKeys.forEach(key => {
            excelContent += `<td>${row[key] || ''}</td>`;
          });
          excelContent += '</tr>';
        });
        excelContent += '</tbody></table>';
      }

      excelContent += '</body></html>';

      // Create and download the file
      const blob = new Blob([excelContent], {
        type: 'application/vnd.ms-excel'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xls`;
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Excel file "${filename}.xls" has been downloaded with ${data.length} records in separate sheets.`,
      });

    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const exportData = useCallback((format: 'csv' | 'excel' | 'json') => {
    const data = {
      summary: {
        totalAssets: assets.length,
        laptops: laptops.length,
        desktops: desktops.length,
        deployed: deployedAssets.length,
        available: availableAssets.length,
        goodCondition: goodCondition.length,
        badCondition: badCondition.length,
      },
      laptopStats,
      desktopStats,
      departments: departmentData,
      ageDistribution: ageDistribution,
      timestamp: new Date().toISOString()
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: `Analytics report exported as ${format.toUpperCase()}`,
      });
    }
  }, [assets, laptops, desktops, deployedAssets, availableAssets, goodCondition, badCondition, laptopStats, desktopStats, departmentData, ageDistribution, toast]);

  const MetricCard = useCallback(({ title, value, subtitle, icon: Icon, color = "blue" }: any) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4" style={{ borderLeftColor: `var(--${color}-500)` }}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-5 w-5 text-${color}-600`} />
              <p className="text-sm font-medium text-gray-600">{title}</p>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ), []);

  const ProgressBar = useCallback(({ label, value, total, color = 'blue' }: any) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-600">{value} / {total} ({Math.round(percentage)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r`}
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg, var(--${color}-500), var(--${color}-600))`
            }}
          />
        </div>
      </div>
    );
  }, []);

  if (isLoadingAssets || isLoadingUsers || isLoadingActivities || isLoadingConsumables || isLoadingLicenses) {
    return <div className="min-h-screen flex items-center justify-center text-lg font-semibold">Loading reports...</div>;
  }

  if (isErrorAssets) {
    return <div className="min-h-screen flex items-center justify-center text-lg font-semibold text-red-600">Error loading assets. Please try again later.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Interactive Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Generated on {format(new Date(), 'MMMM dd, yyyy - HH:mm a')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => exportData('json')}
                className="hover:bg-blue-50 hover:border-blue-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div onClick={() => window.location.href = '/assets'} className="cursor-pointer">
            <MetricCard
              title="Total Assets"
              value={assets.length}
              subtitle={`${deployedAssets.length} deployed`}
              icon={Database}
              color="blue"
            />
          </div>
          <div onClick={() => window.location.href = '/users'} className="cursor-pointer">
            <MetricCard
              title="Active Users"
              value={users.length}
              subtitle={`${users.filter((u: any) => u.status === 'active').length} active`}
              icon={Users}
              color="green"
            />
          </div>
          <div onClick={() => window.location.href = '/licenses'} className="cursor-pointer">
            <MetricCard
              title="Licenses"
              value={licenses.length}
              subtitle={`${licenses.filter((l: any) => l.status === 'active').length} active`}
              icon={FileSpreadsheet}
              color="purple"
            />
          </div>
          <div onClick={() => window.location.href = '/it-equipment'} className="cursor-pointer">
            <MetricCard
              title="IT Equipment"
              value={consumables.length}
              subtitle={`${consumables.filter((c: any) => c.status === 'available').length} available`}
              icon={Package}
              color="orange"
            />
          </div>
        </div>

        {/* Tabbed Content */}
        <Card className="shadow-lg">
          <Tabs defaultValue="overview" className="w-full">
            <CardHeader className="border-b bg-gray-50">
              <TabsList className="grid w-full grid-cols-6 h-auto bg-transparent gap-2">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 py-3"
                >
                  <PieChart className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="laptops"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 py-3"
                >
                  <Laptop className="h-4 w-4" />
                  Laptops
                </TabsTrigger>
                <TabsTrigger
                  value="desktops"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 py-3"
                >
                  <Monitor className="h-4 w-4" />
                  Desktops
                </TabsTrigger>
                <TabsTrigger
                  value="departments"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 py-3"
                >
                  <Building2 className="h-4 w-4" />
                  Departments
                </TabsTrigger>
                <TabsTrigger
                  value="daterange"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 py-3"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Date Range
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 py-3"
                >
                  <Users className="h-4 w-4" />
                  User Analysis
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const summaryData = [
                        { 'Device Type': 'SUMMARY - Laptop', 'Total Devices': laptops.length, 'On Hand Devices': laptopStats.onHand, 'Deployed Devices': laptopStats.deployed, 'Pending Devices': laptopStats.pendingDeployment, 'Good Condition': laptopStats.goodCondition, 'Bad Condition': laptopStats.badCondition, 'Reserved Devices': laptopStats.reserved },
                        { 'Device Type': 'SUMMARY - Desktop', 'Total Devices': desktops.length, 'On Hand Devices': desktopStats.onHand, 'Deployed Devices': desktopStats.deployed, 'Pending Devices': desktopStats.pendingDeployment, 'Good Condition': desktopStats.goodCondition, 'Bad Condition': desktopStats.badCondition, 'Reserved Devices': desktopStats.reserved },
                        { 'Device Type': 'SUMMARY - Total All Devices', 'Total Devices': assets.length, 'On Hand Devices': laptopStats.onHand + desktopStats.onHand, 'Deployed Devices': laptopStats.deployed + desktopStats.deployed, 'Pending Devices': laptopStats.pendingDeployment + desktopStats.pendingDeployment, 'Good Condition': laptopStats.goodCondition + desktopStats.goodCondition, 'Bad Condition': laptopStats.badCondition + desktopStats.badCondition, 'Reserved Devices': laptopStats.reserved + desktopStats.reserved },
                        { 'Device Type': '--- DETAILED RECORDS START BELOW ---', 'Total Devices': '', 'On Hand Devices': '', 'Deployed Devices': '', 'Pending Devices': '', 'Good Condition': '', 'Bad Condition': '', 'Reserved Devices': '' }
                      ];

                      const detailData = assets.map(asset => ({
                        'Device Type': asset.category || 'N/A',
                        'Total Devices': '',
                        'On Hand Devices': '',
                        'Deployed Devices': '',
                        'Pending Devices': '',
                        'Good Condition': '',
                        'Bad Condition': '',
                        'Reserved Devices': '',
                        'Asset Tag': asset.assetTag || 'N/A',
                        'Device Name': asset.name || 'N/A',
                        'Serial Number': asset.serialNumber || 'N/A',
                        'Knox ID': asset.knoxId || 'N/A',
                        'Model': asset.model || 'N/A',
                        'Manufacturer': asset.manufacturer || 'N/A',
                        'Status': asset.status || 'N/A',
                        'Condition': asset.condition || 'N/A',
                        'Department': asset.department || 'N/A',
                        'Assigned To': asset.assignedTo || 'N/A',
                        'Purchase Date': asset.purchaseDate || 'N/A',
                        'Location': asset.location || 'N/A',
                        'IP Address': asset.ipAddress || 'N/A',
                        'MAC Address': asset.macAddress || 'N/A',
                        'OS Type': asset.osType || 'N/A'
                      }));

                      exportToExcel([...summaryData, ...detailData], `overview-${format(new Date(), 'yyyy-MM-dd')}`, 'Overview Summary');
                    }}
                    className="hover:bg-blue-50 hover:border-blue-300"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-2 border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-600" />
                        Device Inventory
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <ProgressBar label="Laptops" value={laptops.length} total={assets.length} color="blue" />
                      <ProgressBar label="Desktops" value={desktops.length} total={assets.length} color="purple" />
                      <ProgressBar label="Deployed" value={deployedAssets.length} total={assets.length} color="green" />
                      <ProgressBar label="Available" value={availableAssets.length} total={assets.length} color="yellow" />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-green-100">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Device Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <ProgressBar label="Good Condition" value={goodCondition.length} total={assets.length} color="green" />
                      <ProgressBar label="Needs Attention" value={badCondition.length} total={assets.length} color="red" />
                      <div className="pt-4 border-t">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Overall Health Score</p>
                          <p className="text-4xl font-bold text-green-600">
                            {assets.length > 0 ? Math.round((goodCondition.length / assets.length) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Age Distribution */}
                <Card className="border-2 border-purple-100">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      Device Age Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'Laptop' })} className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200 text-center hover:shadow-lg transition-all cursor-pointer">
                        <p className="text-4xl font-bold text-green-700 mb-2">{ageDistribution.new}</p>
                        <p className="text-sm font-medium text-green-800">New (≤1 year)</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'Laptop' })} className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200 text-center hover:shadow-lg transition-all cursor-pointer">
                        <p className="text-4xl font-bold text-blue-700 mb-2">{ageDistribution.good}</p>
                        <p className="text-sm font-medium text-blue-800">Good (1-3 years)</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'Laptop' })} className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border-2 border-yellow-200 text-center hover:shadow-lg transition-all cursor-pointer">
                        <p className="text-4xl font-bold text-yellow-700 mb-2">{ageDistribution.aging}</p>
                        <p className="text-sm font-medium text-yellow-800">Aging (3-5 years)</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'Laptop' })} className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border-2 border-red-200 text-center hover:shadow-lg transition-all cursor-pointer">
                        <p className="text-4xl font-bold text-red-700 mb-2">{ageDistribution.old}</p>
                        <p className="text-sm font-medium text-red-800">Old (&gt;5 years)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Laptops Tab */}
              <TabsContent value="laptops" className="space-y-4 mt-0">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const summaryData = [
                        { 'Device Type': 'SUMMARY - Laptop Stats', 'Total Devices': laptopStats.total, 'On Hand Devices': laptopStats.onHand, 'Deployed Devices': laptopStats.deployed, 'Pending Devices': laptopStats.pendingDeployment, 'Good Condition': laptopStats.goodCondition, 'Bad Condition': laptopStats.badCondition, 'Reserved Devices': laptopStats.reserved },
                        { 'Device Type': '--- DETAILED RECORDS START BELOW ---', 'Total Devices': '', 'On Hand Devices': '', 'Deployed Devices': '', 'Pending Devices': '', 'Good Condition': '', 'Bad Condition': '', 'Reserved Devices': '' }
                      ];

                      const laptopData = laptops.map(laptop => ({
                        'Device Type': 'Laptop',
                        'Total Devices': '',
                        'On Hand Devices': '',
                        'Deployed Devices': '',
                        'Pending Devices': '',
                        'Good Condition': '',
                        'Bad Condition': '',
                        'Reserved Devices': '',
                        'Asset Tag': laptop.assetTag,
                        'Name': laptop.name,
                        'Model': laptop.model,
                        'Serial Number': laptop.serialNumber,
                        'Status': laptop.status,
                        'Condition': laptop.condition,
                        'Department': laptop.department || 'N/A',
                        'Assigned To': laptop.assignedTo || 'N/A',
                        'Purchase Date': laptop.purchaseDate && !isNaN(new Date(laptop.purchaseDate).getTime()) ? format(new Date(laptop.purchaseDate), 'yyyy-MM-dd') : 'N/A',
                        'Age': calculateDeviceAge(laptop.purchaseDate) + ' years',
                      }));
                      exportToExcel([...summaryData, ...laptopData], `laptops-${format(new Date(), 'yyyy-MM-dd')}`, 'Laptop Inventory');
                    }}
                    className="hover:bg-blue-50 hover:border-blue-300"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
                <Card className="border-2 border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-blue-600" />
                      Laptop Inventory Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop' })} className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all cursor-pointer">
                        <p className="text-sm text-gray-600 mb-1">Total Laptops</p>
                        <p className="text-3xl font-bold text-gray-900">{laptopStats.total}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', statusFilter: 'available' })} className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200 cursor-pointer">
                        <p className="text-sm text-green-700 mb-1">On-Hand</p>
                        <p className="text-3xl font-bold text-green-800">{laptopStats.onHand}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', statusFilter: 'Deployed' })} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200 cursor-pointer">
                        <p className="text-sm text-blue-700 mb-1">Deployed</p>
                        <p className="text-3xl font-bold text-blue-800">{laptopStats.deployed}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', statusFilter: 'pending' })} className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-200 cursor-pointer">
                        <p className="text-sm text-yellow-700 mb-1">Pending</p>
                        <p className="text-3xl font-bold text-yellow-800">{laptopStats.pendingDeployment}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', conditionFilter: 'Good' })} className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border-2 border-emerald-200 cursor-pointer">
                        <p className="text-sm text-emerald-700 mb-1">Good Condition</p>
                        <p className="text-3xl font-bold text-emerald-800">{laptopStats.goodCondition}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', conditionFilter: 'Bad' })} className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-200 cursor-pointer">
                        <p className="text-sm text-red-700 mb-1">Bad Condition</p>
                        <p className="text-3xl font-bold text-red-800">{laptopStats.badCondition}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', statusFilter: 'Reserved' })} className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200 cursor-pointer">
                        <p className="text-sm text-purple-700 mb-1">Reserved</p>
                        <p className="text-3xl font-bold text-purple-800">{laptopStats.reserved}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'laptop', statusFilter: 'Deployed' })} className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border-2 border-indigo-200 cursor-pointer">
                        <p className="text-sm text-indigo-700 mb-1">Utilization</p>
                        <p className="text-3xl font-bold text-indigo-800">
                          {Math.round((laptopStats.deployed / laptopStats.total) * 100)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Desktops Tab */}
              <TabsContent value="desktops" className="space-y-4 mt-0">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const summaryData = [
                        { 'Device Type': 'SUMMARY - Desktop Stats', 'Total Devices': desktopStats.total, 'On Hand Devices': desktopStats.onHand, 'Deployed Devices': desktopStats.deployed, 'Pending Devices': desktopStats.pendingDeployment, 'Good Condition': desktopStats.goodCondition, 'Bad Condition': desktopStats.badCondition, 'Reserved Devices': desktopStats.reserved },
                        { 'Device Type': '--- DETAILED RECORDS START BELOW ---', 'Total Devices': '', 'On Hand Devices': '', 'Deployed Devices': '', 'Pending Devices': '', 'Good Condition': '', 'Bad Condition': '', 'Reserved Devices': '' }
                      ];

                      const desktopData = desktops.map(desktop => ({
                        'Device Type': 'Desktop',
                        'Total Devices': '',
                        'On Hand Devices': '',
                        'Deployed Devices': '',
                        'Pending Devices': '',
                        'Good Condition': '',
                        'Bad Condition': '',
                        'Reserved Devices': '',
                        'Asset Tag': desktop.assetTag,
                        'Name': desktop.name,
                        'Model': desktop.model,
                        'Serial Number': desktop.serialNumber,
                        'Status': desktop.status,
                        'Condition': desktop.condition,
                        'Department': desktop.department || 'N/A',
                        'Assigned To': desktop.assignedTo || 'N/A',
                        'Purchase Date': desktop.purchaseDate && !isNaN(new Date(desktop.purchaseDate).getTime()) ? format(new Date(desktop.purchaseDate), 'yyyy-MM-dd') : 'N/A',
                        'Age': calculateDeviceAge(desktop.purchaseDate) + ' years',
                      }));
                      exportToExcel([...summaryData, ...desktopData], `desktops-${format(new Date(), 'yyyy-MM-dd')}`, 'Desktop Inventory');
                    }}
                    className="hover:bg-purple-50 hover:border-purple-300"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
                <Card className="border-2 border-purple-100">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-purple-600" />
                      Desktop Inventory Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop' })} className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-all cursor-pointer">
                        <p className="text-sm text-gray-600 mb-1">Total Desktops</p>
                        <p className="text-3xl font-bold text-gray-900">{desktopStats.total}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', statusFilter: 'available' })} className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200 cursor-pointer">
                        <p className="text-sm text-green-700 mb-1">On-Hand</p>
                        <p className="text-3xl font-bold text-green-800">{desktopStats.onHand}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', statusFilter: 'Deployed' })} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200 cursor-pointer">
                        <p className="text-sm text-blue-700 mb-1">Deployed</p>
                        <p className="text-3xl font-bold text-blue-800">{desktopStats.deployed}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', statusFilter: 'pending' })} className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-200 cursor-pointer">
                        <p className="text-sm text-yellow-700 mb-1">Pending</p>
                        <p className="text-3xl font-bold text-yellow-800">{desktopStats.pendingDeployment}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', conditionFilter: 'Good' })} className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border-2 border-emerald-200 cursor-pointer">
                        <p className="text-sm text-emerald-700 mb-1">Good Condition</p>
                        <p className="text-3xl font-bold text-emerald-800">{desktopStats.goodCondition}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', conditionFilter: 'Bad' })} className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-200 cursor-pointer">
                        <p className="text-sm text-red-700 mb-1">Bad Condition</p>
                        <p className="text-3xl font-bold text-red-800">{desktopStats.badCondition}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', statusFilter: 'Reserved' })} className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200 cursor-pointer">
                        <p className="text-sm text-purple-700 mb-1">Reserved</p>
                        <p className="text-3xl font-bold text-purple-800">{desktopStats.reserved}</p>
                      </div>
                      <div onClick={() => navigateWithFilters({ categoryFilter: 'desktop', statusFilter: 'Deployed' })} className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border-2 border-indigo-200 cursor-pointer">
                        <p className="text-sm text-indigo-700 mb-1">Utilization</p>
                        <p className="text-3xl font-bold text-indigo-800">
                          {Math.round((desktopStats.deployed / desktopStats.total) * 100)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="space-y-4 mt-0">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const deptData = Object.entries(departmentData).map(([dept, data]: [any, any]) => ({
                        department: dept,
                        laptops: data.laptops,
                        desktops: data.desktops,
                        totalDevices: data.laptops + data.desktops,
                        percentage: Math.round(((data.laptops + data.desktops) / deployedAssets.length) * 100) + '%',
                      }));
                      exportToExcel(deptData, `departments-${format(new Date(), 'yyyy-MM-dd')}`, 'Department Distribution');
                    }}
                    className="hover:bg-orange-50 hover:border-orange-300"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
                <Card className="border-2 border-orange-100">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-orange-600" />
                      Department Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {Object.entries(departmentData)
                        .sort(([, a]: [any, any], [, b]: [any, any]) => (b.laptops + b.desktops) - (a.laptops + a.desktops))
                        .map(([dept, data]: [any, any], index: number) => {
                          const total = data.laptops + data.desktops;
                          const percentage = (total / deployedAssets.length) * 100;
                          return (
                            <div key={dept} onClick={() => navigateWithFilters({ departmentFilter: dept, statusFilter: 'Deployed' })} className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{dept}</h4>
                                    <p className="text-xs text-gray-500">
                                      {data.laptops} Laptops • {data.desktops} Desktops
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                  {total} devices
                                </Badge>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-end pr-2"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <span className="text-xs text-white font-medium">
                                    {Math.round(percentage)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Date Range Tab */}
              <TabsContent value="daterange" className="space-y-6 mt-0">
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "To Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                    >
                      Clear Dates
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-600">Additional Filters:</span>

                    <Select value={dateRangeCategoryFilter} onValueChange={setDateRangeCategoryFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={dateRangeStatusFilter} onValueChange={setDateRangeStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="On-Hand">On-Hand</SelectItem>
                        <SelectItem value="Deployed">Deployed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="Reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={dateRangeConditionFilter} onValueChange={setDateRangeConditionFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Bad">Bad</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateRangeCategoryFilter("all");
                        setDateRangeStatusFilter("all");
                        setDateRangeConditionFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const dateRangeData = dateRangeAssets.map(asset => ({
                          'Asset Tag': asset.assetTag || 'N/A',
                          'Name': asset.name || 'N/A',
                          'Category': asset.category || 'N/A',
                          'Model': asset.model || 'N/A',
                          'Serial Number': asset.serialNumber || 'N/A',
                          'Status': asset.status || 'N/A',
                          'Condition': asset.condition || 'N/A',
                          'Department': asset.department || 'N/A',
                          'Purchase Date': asset.purchaseDate && !isNaN(new Date(asset.purchaseDate).getTime()) ? format(new Date(asset.purchaseDate), 'yyyy-MM-dd') : 'N/A',
                          'Cost': asset.cost || 'N/A',
                          'Knox ID': asset.knoxId || 'N/A',
                          'Location': asset.location || 'N/A'
                        }));

                        const dateRangeText = dateFrom && dateTo
                          ? `${format(dateFrom, 'yyyy-MM-dd')}-to-${format(dateTo, 'yyyy-MM-dd')}`
                          : dateFrom
                            ? `from-${format(dateFrom, 'yyyy-MM-dd')}`
                            : dateTo
                              ? `to-${format(dateTo, 'yyyy-MM-dd')}`
                              : 'all-dates';

                        exportToExcel(dateRangeData, `date-range-report-${dateRangeText}`, 'Date Range Report');
                      }}
                      className="hover:bg-orange-50 hover:border-orange-300"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </div>

                <Card className="border-2 border-orange-100">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-orange-600" />
                      Purchase Date Range Report
                      {(dateFrom || dateTo) && (
                        <Badge className="ml-2 bg-orange-600">
                          {dateFrom && dateTo
                            ? `${format(dateFrom, 'MMM dd, yyyy')} - ${format(dateTo, 'MMM dd, yyyy')}`
                            : dateFrom
                              ? `From ${format(dateFrom, 'MMM dd, yyyy')}`
                              : `To ${format(dateTo, 'MMM dd, yyyy')}`
                          }
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                        <p className="text-sm text-blue-700 mb-1">Total Assets</p>
                        <p className="text-3xl font-bold text-blue-800">{dateRangeStats.total}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
                        <p className="text-sm text-purple-700 mb-1">Laptops</p>
                        <p className="text-3xl font-bold text-purple-800">{dateRangeStats.laptops}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-green-700 mb-1">Desktops</p>
                        <p className="text-3xl font-bold text-green-800">{dateRangeStats.desktops}</p>
                      </div>
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border-2 border-teal-200">
                        <p className="text-sm text-teal-700 mb-1">Deployed</p>
                        <p className="text-3xl font-bold text-teal-800">{dateRangeStats.deployed}</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-200">
                        <p className="text-sm text-yellow-700 mb-1">Available</p>
                        <p className="text-3xl font-bold text-yellow-800">{dateRangeStats.available}</p>
                      </div>
                    </div>

                    {dateRangeAssets.length > 0 ? (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {dateRangeAssets.map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => navigateWithFilters({ search: asset.assetTag })}
                            className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg">
                                  {asset.name}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">Asset Tag: {asset.assetTag}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                    {asset.category}
                                  </Badge>
                                  <Badge className={asset.status === 'Deployed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {asset.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Purchase Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {asset.purchaseDate && !isNaN(new Date(asset.purchaseDate).getTime()) ? format(new Date(asset.purchaseDate), 'MMM dd, yyyy') : 'N/A'}
                                </p>
                                {asset.cost && (
                                  <p className="text-lg font-bold text-indigo-600 mt-1">
                                    ${parseFloat(asset.cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Model</p>
                                <p className="text-sm font-medium text-gray-900">{asset.model || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                <p className="text-sm font-medium text-gray-900">{asset.serialNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Department</p>
                                <p className="text-sm font-medium text-gray-900">{asset.department || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Condition</p>
                                <Badge className={asset.condition === 'Good' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {asset.condition || 'N/A'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-600">No Assets Found</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {dateFrom || dateTo
                            ? 'No assets purchased in the selected date range'
                            : 'Please select a date range to view purchased assets'
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Analysis Tab */}
              <TabsContent value="users" className="space-y-6 mt-0">
                <Tabs defaultValue="category1" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="category1">Single Old Laptop ({usersWithOldSingleLaptop.length})</TabsTrigger>
                    <TabsTrigger value="category2">Desktop + Old Laptop ({usersWithDesktopAndOldLaptop.length})</TabsTrigger>
                    <TabsTrigger value="category3">Two Laptops ({usersWithTwoLaptopsNoDesktop.length})</TabsTrigger>
                    <TabsTrigger value="category4">2 Laptops + Desktop ({Array.from(knoxIDUsers.entries()).filter(([knoxId, userAssets]) => {
                      const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                      const userDesktop = userAssets.filter(asset => asset.category?.toLowerCase() === 'desktop');
                      if (userLaptops.length !== 2 || userDesktop.length !== 1) return false;
                      const hasOldLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) >= 5);
                      const hasNewLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) < 5);
                      return hasOldLaptop && hasNewLaptop;
                    }).length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="category1">
                    {/* Category 1: Single 5+ Year Old Laptop */}
                    <Card className="border-2 border-indigo-100">
                      <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-5 w-5 text-indigo-600" />
                            Category 1: Users with Only One 5+ Year Old Laptop
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const exportData = usersWithOldSingleLaptop.map(({ knoxId, assets: userAssets }) => {
                                const laptop = userAssets.find(a => a.category?.toLowerCase() === 'laptop');
                                return {
                                  // User Information
                                  'Category': 'Single 5+ Year Old Laptop',
                                  'Knox ID': knoxId || 'N/A',
                                  'Department': laptop?.department || 'N/A',

                                  // Device Identification
                                  'Asset Tag': laptop?.assetTag || 'N/A',
                                  'Device Name': laptop?.name || 'N/A',
                                  'Serial Number': laptop?.serialNumber || 'N/A',
                                  'Model': laptop?.model || 'N/A',
                                  'Manufacturer': laptop?.manufacturer || 'N/A',

                                  // Device Status & Age
                                  'Status': laptop?.status || 'N/A',
                                  'Condition': laptop?.condition || 'N/A',
                                  'Device Age (Years)': laptop?.purchaseDate ? calculateDeviceAge(laptop.purchaseDate) : 'N/A',
                                  'Purchase Date': laptop?.purchaseDate ? format(new Date(laptop.purchaseDate), 'yyyy-MM-dd') : 'N/A',

                                  // Network & Location
                                  'Location': laptop?.location || 'N/A',
                                  'IP Address': laptop?.ipAddress || 'N/A',
                                  'MAC Address': laptop?.macAddress || 'N/A',
                                  'OS Type': laptop?.osType || 'N/A',

                                  // Assignment & Financial
                                  'Assigned To': laptop?.assignedTo || 'N/A',
                                  'Cost': laptop?.cost || 'N/A',
                                  'Warranty Expiration': laptop?.warrantyExpiration || 'N/A'
                                };
                              });
                              exportToExcel(exportData, `category1-single-old-laptop-${format(new Date(), 'yyyy-MM-dd')}`, 'Category 1');
                            }}
                            className="hover:bg-indigo-50 hover:border-indigo-300"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Category 1
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-indigo-700 mb-1">Total Users Identified</p>
                              <p className="text-4xl font-bold text-indigo-900">{usersWithOldSingleLaptop.length}</p>
                              <p className="text-xs text-indigo-600 mt-2">Users with only 1 laptop (5+ years old) and no desktop</p>
                            </div>
                            <Laptop className="h-16 w-16 text-indigo-400" />
                          </div>
                        </div>

                        {usersWithOldSingleLaptop.length > 0 ? (
                          <>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                              {usersWithOldSingleLaptop.map(({ knoxId, assets: userAssets }) => {
                                const userLaptop = userAssets.find(asset =>
                                  asset.category?.toLowerCase() === 'laptop'
                                );
                                const deviceAge = calculateDeviceAge(userLaptop?.purchaseDate);

                                return (
                                  <div
                                    key={knoxId}
                                    onClick={() => navigateWithFilters({ search: knoxId })}
                                    className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 text-lg">
                                          Knox ID: {knoxId}
                                        </h4>
                                        <Badge className="mt-2 bg-indigo-100 text-indigo-800 border-indigo-300">
                                          {userLaptop?.department || 'No Department'}
                                        </Badge>
                                      </div>
                                      <Badge className="bg-red-100 text-red-800 border-red-300">
                                        {deviceAge} years old
                                      </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                        <p className="text-sm font-medium text-gray-900">{userLaptop?.assetTag || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Device Name</p>
                                        <p className="text-sm font-medium text-gray-900">{userLaptop?.name || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Model</p>
                                        <p className="text-sm font-medium text-gray-900">{userLaptop?.model || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                        <p className="text-sm font-medium text-gray-900">{userLaptop?.serialNumber || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Purchase Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {userLaptop?.purchaseDate && !isNaN(new Date(userLaptop.purchaseDate).getTime()) ? format(new Date(userLaptop.purchaseDate), 'MMM dd, yyyy') : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Condition</p>
                                        <Badge className={userLaptop?.condition === 'Good' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                          {userLaptop?.condition || 'N/A'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Laptop className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-600">No Users Found</p>
                            <p className="text-sm text-gray-500 mt-2">
                              No users currently have a single 5+ year old laptop without a desktop
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </TabsContent>

                  <TabsContent value="category2">
                    {/* Category 2: Desktop + 5+ Year Old Laptop */}
                    <Card className="border-2 border-purple-100">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-purple-600" />
                            Category 2: Users with Desktop + 5+ Year Old Laptop
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const exportData = usersWithDesktopAndOldLaptop.map(({ knoxId, assets: userAssets }) => {
                                const laptop = userAssets.find(a => a.category?.toLowerCase() === 'laptop');
                                const desktop = userAssets.find(a => a.category?.toLowerCase() === 'desktop');
                                return {
                                  // User Information
                                  'Category': 'Desktop + 5+ Year Old Laptop',
                                  'Knox ID': knoxId || 'N/A',
                                  'Department': laptop?.department || desktop?.department || 'N/A',

                                  // === LAPTOP DETAILS ===
                                  // Laptop Identification
                                  'Laptop - Asset Tag': laptop?.assetTag || 'N/A',
                                  'Laptop - Device Name': laptop?.name || 'N/A',
                                  'Laptop - Serial Number': laptop?.serialNumber || 'N/A',
                                  'Laptop - Model': laptop?.model || 'N/A',
                                  'Laptop - Manufacturer': laptop?.manufacturer || 'N/A',

                                  // Laptop Status & Age
                                  'Laptop - Status': laptop?.status || 'N/A',
                                  'Laptop - Condition': laptop?.condition || 'N/A',
                                  'Laptop - Age (Years)': laptop?.purchaseDate ? calculateDeviceAge(laptop.purchaseDate) : 'N/A',
                                  'Laptop - Purchase Date': laptop?.purchaseDate && !isNaN(new Date(laptop.purchaseDate).getTime()) ? format(new Date(laptop.purchaseDate), 'yyyy-MM-dd') : 'N/A',

                                  // Laptop Network & Location
                                  'Laptop - Location': laptop?.location || 'N/A',
                                  'Laptop - IP Address': laptop?.ipAddress || 'N/A',
                                  'Laptop - MAC Address': laptop?.macAddress || 'N/A',
                                  'Laptop - OS Type': laptop?.osType || 'N/A',

                                  // Laptop Assignment & Financial
                                  'Laptop - Assigned To': laptop?.assignedTo || 'N/A',
                                  'Laptop - Cost': laptop?.cost || 'N/A',

                                  // === DESKTOP DETAILS ===
                                  // Desktop Identification
                                  'Desktop - Asset Tag': desktop?.assetTag || 'N/A',
                                  'Desktop - Device Name': desktop?.name || 'N/A',
                                  'Desktop - Serial Number': desktop?.serialNumber || 'N/A',
                                  'Desktop - Model': desktop?.model || 'N/A',
                                  'Desktop - Manufacturer': desktop?.manufacturer || 'N/A',

                                  // Desktop Status
                                  'Desktop - Status': desktop?.status || 'N/A',
                                  'Desktop - Condition': desktop?.condition || 'N/A',

                                  // Desktop Network & Location
                                  'Desktop - Location': desktop?.location || 'N/A',
                                  'Desktop - IP Address': desktop?.ipAddress || 'N/A',
                                  'Desktop - MAC Address': desktop?.macAddress || 'N/A',

                                  // Desktop Assignment & Financial
                                  'Desktop - Assigned To': desktop?.assignedTo || 'N/A',
                                  'Desktop - Cost': desktop?.cost || 'N/A'
                                };
                              });
                              exportToExcel(exportData, `category2-desktop-old-laptop-${format(new Date(), 'yyyy-MM-dd')}`, 'Category 2');
                            }}
                            className="hover:bg-purple-50 hover:border-purple-300"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Category 2
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-purple-700 mb-1">Total Users Identified</p>
                              <p className="text-4xl font-bold text-purple-900">{usersWithDesktopAndOldLaptop.length}</p>
                              <p className="text-xs text-purple-600 mt-2">Users with 1 desktop and 1 laptop (5+ years old)</p>
                            </div>
                            <Monitor className="h-16 w-16 text-purple-400" />
                          </div>
                        </div>

                        {usersWithDesktopAndOldLaptop.length > 0 ? (
                          <>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                              {usersWithDesktopAndOldLaptop.map(({ knoxId, assets: userAssets }) => {
                                const userLaptop = userAssets.find(asset =>
                                  asset.category?.toLowerCase() === 'laptop'
                                );
                                const userDesktop = userAssets.find(asset =>
                                  asset.category?.toLowerCase() === 'desktop'
                                );
                                const laptopAge = calculateDeviceAge(userLaptop?.purchaseDate);

                                return (
                                  <div
                                    key={knoxId}
                                    onClick={() => navigateWithFilters({ search: knoxId })}
                                    className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 text-lg">
                                          Knox ID: {knoxId}
                                        </h4>
                                        <Badge className="mt-2 bg-purple-100 text-purple-800 border-purple-300">
                                          {userLaptop?.department || 'No Department'}
                                        </Badge>
                                      </div>
                                      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                        Laptop: {laptopAge} years old
                                      </Badge>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-2">
                                          <Laptop className="h-4 w-4" />
                                          LAPTOP DETAILS
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                            <p className="text-sm font-medium text-gray-900">{userLaptop?.assetTag || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Model</p>
                                            <p className="text-sm font-medium text-gray-900">{userLaptop?.model || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                            <p className="text-sm font-medium text-gray-900">{userLaptop?.serialNumber || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <p className="text-xs font-semibold text-green-700 mb-3 flex items-center gap-2">
                                          <Monitor className="h-4 w-4" />
                                          DESKTOP DETAILS
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                            <p className="text-sm font-medium text-gray-900">{userDesktop?.assetTag || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Model</p>
                                            <p className="text-sm font-medium text-gray-900">{userDesktop?.model || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                            <p className="text-sm font-medium text-gray-900">{userDesktop?.serialNumber || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Monitor className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-600">No Users Found</p>
                            <p className="text-sm text-gray-500 mt-2">
                              No users currently have a desktop with a 5+ year old laptop
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </TabsContent>

                  <TabsContent value="category3">
                    {/* Category 3: Two Laptops, No Desktop */}
                    <Card className="border-2 border-green-100">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-5 w-5 text-green-600" />
                            Category 3: Users with Two Laptops, No Desktop
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const exportData = usersWithTwoLaptopsNoDesktop.map(({ knoxId, assets: userAssets }) => {
                                const userLaptops = userAssets.filter(a => a.category?.toLowerCase() === 'laptop');
                                const laptop1 = userLaptops[0];
                                const laptop2 = userLaptops[1];
                                return {
                                  // User Information
                                  'Category': 'Two Laptops, No Desktop',
                                  'Knox ID': knoxId || 'N/A',
                                  'Department': laptop1?.department || laptop2?.department || 'N/A',

                                  // === LAPTOP 1 DETAILS ===
                                  // Laptop 1 Identification
                                  'Laptop 1 - Asset Tag': laptop1?.assetTag || 'N/A',
                                  'Laptop 1 - Device Name': laptop1?.name || 'N/A',
                                  'Laptop 1 - Serial Number': laptop1?.serialNumber || 'N/A',
                                  'Laptop 1 - Model': laptop1?.model || 'N/A',
                                  'Laptop 1 - Manufacturer': laptop1?.manufacturer || 'N/A',

                                  // Laptop 1 Status & Age
                                  'Laptop 1 - Status': laptop1?.status || 'N/A',
                                  'Laptop 1 - Condition': laptop1?.condition || 'N/A',
                                  'Laptop 1 - Age (Years)': laptop1?.purchaseDate ? calculateDeviceAge(laptop1.purchaseDate) : 'N/A',
                                  'Laptop 1 - Purchase Date': laptop1?.purchaseDate && !isNaN(new Date(laptop1.purchaseDate).getTime()) ? format(new Date(laptop1.purchaseDate), 'yyyy-MM-dd') : 'N/A',

                                  // Laptop 1 Network & Location
                                  'Laptop 1 - Location': laptop1?.location || 'N/A',
                                  'Laptop 1 - IP Address': laptop1?.ipAddress || 'N/A',
                                  'Laptop 1 - MAC Address': laptop1?.macAddress || 'N/A',
                                  'Laptop 1 - OS Type': laptop1?.osType || 'N/A',
                                  'Laptop 1 - Assigned To': laptop1?.assignedTo || 'N/A',

                                  // === LAPTOP 2 DETAILS ===
                                  // Laptop 2 Identification
                                  'Laptop 2 - Asset Tag': laptop2?.assetTag || 'N/A',
                                  'Laptop 2 - Device Name': laptop2?.name || 'N/A',
                                  'Laptop 2 - Serial Number': laptop2?.serialNumber || 'N/A',
                                  'Laptop 2 - Model': laptop2?.model || 'N/A',
                                  'Laptop 2 - Manufacturer': laptop2?.manufacturer || 'N/A',

                                  // Laptop 2 Status & Age
                                  'Laptop 2 - Status': laptop2?.status || 'N/A',
                                  'Laptop 2 - Condition': laptop2?.condition || 'N/A',
                                  'Laptop 2 - Age (Years)': laptop2?.purchaseDate ? calculateDeviceAge(laptop2.purchaseDate) : 'N/A',
                                  'Laptop 2 - Purchase Date': laptop2?.purchaseDate && !isNaN(new Date(laptop2.purchaseDate).getTime()) ? format(new Date(laptop2.purchaseDate), 'yyyy-MM-dd') : 'N/A',

                                  // Laptop 2 Network & Location
                                  'Laptop 2 - Location': laptop2?.location || 'N/A',
                                  'Laptop 2 - IP Address': laptop2?.ipAddress || 'N/A',
                                  'Laptop 2 - MAC Address': laptop2?.macAddress || 'N/A',
                                  'Laptop 2 - OS Type': laptop2?.osType || 'N/A',
                                  'Laptop 2 - Assigned To': laptop2?.assignedTo || 'N/A'
                                };
                              });
                              exportToExcel(exportData, `category3-two-laptops-${format(new Date(), 'yyyy-MM-dd')}`, 'Category 3');
                            }}
                            className="hover:bg-green-50 hover:border-green-300"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Category 3
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="mb-6 bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-xl border-2 border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700 mb-1">Total Users Identified</p>
                              <p className="text-4xl font-bold text-green-900">{usersWithTwoLaptopsNoDesktop.length}</p>
                              <p className="text-xs text-green-600 mt-2">Users with exactly 2 laptops and no desktop</p>
                            </div>
                            <Laptop className="h-16 w-16 text-green-400" />
                          </div>
                        </div>

                        {usersWithTwoLaptopsNoDesktop.length > 0 ? (
                          <>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                              {usersWithTwoLaptopsNoDesktop.map(({ knoxId, assets: userAssets }) => {
                                const userLaptops = userAssets.filter(asset =>
                                  asset.category?.toLowerCase() === 'laptop'
                                );
                                const laptop1 = userLaptops[0];
                                const laptop2 = userLaptops[1];
                                const laptop1Age = calculateDeviceAge(laptop1?.purchaseDate);
                                const laptop2Age = calculateDeviceAge(laptop2?.purchaseDate);

                                return (
                                  <div
                                    key={knoxId}
                                    onClick={() => navigateWithFilters({ search: knoxId })}
                                    className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 text-lg">
                                          Knox ID: {knoxId}
                                        </h4>
                                        <Badge className="mt-2 bg-green-100 text-green-800 border-green-300">
                                          {laptop1?.department || 'No Department'}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                          2 Laptops
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                        <p className="text-xs font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                                          <Laptop className="h-4 w-4" />
                                          LAPTOP 1 - {laptop1Age} years old
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                            <p className="text-sm font-medium text-gray-900">{laptop1?.assetTag || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Model</p>
                                            <p className="text-sm font-medium text-gray-900">{laptop1?.model || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                            <p className="text-sm font-medium text-gray-900">{laptop1?.serialNumber || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                                        <p className="text-xs font-semibold text-cyan-700 mb-3 flex items-center gap-2">
                                          <Laptop className="h-4 w-4" />
                                          LAPTOP 2 - {laptop2Age} years old
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                            <p className="text-sm font-medium text-gray-900">{laptop2?.assetTag || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Model</p>
                                            <p className="text-sm font-medium text-gray-900">{laptop2?.model || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                            <p className="text-sm font-medium text-gray-900">{laptop2?.serialNumber || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Laptop className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-600">No Users Found</p>
                            <p className="text-sm text-gray-500 mt-2">
                              No users currently have exactly two laptops without a desktop
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="category4">
                    {/* Category 4: Two Laptops (one old, one new) + Desktop */}
                    <Card className="border-2 border-orange-100">
                      <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-orange-600" />
                            Category 4: Users with Two Laptops + Desktop
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const exportData = Array.from(knoxIDUsers.entries())
                                .filter(([knoxId, userAssets]) => {
                                  const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                                  const userDesktop = userAssets.filter(asset => asset.category?.toLowerCase() === 'desktop');
                                  if (userLaptops.length !== 2 || userDesktop.length !== 1) return false;
                                  const hasOldLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) >= 5);
                                  const hasNewLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) < 5);
                                  return hasOldLaptop && hasNewLaptop;
                                })
                                .map(([knoxId, userAssets]) => {
                                  const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                                  const userDesktop = userAssets.find(asset => asset.category?.toLowerCase() === 'desktop');
                                  const oldLaptop = userLaptops.find(l => calculateDeviceAge(l.purchaseDate) >= 5);
                                  const newLaptop = userLaptops.find(l => calculateDeviceAge(l.purchaseDate) < 5);

                                  return {
                                    // User Information
                                    'Category': 'Two Laptops + One Desktop',
                                    'Knox ID': knoxId || 'N/A',
                                    'Department': oldLaptop?.department || newLaptop?.department || userDesktop?.department || 'N/A',

                                    // === OLD LAPTOP (5+ Years) ===
                                    // Old Laptop Identification
                                    'Old Laptop - Asset Tag': oldLaptop?.assetTag || 'N/A',
                                    'Old Laptop - Device Name': oldLaptop?.name || 'N/A',
                                    'Old Laptop - Serial Number': oldLaptop?.serialNumber || 'N/A',
                                    'Old Laptop - Model': oldLaptop?.model || 'N/A',
                                    'Old Laptop - Manufacturer': oldLaptop?.manufacturer || 'N/A',

                                    // Old Laptop Status & Age
                                    'Old Laptop - Status': oldLaptop?.status || 'N/A',
                                    'Old Laptop - Condition': oldLaptop?.condition || 'N/A',
                                    'Old Laptop - Age (Years)': oldLaptop?.purchaseDate ? calculateDeviceAge(oldLaptop.purchaseDate) : 'N/A',
                                    'Old Laptop - Purchase Date': oldLaptop?.purchaseDate && !isNaN(new Date(oldLaptop.purchaseDate).getTime()) ? format(new Date(oldLaptop.purchaseDate), 'yyyy-MM-dd') : 'N/A',

                                    // Old Laptop Network & Location
                                    'Old Laptop - Location': oldLaptop?.location || 'N/A',
                                    'Old Laptop - IP Address': oldLaptop?.ipAddress || 'N/A',
                                    'Old Laptop - MAC Address': oldLaptop?.macAddress || 'N/A',
                                    'Old Laptop - Assigned To': oldLaptop?.assignedTo || 'N/A',

                                    // === NEW LAPTOP (<5 Years) ===
                                    // New Laptop Identification
                                    'New Laptop - Asset Tag': newLaptop?.assetTag || 'N/A',
                                    'New Laptop - Device Name': newLaptop?.name || 'N/A',
                                    'New Laptop - Serial Number': newLaptop?.serialNumber || 'N/A',
                                    'New Laptop - Model': newLaptop?.model || 'N/A',
                                    'New Laptop - Manufacturer': newLaptop?.manufacturer || 'N/A',

                                    // New Laptop Status & Age
                                    'New Laptop - Status': newLaptop?.status || 'N/A',
                                    'New Laptop - Condition': newLaptop?.condition || 'N/A',
                                    'New Laptop - Age (Years)': newLaptop?.purchaseDate ? calculateDeviceAge(newLaptop.purchaseDate) : 'N/A',
                                    'New Laptop - Purchase Date': newLaptop?.purchaseDate && !isNaN(new Date(newLaptop.purchaseDate).getTime()) ? format(new Date(newLaptop.purchaseDate), 'yyyy-MM-dd') : 'N/A',

                                    // New Laptop Network & Location
                                    'New Laptop - Location': newLaptop?.location || 'N/A',
                                    'New Laptop - IP Address': newLaptop?.ipAddress || 'N/A',
                                    'New Laptop - MAC Address': newLaptop?.macAddress || 'N/A',
                                    'New Laptop - Assigned To': newLaptop?.assignedTo || 'N/A',

                                    // === DESKTOP ===
                                    // Desktop Identification
                                    'Desktop - Asset Tag': userDesktop?.assetTag || 'N/A',
                                    'Desktop - Device Name': userDesktop?.name || 'N/A',
                                    'Desktop - Serial Number': userDesktop?.serialNumber || 'N/A',
                                    'Desktop - Model': userDesktop?.model || 'N/A',
                                    'Desktop - Manufacturer': userDesktop?.manufacturer || 'N/A',

                                    // Desktop Status
                                    'Desktop - Status': userDesktop?.status || 'N/A',
                                    'Desktop - Condition': userDesktop?.condition || 'N/A',

                                    // Desktop Network & Location
                                    'Desktop - Location': userDesktop?.location || 'N/A',
                                    'Desktop - IP Address': userDesktop?.ipAddress || 'N/A',
                                    'Desktop - MAC Address': userDesktop?.macAddress || 'N/A',
                                    'Desktop - Assigned To': userDesktop?.assignedTo || 'N/A'
                                  };
                                });
                              exportToExcel(exportData, `category4-two-laptops-desktop-${format(new Date(), 'yyyy-MM-dd')}`, 'Category 4');
                            }}
                            className="hover:bg-orange-50 hover:border-orange-300"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Category 4
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-orange-700 mb-1">Total Users Identified</p>
                              <p className="text-4xl font-bold text-orange-900">
                                {Array.from(knoxIDUsers.entries()).filter(([knoxId, userAssets]) => {
                                  const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                                  const userDesktop = userAssets.filter(asset => asset.category?.toLowerCase() === 'desktop');
                                  if (userLaptops.length !== 2 || userDesktop.length !== 1) return false;
                                  const hasOldLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) >= 5);
                                  const hasNewLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) < 5);
                                  return hasOldLaptop && hasNewLaptop;
                                }).length}
                              </p>
                              <p className="text-xs text-orange-600 mt-2">Users with 2 laptops (one old, one new) + 1 desktop</p>
                            </div>
                            <Monitor className="h-16 w-16 text-orange-400" />
                          </div>
                        </div>

                        {Array.from(knoxIDUsers.entries())
                          .filter(([knoxId, userAssets]) => {
                            const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                            const userDesktop = userAssets.filter(asset => asset.category?.toLowerCase() === 'desktop');
                            if (userLaptops.length !== 2 || userDesktop.length !== 1) return false;
                            const hasOldLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) >= 5);
                            const hasNewLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) < 5);
                            return hasOldLaptop && hasNewLaptop;
                          }).length > 0 ? (
                          <>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                              {Array.from(knoxIDUsers.entries())
                                .filter(([knoxId, userAssets]) => {
                                  const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                                  const userDesktop = userAssets.filter(asset => asset.category?.toLowerCase() === 'desktop');
                                  if (userLaptops.length !== 2 || userDesktop.length !== 1) return false;
                                  const hasOldLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) >= 5);
                                  const hasNewLaptop = userLaptops.some(l => calculateDeviceAge(l.purchaseDate) < 5);
                                  return hasOldLaptop && hasNewLaptop;
                                })
                                .map(([knoxId, userAssets]) => {
                                  const userLaptops = userAssets.filter(asset => asset.category?.toLowerCase() === 'laptop');
                                  const userDesktop = userAssets.find(asset => asset.category?.toLowerCase() === 'desktop');
                                  const oldLaptop = userLaptops.find(l => calculateDeviceAge(l.purchaseDate) >= 5);
                                  const newLaptop = userLaptops.find(l => calculateDeviceAge(l.purchaseDate) < 5);
                                  const oldLaptopAge = calculateDeviceAge(oldLaptop?.purchaseDate);
                                  const newLaptopAge = calculateDeviceAge(newLaptop?.purchaseDate);

                                  return (
                                    <div
                                      key={knoxId}
                                      onClick={() => navigateWithFilters({ search: knoxId })}
                                      className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                                    >
                                      <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-900 text-lg">
                                            Knox ID: {knoxId}
                                          </h4>
                                          <Badge className="mt-2 bg-orange-100 text-orange-800 border-orange-300">
                                            {oldLaptop?.department || 'No Department'}
                                          </Badge>
                                        </div>
                                        <div className="flex gap-2">
                                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                            3 Devices
                                          </Badge>
                                        </div>
                                      </div>

                                      <div className="space-y-4">
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                          <p className="text-xs font-semibold text-red-700 mb-3 flex items-center gap-2">
                                            <Laptop className="h-4 w-4" />
                                            OLD LAPTOP - {oldLaptopAge} years old
                                          </p>
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                              <p className="text-sm font-medium text-gray-900">{oldLaptop?.assetTag || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Model</p>
                                              <p className="text-sm font-medium text-gray-900">{oldLaptop?.model || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                              <p className="text-sm font-medium text-gray-900">{oldLaptop?.serialNumber || 'N/A'}</p>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-2">
                                            <Laptop className="h-4 w-4" />
                                            NEW LAPTOP - {newLaptopAge} years old
                                          </p>
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                              <p className="text-sm font-medium text-gray-900">{newLaptop?.assetTag || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Model</p>
                                              <p className="text-sm font-medium text-gray-900">{newLaptop?.model || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                              <p className="text-sm font-medium text-gray-900">{newLaptop?.serialNumber || 'N/A'}</p>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                          <p className="text-xs font-semibold text-green-700 mb-3 flex items-center gap-2">
                                            <Monitor className="h-4 w-4" />
                                            DESKTOP
                                          </p>
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Asset Tag</p>
                                              <p className="text-sm font-medium text-gray-900">{userDesktop?.assetTag || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Model</p>
                                              <p className="text-sm font-medium text-gray-900">{userDesktop?.model || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                              <p className="text-sm font-medium text-gray-900">{userDesktop?.serialNumber || 'N/A'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Monitor className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-600">No Users Found</p>
                            <p className="text-sm text-gray-500 mt-2">
                              No users currently have two laptops (one old, one new) with a desktop
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}