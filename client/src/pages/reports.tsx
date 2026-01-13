import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCSV } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  Filter, 
  Search, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Package,
  Users,
  Activity,
  FileSpreadsheet,
  Laptop,
  Monitor,
  Building2,
  Clock,
  User,
  History
} from "lucide-react";
import { format } from "date-fns";

interface ReportData {
  assets: any[];
  users: any[];
  activities: any[];
  consumables: any[];
  licenses: any[];
}

export default function Reports() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState("device-summary");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Fetch data for reports
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const response = await fetch("/api/assets", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch assets");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });

  const { data: consumables = [] } = useQuery({
    queryKey: ["consumables"],
    queryFn: async () => {
      const response = await fetch("/api/consumables", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch consumables");
      return response.json();
    },
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch licenses");
      return response.json();
    },
  });

  useEffect(() => {
    setReportData({
      assets,
      users,
      activities,
      consumables,
      licenses
    });
  }, [assets, users, activities, consumables, licenses]);

  // Calculate device age in years
  const calculateDeviceAge = (purchaseDate: string) => {
    if (!purchaseDate) return 0;
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const ageInYears = Math.floor((now.getTime() - purchase.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return ageInYears;
  };

  // Device Summary Calculations
  const laptops = assets.filter(asset => asset.category?.toLowerCase() === 'laptop');
  const desktops = assets.filter(asset => asset.category?.toLowerCase() === 'desktop');

  const laptopStats = {
    total: laptops.length,
    onHand: laptops.filter(laptop => laptop.status === 'available' || laptop.status === 'On-Hand').length,
    deployed: laptops.filter(laptop => laptop.status === 'Deployed').length,
    pendingDeployment: laptops.filter(laptop => laptop.status === 'pending').length,
    goodCondition: laptops.filter(laptop => laptop.condition === 'Good').length,
    badCondition: laptops.filter(laptop => laptop.condition === 'Bad').length,
    reserved: laptops.filter(laptop => laptop.status === 'Reserved').length
  };

  const desktopStats = {
    total: desktops.length,
    onHand: desktops.filter(desktop => desktop.status === 'available' || desktop.status === 'On-Hand').length,
    deployed: desktops.filter(desktop => desktop.status === 'Deployed').length,
    pendingDeployment: desktops.filter(desktop => desktop.status === 'pending').length,
    goodCondition: desktops.filter(desktop => desktop.condition === 'Good').length,
    badCondition: desktops.filter(desktop => desktop.condition === 'Bad').length,
    reserved: desktops.filter(desktop => desktop.status === 'Reserved').length
  };

  // Department Summary
  const departmentSummary = assets.reduce((acc: any, asset: any) => {
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
  }, {});

  // Laptop Age Analysis
  const laptopAgeStats = {
    oneYear: laptops.filter(laptop => calculateDeviceAge(laptop.purchaseDate) === 1).length,
    twoYears: laptops.filter(laptop => calculateDeviceAge(laptop.purchaseDate) === 2).length,
    threeYears: laptops.filter(laptop => calculateDeviceAge(laptop.purchaseDate) === 3).length,
    fourYears: laptops.filter(laptop => calculateDeviceAge(laptop.purchaseDate) === 4).length,
    fiveYears: laptops.filter(laptop => calculateDeviceAge(laptop.purchaseDate) === 5).length,
    moreThanFive: laptops.filter(laptop => calculateDeviceAge(laptop.purchaseDate) > 5).length
  };

  // Users with single 5+ year old laptop (no desktop, only 1 laptop that is 5+ years old)
  const usersWithOldSingleLaptop = users.filter(user => {
    // Get all assets assigned to this user that are deployed/assigned
    const userAssets = assets.filter(asset => 
      asset.assignedTo === user.id && 
      (asset.status === 'Deployed' || asset.status === 'deployed' || asset.status === 'assigned')
    );

    // Get user laptops
    const userLaptops = userAssets.filter(asset => 
      asset.category?.toLowerCase() === 'laptop'
    );

    // Get user desktops
    const userDesktops = userAssets.filter(asset => 
      asset.category?.toLowerCase() === 'desktop'
    );

    // Must have exactly 1 laptop and 0 desktops
    if (userLaptops.length !== 1 || userDesktops.length !== 0) {
      return false;
    }

    // Check if the single laptop is 5+ years old
    const singleLaptop = userLaptops[0];
    const deviceAge = calculateDeviceAge(singleLaptop.purchaseDate);
    
    return deviceAge >= 5;
  });

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Report Generated",
        description: "Your report has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (format: string) => {
    console.log('Export report called with format:', format);
    console.log('Selected report:', selectedReport);
    console.log('Report data available:', !!reportData);

    try {
      if (!reportData) {
        console.error('No report data available');
        toast({
          title: "Export Error",
          description: "No data available to export. Please wait for data to load.",
          variant: "destructive",
        });
        return;
      }

      const currentData = getReportData(selectedReport);
      console.log('Current data for export:', currentData);

      if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
        console.error('No current data available for export');
        toast({
          title: "Export Error",
          description: "No data available to export for this report type.",
          variant: "destructive",
        });
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${selectedReport}-report-${timestamp}`;

      if (format === 'csv') {
        console.log('Exporting to CSV...');
        exportToCSV(currentData, filename);
      } else if (format === 'excel') {
        console.log('Exporting to Excel...');
        exportToExcel(currentData, filename, selectedReport);
      } else if (format === 'json') {
        console.log('Exporting to JSON...');
        exportToJSON(currentData, filename);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const exportToExcel = (data: any[], filename: string, reportType: string) => {
    console.log('Attempting to export Excel with data:', data);

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('No data available for export');
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
        row['ageCategory']?.includes('SUMMARY') ||
        row['analysisType']?.includes('SUMMARY') ||
        row['department']?.includes('SUMMARY') ||
        row['Device Type'] === 'SUMMARY - Total All Devices' ||
        row['Device Type'] === 'GRAND TOTAL'
      );

      const detailData = data.filter(row => 
        !row['Device Type']?.includes('SUMMARY') && 
        !row['ageCategory']?.includes('SUMMARY') &&
        !row['analysisType']?.includes('SUMMARY') &&
        !row['department']?.includes('SUMMARY') &&
        row['Device Type'] !== '--- DETAILED RECORDS START BELOW ---' &&
        row['ageCategory'] !== '--- DETAILED RECORDS START BELOW ---' &&
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
                  <x:Name>Device Details</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
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

      // Device Details Sheet
      if (detailData.length > 0) {
        excelContent += '<table border="1"><caption>Device Details</caption>';
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

      console.log('Excel export completed successfully');
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
  };

  const exportToCSV = (data: any[], filename: string) => {
    console.log('Attempting to export CSV with data:', data);

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('No data available for export');
      toast({
        title: "Export Error",
        description: "No data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Escape CSV values that contain commas, quotes, or newlines
      const escapeCSVValue = (value: any): string => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Get headers from the first row
      const firstRow = data[0];
      if (!firstRow || typeof firstRow !== 'object') {
        throw new Error('Invalid data format - first row is not an object');
      }

      const keys = Object.keys(firstRow);
      if (keys.length === 0) {
        throw new Error('No columns found in data');
      }

      // Create proper headers with capitalization
      const headers = keys.map(key => {
        return key.replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();
      });

      console.log('CSV Headers:', headers);

      // Create CSV content with BOM for proper encoding
      const csvRows = [];
      csvRows.push(headers.map(h => escapeCSVValue(h)).join(','));

      data.forEach((row, index) => {
        try {
          const values = keys.map(key => {
            const value = row[key];
            return escapeCSVValue(value);
          });
          csvRows.push(values.join(','));
        } catch (rowError) {
          console.error(`Error processing row ${index}:`, rowError, row);
        }
      });

      // Add BOM for UTF-8 encoding
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      console.log('CSV content length:', csvContent.length);

      // Create and download the file
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('CSV export completed successfully');
      toast({
        title: "Export Successful",
        description: `CSV file "${filename}.csv" has been downloaded with ${data.length} records.`,
      });

    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const exportToJSON = (data: any[], filename: string) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      toast({
        title: "Export Error",
        description: "No data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = {
        reportType: selectedReport,
        reportName: selectedReport.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        generatedAt: new Date().toISOString(),
        generatedBy: 'SRPH-MIS Report System',
        totalRecords: data.length,
        data: data
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `JSON file "${filename}.json" has been downloaded.`,
      });
    } catch (error) {
      console.error('JSON export error:', error);
      toast({
        title: "Export Error",
        description: "Failed to export JSON file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getReportData = (reportType: string) => {
    console.log('Getting report data for type:', reportType);
    console.log('Report data available:', !!reportData);

    if (!reportData) {
      console.warn('No report data available');
      return [];
    }

    try {
      let result: any[] = [];

      switch (reportType) {
        case 'vm-inventory':
          // Get VM inventory data from reportData instead of making async calls
          const vmData = reportData.assets.filter(asset => asset.category?.toLowerCase().includes('vm') || asset.vmName) || [];
          
          result = vmData.map(vm => ({
            'VM ID': vm.vmId || vm.id || 'N/A',
            'VM Name': vm.vmName || vm.name || 'N/A',
            'Status': vm.vmStatus || vm.status || 'N/A',
            'VM IP': vm.vmIp || vm.ipAddress || 'N/A',
            'OS': vm.vmOs || vm.osType || 'N/A',
            'CPU Count': vm.cpuCount || 'N/A',
            'Memory (GB)': vm.memoryGB || vm.memoryGb || 'N/A',
            'Disk Capacity (GB)': vm.diskCapacityGB || vm.diskGB || 'N/A',
            'Requestor': vm.requestor || 'N/A',
            'Knox ID': vm.knoxId || 'N/A',
            'Department': vm.department || 'N/A',
            'Start Date': vm.startDate || 'N/A',
            'End Date': vm.endDate || 'N/A',
            'JIRA Number': vm.jiraNumber || vm.jiraTicket || 'N/A',
            'Approval Number': vm.approvalNumber || 'N/A',
            'Approval History Count': vm.approvalHistoryCount || 0,
            'Last Approval Change': vm.lastApprovalChange || 'N/A',
            'Remarks': vm.remarks || 'N/A',
            'Created At': vm.createdAt || 'N/A',
            'Updated At': vm.updatedAt || 'N/A'
          }));
          break;

          
          break;

        case 'device-summary':
          // Add summary totals first
          const deviceSummaryTotals = [
            {
              'Device Type': 'SUMMARY - Laptop',
              'Total Devices': laptopStats.total,
              'On Hand Devices': laptopStats.onHand,
              'Deployed Devices': laptopStats.deployed,
              'Pending Devices': laptopStats.pendingDeployment,
              'Good Condition': laptopStats.goodCondition,
              'Bad Condition': laptopStats.badCondition,
              'Reserved Devices': laptopStats.reserved,
              'Asset Tag': 'TOTAL',
              'Device Name': 'SUMMARY TOTALS',
              'Serial Number': 'N/A',
              'Knox ID': 'N/A',
              'Model': 'N/A',
              'Manufacturer': 'N/A',
              'Status': 'SUMMARY',
              'Condition': 'SUMMARY',
              'Department': 'N/A',
              'Assigned To': 'N/A',
              'Purchase Date': 'N/A',
              'Location': 'N/A',
              'IP Address': 'N/A',
              'MAC Address': 'N/A',
              'OS Type': 'N/A'
            },
            {
              'Device Type': 'SUMMARY - Desktop',
              'Total Devices': desktopStats.total,
              'On Hand Devices': desktopStats.onHand,
              'Deployed Devices': desktopStats.deployed,
              'Pending Devices': desktopStats.pendingDeployment,
              'Good Condition': desktopStats.goodCondition,
              'Bad Condition': desktopStats.badCondition,
              'Reserved Devices': desktopStats.reserved,
              'Asset Tag': 'TOTAL',
              'Device Name': 'SUMMARY TOTALS',
              'Serial Number': 'N/A',
              'Knox ID': 'N/A',
              'Model': 'N/A',
              'Manufacturer': 'N/A',
              'Status': 'SUMMARY',
              'Condition': 'SUMMARY',
              'Department': 'N/A',
              'Assigned To': 'N/A',
              'Purchase Date': 'N/A',
              'Location': 'N/A',
              'IP Address': 'N/A',
              'MAC Address': 'N/A',
              'OS Type': 'N/A'
            },
            {
              'Device Type': 'SUMMARY - Total All Devices',
              'Total Devices': laptopStats.total + desktopStats.total,
              'On Hand Devices': laptopStats.onHand + desktopStats.onHand,
              'Deployed Devices': laptopStats.deployed + desktopStats.deployed,
              'Pending Devices': laptopStats.pendingDeployment + desktopStats.pendingDeployment,
              'Good Condition': laptopStats.goodCondition + desktopStats.goodCondition,
              'Bad Condition': laptopStats.badCondition + desktopStats.badCondition,
              'Reserved Devices': laptopStats.reserved + desktopStats.reserved,
              'Asset Tag': 'GRAND TOTAL',
              'Device Name': 'GRAND TOTAL SUMMARY',
              'Serial Number': 'N/A',
              'Knox ID': 'N/A',
              'Model': 'N/A',
              'Manufacturer': 'N/A',
              'Status': 'SUMMARY',
              'Condition': 'SUMMARY',
              'Department': 'N/A',
              'Assigned To': 'N/A',
              'Purchase Date': 'N/A',
              'Location': 'N/A',
              'IP Address': 'N/A',
              'MAC Address': 'N/A',
              'OS Type': 'N/A'
            },
            {
              'Device Type': '--- DETAILED RECORDS START BELOW ---',
              'Total Devices': '',
              'On Hand Devices': '',
              'Deployed Devices': '',
              'Pending Devices': '',
              'Good Condition': '',
              'Bad Condition': '',
              'Reserved Devices': '',
              'Asset Tag': '--- SEPARATOR ---',
              'Device Name': '--- SEPARATOR ---',
              'Serial Number': '--- SEPARATOR ---',
              'Knox ID': '--- SEPARATOR ---',
              'Model': '--- SEPARATOR ---',
              'Manufacturer': '--- SEPARATOR ---',
              'Status': '--- SEPARATOR ---',
              'Condition': '--- SEPARATOR ---',
              'Department': '--- SEPARATOR ---',
              'Assigned To': '--- SEPARATOR ---',
              'Purchase Date': '--- SEPARATOR ---',
              'Location': '--- SEPARATOR ---',
              'IP Address': '--- SEPARATOR ---',
              'MAC Address': '--- SEPARATOR ---',
              'OS Type': '--- SEPARATOR ---'
            }
          ];

          // Get detailed device information for each category
          const laptopDetails = laptops.map(laptop => ({
            'Device Type': 'Laptop',
            'Total Devices': '',
            'On Hand Devices': '',
            'Deployed Devices': '',
            'Pending Devices': '',
            'Good Condition': '',
            'Bad Condition': '',
            'Reserved Devices': '',
            'Asset Tag': laptop.assetTag || 'N/A',
            'Device Name': laptop.name || 'N/A',
            'Serial Number': laptop.serialNumber || 'N/A',
            'Knox ID': laptop.knoxId || 'N/A',
            'Model': laptop.model || 'N/A',
            'Manufacturer': laptop.manufacturer || 'N/A',
            'Status': laptop.status || 'N/A',
            'Condition': laptop.condition || 'N/A',
            'Department': laptop.department || 'N/A',
            'Assigned To': laptop.assignedTo || 'N/A',
            'Purchase Date': laptop.purchaseDate || 'N/A',
            'Location': laptop.location || 'N/A',
            'IP Address': laptop.ipAddress || 'N/A',
            'MAC Address': laptop.macAddress || 'N/A',
            'OS Type': laptop.osType || 'N/A'
          }));

          const desktopDetails = desktops.map(desktop => ({
            'Device Type': 'Desktop',
            'Total Devices': '',
            'On Hand Devices': '',
            'Deployed Devices': '',
            'Pending Devices': '',
            'Good Condition': '',
            'Bad Condition': '',
            'Reserved Devices': '',
            'Asset Tag': desktop.assetTag || 'N/A',
            'Device Name': desktop.name || 'N/A',
            'Serial Number': desktop.serialNumber || 'N/A',
            'Knox ID': desktop.knoxId || 'N/A',
            'Model': desktop.model || 'N/A',
            'Manufacturer': desktop.manufacturer || 'N/A',
            'Status': desktop.status || 'N/A',
            'Condition': desktop.condition || 'N/A',
            'Department': desktop.department || 'N/A',
            'Assigned To': desktop.assignedTo || 'N/A',
            'Purchase Date': desktop.purchaseDate || 'N/A',
            'Location': desktop.location || 'N/A',
            'IP Address': desktop.ipAddress || 'N/A',
            'MAC Address': desktop.macAddress || 'N/A',
            'OS Type': desktop.osType || 'N/A'
          }));

          result = [...deviceSummaryTotals, ...laptopDetails, ...desktopDetails];
          break;

        case 'department-summary':
          // Add department summary totals first
          const departmentSummaryTotals = [];
          
          // Add overall summary
          const totalLaptopsDeployed = Object.values(departmentSummary).reduce((sum, dept: any) => sum + dept.laptops, 0);
          const totalDesktopsDeployed = Object.values(departmentSummary).reduce((sum, dept: any) => sum + dept.desktops, 0);
          
          departmentSummaryTotals.push({
            department: 'SUMMARY - Total All Departments',
            totalLaptops: totalLaptopsDeployed,
            totalDesktops: totalDesktopsDeployed,
            totalDevices: totalLaptopsDeployed + totalDesktopsDeployed,
            deviceType: 'SUMMARY',
            assetTag: 'TOTAL',
            deviceName: 'SUMMARY TOTALS',
            serialNumber: 'N/A',
            knoxId: 'N/A',
            model: 'N/A',
            manufacturer: 'N/A',
            assignedTo: 'N/A',
            status: 'SUMMARY',
            condition: 'N/A',
            purchaseDate: 'N/A',
            location: 'N/A',
            ipAddress: 'N/A',
            macAddress: 'N/A',
            osType: 'N/A'
          });

          // Add department-wise totals
          Object.keys(departmentSummary).forEach(dept => {
            departmentSummaryTotals.push({
              department: `SUMMARY - ${dept}`,
              totalLaptops: departmentSummary[dept].laptops,
              totalDesktops: departmentSummary[dept].desktops,
              totalDevices: departmentSummary[dept].laptops + departmentSummary[dept].desktops,
              deviceType: 'SUMMARY',
              assetTag: 'DEPT TOTAL',
              deviceName: 'DEPARTMENT SUMMARY',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              assignedTo: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              purchaseDate: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            });
          });

          departmentSummaryTotals.push({
            department: '--- DETAILED RECORDS START BELOW ---',
            totalLaptops: '',
            totalDesktops: '',
            totalDevices: '',
            deviceType: '--- SEPARATOR ---',
            assetTag: '--- SEPARATOR ---',
            deviceName: '--- SEPARATOR ---',
            serialNumber: '--- SEPARATOR ---',
            knoxId: '--- SEPARATOR ---',
            model: '--- SEPARATOR ---',
            manufacturer: '--- SEPARATOR ---',
            assignedTo: '--- SEPARATOR ---',
            status: '--- SEPARATOR ---',
            condition: '--- SEPARATOR ---',
            purchaseDate: '--- SEPARATOR ---',
            location: '--- SEPARATOR ---',
            ipAddress: '--- SEPARATOR ---',
            macAddress: '--- SEPARATOR ---',
            osType: '--- SEPARATOR ---'
          });

          // Get detailed device information by department
          const departmentDetails = assets.filter(asset => asset.status === 'Deployed' && asset.department).map(asset => ({
            department: asset.department || 'N/A',
            totalLaptops: '',
            totalDesktops: '',
            totalDevices: '',
            deviceType: asset.category || 'N/A',
            assetTag: asset.assetTag || 'N/A',
            deviceName: asset.name || 'N/A',
            serialNumber: asset.serialNumber || 'N/A',
            knoxId: asset.knoxId || 'N/A',
            model: asset.model || 'N/A',
            manufacturer: asset.manufacturer || 'N/A',
            assignedTo: asset.assignedTo || 'N/A',
            status: asset.status || 'N/A',
            condition: asset.condition || 'N/A',
            purchaseDate: asset.purchaseDate || 'N/A',
            location: asset.location || 'N/A',
            ipAddress: asset.ipAddress || 'N/A',
            macAddress: asset.macAddress || 'N/A',
            osType: asset.osType || 'N/A'
          }));

          result = [...departmentSummaryTotals, ...departmentDetails];
          break;

        case 'laptop-age':
          // Add laptop age summary totals first
          const laptopAgeSummaryTotals = [
            {
              ageCategory: 'SUMMARY - 1 Year Old',
              totalLaptops: laptopAgeStats.oneYear,
              assetTag: 'AGE TOTAL',
              deviceName: 'SUMMARY TOTALS',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: 1,
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: 'SUMMARY - 2 Years Old',
              totalLaptops: laptopAgeStats.twoYears,
              assetTag: 'AGE TOTAL',
              deviceName: 'SUMMARY TOTALS',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: 2,
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: 'SUMMARY - 3 Years Old',
              totalLaptops: laptopAgeStats.threeYears,
              assetTag: 'AGE TOTAL',
              deviceName: 'SUMMARY TOTALS',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: 3,
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: 'SUMMARY - 4 Years Old',
              totalLaptops: laptopAgeStats.fourYears,
              assetTag: 'AGE TOTAL',
              deviceName: 'SUMMARY TOTALS',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: 4,
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: 'SUMMARY - 5 Years Old',
              totalLaptops: laptopAgeStats.fiveYears,
              assetTag: 'AGE TOTAL',
              deviceName: 'SUMMARY TOTALS',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: 5,
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: 'SUMMARY - 5+ Years Old',
              totalLaptops: laptopAgeStats.moreThanFive,
              assetTag: 'AGE TOTAL',
              deviceName: 'SUMMARY TOTALS',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: '5+',
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: 'SUMMARY - Total All Laptops',
              totalLaptops: laptops.length,
              assetTag: 'GRAND TOTAL',
              deviceName: 'GRAND TOTAL SUMMARY',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              model: 'N/A',
              manufacturer: 'N/A',
              ageInYears: 'ALL',
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              department: 'N/A',
              assignedTo: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              ageCategory: '--- DETAILED RECORDS START BELOW ---',
              totalLaptops: '',
              assetTag: '--- SEPARATOR ---',
              deviceName: '--- SEPARATOR ---',
              serialNumber: '--- SEPARATOR ---',
              knoxId: '--- SEPARATOR ---',
              model: '--- SEPARATOR ---',
              manufacturer: '--- SEPARATOR ---',
              ageInYears: '--- SEPARATOR ---',
              purchaseDate: '--- SEPARATOR ---',
              status: '--- SEPARATOR ---',
              condition: '--- SEPARATOR ---',
              department: '--- SEPARATOR ---',
              assignedTo: '--- SEPARATOR ---',
              location: '--- SEPARATOR ---',
              ipAddress: '--- SEPARATOR ---',
              macAddress: '--- SEPARATOR ---',
              osType: '--- SEPARATOR ---'
            }
          ];

          // Get detailed laptop information with age analysis
          const laptopAgeDetails = laptops.map(laptop => {
            const ageInYears = calculateDeviceAge(laptop.purchaseDate);
            return {
              ageCategory: ageInYears <= 1 ? '1 Year Old' : 
                          ageInYears === 2 ? '2 Years Old' :
                          ageInYears === 3 ? '3 Years Old' :
                          ageInYears === 4 ? '4 Years Old' :
                          ageInYears === 5 ? '5 Years Old' : '5+ Years Old',
              totalLaptops: '',
              assetTag: laptop.assetTag || 'N/A',
              deviceName: laptop.name || 'N/A',
              serialNumber: laptop.serialNumber || 'N/A',
              knoxId: laptop.knoxId || 'N/A',
              model: laptop.model || 'N/A',
              manufacturer: laptop.manufacturer || 'N/A',
              ageInYears: ageInYears,
              purchaseDate: laptop.purchaseDate || 'N/A',
              status: laptop.status || 'N/A',
              condition: laptop.condition || 'N/A',
              department: laptop.department || 'N/A',
              assignedTo: laptop.assignedTo || 'N/A',
              location: laptop.location || 'N/A',
              ipAddress: laptop.ipAddress || 'N/A',
              macAddress: laptop.macAddress || 'N/A',
              osType: laptop.osType || 'N/A'
            };
          });

          result = [...laptopAgeSummaryTotals, ...laptopAgeDetails];
          break;

        case 'user-device-analysis':
          // Add user device analysis summary
          const userAnalysisSummary = [
            {
              analysisType: 'SUMMARY - Users with Single 5+ Year Old Laptop',
              totalUsers: usersWithOldSingleLaptop.length,
              userName: 'SUMMARY TOTALS',
              userEmail: 'N/A',
              department: 'SUMMARY',
              assetTag: 'TOTAL',
              deviceName: 'SUMMARY',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              deviceModel: 'N/A',
              manufacturer: 'N/A',
              deviceAgeYears: 'SUMMARY',
              purchaseDate: 'N/A',
              status: 'SUMMARY',
              condition: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            },
            {
              analysisType: '--- DETAILED RECORDS START BELOW ---',
              totalUsers: '',
              userName: '--- SEPARATOR ---',
              userEmail: '--- SEPARATOR ---',
              department: '--- SEPARATOR ---',
              assetTag: '--- SEPARATOR ---',
              deviceName: '--- SEPARATOR ---',
              serialNumber: '--- SEPARATOR ---',
              knoxId: '--- SEPARATOR ---',
              deviceModel: '--- SEPARATOR ---',
              manufacturer: '--- SEPARATOR ---',
              deviceAgeYears: '--- SEPARATOR ---',
              purchaseDate: '--- SEPARATOR ---',
              status: '--- SEPARATOR ---',
              condition: '--- SEPARATOR ---',
              location: '--- SEPARATOR ---',
              ipAddress: '--- SEPARATOR ---',
              macAddress: '--- SEPARATOR ---',
              osType: '--- SEPARATOR ---'
            }
          ];

          if (usersWithOldSingleLaptop && usersWithOldSingleLaptop.length > 0) {
            const userDetails = usersWithOldSingleLaptop.map(user => {
              // Find the user's laptop (should be exactly one)
              const userLaptop = assets.find(asset => 
                asset.assignedTo === user.id && 
                asset.category?.toLowerCase() === 'laptop' &&
                (asset.status === 'Deployed' || asset.status === 'deployed' || asset.status === 'assigned')
              );
              
              return {
                analysisType: 'User Detail',
                totalUsers: '',
                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
                userEmail: user.email || 'N/A',
                department: user.department || 'N/A',
                assetTag: userLaptop?.assetTag || 'N/A',
                deviceName: userLaptop?.name || 'N/A',
                serialNumber: userLaptop?.serialNumber || 'N/A',
                knoxId: userLaptop?.knoxId || 'N/A',
                deviceModel: userLaptop?.model || 'N/A',
                manufacturer: userLaptop?.manufacturer || 'N/A',
                deviceAgeYears: calculateDeviceAge(userLaptop?.purchaseDate) || 0,
                purchaseDate: userLaptop?.purchaseDate || 'N/A',
                status: userLaptop?.status || 'N/A',
                condition: userLaptop?.condition || 'N/A',
                location: userLaptop?.location || 'N/A',
                ipAddress: userLaptop?.ipAddress || 'N/A',
                macAddress: userLaptop?.macAddress || 'N/A',
                osType: userLaptop?.osType || 'N/A'
              };
            });
            result = [...userAnalysisSummary, ...userDetails];
          } else {
            result = [...userAnalysisSummary, { 
              analysisType: 'No Users Found',
              totalUsers: '',
              userName: 'No Users Found', 
              userEmail: 'N/A',
              department: 'N/A', 
              assetTag: 'N/A',
              deviceName: 'N/A',
              serialNumber: 'N/A',
              knoxId: 'N/A',
              deviceModel: 'N/A',
              manufacturer: 'N/A',
              deviceAgeYears: 0,
              purchaseDate: 'N/A',
              status: 'N/A',
              condition: 'N/A',
              location: 'N/A',
              ipAddress: 'N/A',
              macAddress: 'N/A',
              osType: 'N/A'
            }];
          }
          break;

        default:
          console.warn('Unknown report type:', reportType);
          result = [];
      }

      console.log(`Generated ${result.length} records for report type:`, reportType);
      return result;

    } catch (error) {
      console.error('Error generating report data:', error);
      return [{
        error: 'Failed to generate report data',
        reportType: reportType,
        timestamp: new Date().toISOString()
      }];
    }
  };

  const reportTypes = [
    { value: "device-summary", label: "Device Summary", icon: Package },
    { value: "department-summary", label: "Department Summary", icon: Building2 },
    { value: "laptop-age", label: "Laptop Age Analysis", icon: Clock },
    { value: "user-device-analysis", label: "User Device Analysis", icon: User },
    { value: "vm-inventory", label: "VM Inventory with Approval History", icon: Monitor },
  ];

  const currentData = getReportData(selectedReport);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-8 p-6 animate-in fade-in-0 duration-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2 animate-in slide-in-from-left-5 duration-700">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Device & Department Reports
            </h1>
            <p className="text-lg text-slate-600 font-medium">Comprehensive device analytics and department summaries</p>
          </div>
          <div className="flex flex-wrap gap-3 animate-in slide-in-from-right-5 duration-700">
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport('excel')}
              className="border-green-200 text-green-600 hover:bg-green-50"
              title="Download current report as Excel file with separate sheets"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Excel (Multi-Sheet)
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport('csv')}
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              title="Download current report as CSV file"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV Report
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport('json')}
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              title="Download current report as JSON file"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download JSON Report
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Device Overview</TabsTrigger>
            <TabsTrigger value="departments">Department Analysis</TabsTrigger>
            <TabsTrigger value="age-analysis">Age Analysis</TabsTrigger>
            <TabsTrigger value="user-analysis">User Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('device-summary');
                  exportToExcel(data, `device-summary-${new Date().toISOString().split('T')[0]}`, 'device-summary');
                }}
                className="border-green-200 text-green-600 hover:bg-green-50"
                title="Export Device Overview to Excel with separate sheets"
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                Excel Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('device-summary');
                  exportToCSV(data, `device-summary-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export Device Overview to CSV"
              >
                <Download className="mr-1 h-3 w-3" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('device-summary');
                  exportToJSON(data, `device-summary-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export Device Overview to JSON"
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                JSON Export
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Laptop Summary */}
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-blue-100">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Laptop className="h-6 w-6 text-blue-600" />
                    Laptop Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="font-medium">Total Laptops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">{laptopStats.total}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-medium">On-Hand Laptops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-green-500 text-green-700">{laptopStats.onHand}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span className="font-medium">Deployed Laptops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-blue-500 text-blue-700">{laptopStats.deployed}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                      <span className="font-medium">Pending for Deployment:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-yellow-500 text-yellow-700">{laptopStats.pendingDeployment}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
                      <span className="font-medium">Good Condition:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-emerald-500 text-emerald-700">{laptopStats.goodCondition}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                      <span className="font-medium">Bad Condition:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-red-500 text-red-700">{laptopStats.badCondition}</Badge>
                    </div>
					<div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                      <span className="font-medium">Reserved Laptops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-orange-500 text-orange-700">{laptopStats.reserved}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Desktop Summary */}
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-100">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Monitor className="h-6 w-6 text-purple-600" />
                    Desktop Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="font-medium">Total Desktops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">{desktopStats.total}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-medium">On-Hand Desktops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-green-500 text-green-700">{desktopStats.onHand}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span className="font-medium">Deployed Desktops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-blue-500 text-blue-700">{desktopStats.deployed}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                      <span className="font-medium">Pending for Deployment:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-yellow-500 text-yellow-700">{desktopStats.pendingDeployment}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
                      <span className="font-medium">Good Condition:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-emerald-500 text-emerald-700">{desktopStats.goodCondition}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                      <span className="font-medium">Bad Condition:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-red-500 text-red-700">{desktopStats.badCondition}</Badge>
                    </div>
					<div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                      <span className="font-medium">Reserved Desktops:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1 border-orange-500 text-orange-700">{desktopStats.reserved}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('department-summary');
                  exportToCSV(data, `department-summary-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export Department Analysis to CSV"
              >
                <Download className="mr-1 h-3 w-3" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('department-summary');
                  exportToJSON(data, `department-summary-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export Department Analysis to JSON"
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                JSON Export
              </Button>
            </div>
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-b border-green-100">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-green-600" />
                  Department Summary - Deployed Devices
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Breakdown of deployed devices by department
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Department</TableHead>
                        <TableHead className="font-semibold">Deployed Laptops</TableHead>
                        <TableHead className="font-semibold">Deployed Desktops</TableHead>
                        <TableHead className="font-semibold">Total Deployed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(departmentSummary).map((dept) => (
                        <TableRow key={dept}>
                          <TableCell className="font-medium">{dept}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-500 text-blue-700">
                              {departmentSummary[dept].laptops}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-500 text-purple-700">
                              {departmentSummary[dept].desktops}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-500 text-slate-700">
                              {departmentSummary[dept].laptops + departmentSummary[dept].desktops}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="age-analysis" className="space-y-6">
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('laptop-age');
                  exportToCSV(data, `laptop-age-analysis-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export Laptop Age Analysis to CSV"
              >
                <Download className="mr-1 h-3 w-3" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('laptop-age');
                  exportToJSON(data, `laptop-age-analysis-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export Laptop Age Analysis to JSON"
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                JSON Export
              </Button>
            </div>
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-orange-100">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                  Laptop Age Analysis
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Distribution of laptops by age in years
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{laptopAgeStats.oneYear}</div>
                    <div className="text-sm text-slate-600">1 Year Old</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{laptopAgeStats.twoYears}</div>
                    <div className="text-sm text-slate-600">2 Years Old</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{laptopAgeStats.threeYears}</div>
                    <div className="text-sm text-slate-600">3 Years Old</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{laptopAgeStats.fourYears}</div>
                    <div className="text-sm text-slate-600">4 Years Old</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{laptopAgeStats.fiveYears}</div>
                    <div className="text-sm text-slate-600">5 Years Old</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{laptopAgeStats.moreThanFive}</div>
                    <div className="text-sm text-slate-600">5+ Years Old</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-analysis" className="space-y-6">
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('user-device-analysis');
                  exportToCSV(data, `user-device-analysis-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export User Device Analysis to CSV"
              >
                <Download className="mr-1 h-3 w-3" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = getReportData('user-device-analysis');
                  exportToJSON(data, `user-device-analysis-${new Date().toISOString().split('T')[0]}`);
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                title="Export User Device Analysis to JSON"
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                JSON Export
              </Button>
            </div>
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-100">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <User className="h-6 w-6 text-indigo-600" />
                  Users with Single 5+ Year Old Laptop
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Users who have only one device that is a 5+ year old laptop
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="text-3xl font-bold text-red-600">{usersWithOldSingleLaptop.length}</div>
                    <div className="text-sm text-slate-600">Users with only 5+ year old laptops</div>
                  </div>

                  {usersWithOldSingleLaptop.length > 0 && (
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold">User</TableHead>
                            <TableHead className="font-semibold">Email</TableHead>
                            <TableHead className="font-semibold">Department</TableHead>
                            <TableHead className="font-semibold">Device Age</TableHead>
                            <TableHead className="font-semibold">Asset Tag</TableHead>
                            <TableHead className="font-semibold">Serial Number</TableHead>
                            <TableHead className="font-semibold">Knox ID</TableHead>
                            <TableHead className="font-semibold">Model</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersWithOldSingleLaptop.map((user) => {
                            const userLaptop = assets.find(asset => 
                              asset.assignedTo === user.id && 
                              asset.category?.toLowerCase() === 'laptop' &&
                              (asset.status === 'Deployed' || asset.status === 'deployed' || asset.status === 'assigned')
                            );
                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.firstName} {user.lastName}
                                </TableCell>
                                <TableCell>{user.email || 'N/A'}</TableCell>
                                <TableCell>{user.department || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-red-500 text-red-700">
                                    {calculateDeviceAge(userLaptop?.purchaseDate)} years
                                  </Badge>
                                </TableCell>
                                <TableCell>{userLaptop?.assetTag || 'N/A'}</TableCell>
                                <TableCell>{userLaptop?.serialNumber || 'N/A'}</TableCell>
                                <TableCell>{userLaptop?.knoxId || 'N/A'}</TableCell>
                                <TableCell>{userLaptop?.model || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Report Configuration */}
        <Card className="backdrop-blur-sm bg-card/95 border shadow-lg hover:shadow-xl transition-all duration-500">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5 border-b">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-accent-foreground" />
              Export Report Configuration
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Configure and export detailed reports for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">Report Type</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-foreground">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full mt-2 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>{dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Export Actions */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium text-foreground">Export Actions</Label>
                  <div className="space-y-2">
                    <Button
                      onClick={() => exportReport('csv')}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export as CSV
                    </Button>
                    <Button
                      onClick={() => exportReport('json')}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export as JSON
                    </Button>
                  </div>
                </div>

                {/* Report Statistics */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium text-foreground">Report Statistics</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Total Records:</span>
                      <Badge variant="outline" className="font-semibold">
                        {currentData.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Report Type:</span>
                      <Badge variant="outline" className="font-semibold">
                        {reportTypes.find(t => t.value === selectedReport)?.label || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Generated:</span>
                      <Badge variant="outline" className="font-semibold">
                        {format(new Date(), "PPP")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-foreground">Report Preview</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const data = getReportData(selectedReport);
                        exportToCSV(data, `${selectedReport}-preview-${new Date().toISOString().split('T')[0]}`);
                      }}
                      className="border-green-200 text-green-600 hover:bg-green-50"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Quick CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const data = getReportData(selectedReport);
                        exportToJSON(data, `${selectedReport}-preview-${new Date().toISOString().split('T')[0]}`);
                      }}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <FileSpreadsheet className="mr-1 h-3 w-3" />
                      Quick JSON
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-auto">
                  {currentData.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white rounded border">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">Data Available</span>
                        </div>
                        <Badge variant="outline" className="text-green-700 border-green-500">
                          {currentData.length} records
                        </Badge>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(currentData[0]).slice(0, 6).map((key) => (
                              <TableHead key={key} className="text-xs font-semibold">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}
                              </TableHead>
                            ))}
                            {Object.keys(currentData[0]).length > 6 && (
                              <TableHead className="text-xs font-semibold">...</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentData.slice(0, 8).map((row, index) => (
                            <TableRow key={index} className="hover:bg-white/50">
                              {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                                <TableCell key={cellIndex} className="text-xs py-2">
                                  <div className="truncate max-w-[120px]" title={String(value)}>
                                    {String(value)}
                                  </div>
                                </TableCell>
                              ))}
                              {Object.keys(currentData[0]).length > 6 && (
                                <TableCell className="text-xs py-2 text-slate-400">
                                  +{Object.keys(currentData[0]).length - 6} more
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-medium text-slate-600">No Data Available</p>
                          <p className="text-sm text-slate-500">No data available for this report type</p>
                          <p className="text-xs text-slate-400">Try selecting a different report type or check your data sources</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {currentData.length > 8 && (
                  <div className="mt-2 flex justify-between items-center text-xs text-slate-500">
                    <span>Showing first 8 of {currentData.length} records in preview</span>
                    <span>Export to see all records</span>
                  </div>
                )}
                
                {currentData.length > 0 && Object.keys(currentData[0]).length > 6 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Preview shows first 6 columns. Export to see all {Object.keys(currentData[0]).length} columns.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-slate-100">
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <History className="h-6 w-6 text-slate-600" />
              Recent Reports
            </CardTitle>
            <CardDescription className="text-slate-600">
              Download or regenerate previously created reports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700">Available Report Types</p>
                    <p className="text-3xl font-bold text-blue-900">{reportTypes.length}</p>
                  </div>
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700">Total Assets</p>
                    <p className="text-3xl font-bold text-green-900">{assets.length}</p>
                  </div>
                  <Package className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-purple-700">Departments</p>
                    <p className="text-3xl font-bold text-purple-900">{Object.keys(departmentSummary).length}</p>
                  </div>
                  <Building2 className="h-10 w-10 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Recent Report History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Recent Report History</h3>
              <div className="space-y-3">
                {reportData && Object.keys(reportData).length > 0 ? (
                  reportTypes.map((reportType, index) => {
                    const data = getReportData(reportType.value);
                    const recordCount = data.length;
                    const estimatedSize = Math.max(0.5, recordCount * 0.1).toFixed(1);
                    const reportDate = new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

                    return (
                      <div key={reportType.value} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <reportType.icon className="h-5 w-5 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-800">{reportType.label}</p>
                            <p className="text-sm text-slate-500">
                              {reportDate} • {recordCount} records • ~{estimatedSize} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => exportToCSV(data, `${reportType.value}-${reportDate}`)}
                            title={`Download ${reportType.label} as CSV (${recordCount} records)`}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            CSV Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-purple-200 text-purple-600 hover:bg-purple-50"
                            onClick={() => exportToJSON(data, `${reportType.value}-${reportDate}`)}
                            title={`Download ${reportType.label} as JSON (${recordCount} records)`}
                          >
                            <FileSpreadsheet className="mr-1 h-3 w-3" />
                            JSON Download
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-lg font-medium">No Reports Available</p>
                    <p className="text-sm">Generate your first report to see it here</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}