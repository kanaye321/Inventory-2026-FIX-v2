import { PlusCircle, Filter, Trash2, Download, Upload, RefreshCw, Server, HardDrive, FileText, Calendar, Users, Pencil, Eye, EyeOff, Settings, Columns, ArrowUpDown, ArrowUp, ArrowDown, XCircle, CheckCircle, AlertTriangle, Database, Clock, History } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseVMCSV, convertCSVToVMs, convertToCSV } from "@/lib/csv-import";
import { downloadCSV } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

type VmStatus = "Active" | "Overdue - Not Notified" | "Overdue - Notified" | "Decommissioned";

interface VirtualMachine {
  id: number;
  // VM Core Information
  vmId: string;
  vmName: string;
  vmStatus: string;
  vmIp: string;
  vmOs: string;
  cpuCount: number;
  memoryGB: number;
  diskCapacityGB: number;
  // Request and Approval Information
  requestor: string;
  knoxId: string;
  department: string;
  startDate: string;
  endDate: string;
  jiraNumber: string;
  approvalNumber: string;
  remarks: string;
  // Legacy fields for compatibility
  internetAccess: boolean;
  vmOsVersion: string;
  hypervisor: string;
  hostName: string;
  hostModel: string;
  hostIp: string;
  hostOs: string;
  rack: string;
  deployedBy: string;
  user: string;
  jiraTicket: string;
  dateDeleted: string | null;
}

interface ApprovalHistoryEntry {
  id: number;
  vmId: number;
  oldApprovalNumber: string | null;
  newApprovalNumber: string | null;
  changedAt: string;
  changedByUsername: string;
  changedByName: string | null;
  reason: string | null;
  notes: string | null;
}

type NewVirtualMachine = Omit<VirtualMachine, "id">;

// Column visibility configuration
interface ColumnConfig {
  key: keyof VirtualMachine | 'actions';
  label: string;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

const columnConfigs: ColumnConfig[] = [
  { key: 'vmStatus', label: 'VM Status', defaultVisible: true, alwaysVisible: true },
  { key: 'vmName', label: 'VM Name', defaultVisible: true, alwaysVisible: true },
  { key: 'knoxId', label: 'Knox ID', defaultVisible: true },
  { key: 'startDate', label: 'Duration Start', defaultVisible: true },
  { key: 'endDate', label: 'Duration End', defaultVisible: true },
  { key: 'approvalNumber', label: 'Approval Number', defaultVisible: true },
  { key: 'remarks', label: 'Remarks', defaultVisible: true },
  { key: 'requestor', label: 'Requestor', defaultVisible: false },
  { key: 'vmId', label: 'VM ID', defaultVisible: false },
  { key: 'vmOs', label: 'OS', defaultVisible: false },
  { key: 'vmIp', label: 'IP Address', defaultVisible: false },
  { key: 'cpuCount', label: 'CPU', defaultVisible: false },
  { key: 'memoryGB', label: 'Memory (GB)', defaultVisible: false },
  { key: 'diskCapacityGB', label: 'Disk Capacity (GB)', defaultVisible: false },
  { key: 'internetAccess', label: 'Internet Access', defaultVisible: false },
  { key: 'vmOsVersion', label: 'OS Version', defaultVisible: false },
  { key: 'hypervisor', label: 'Hypervisor', defaultVisible: false },
  { key: 'hostName', label: 'Host Name', defaultVisible: false },
  { key: 'hostModel', label: 'Host Model', defaultVisible: false },
  { key: 'hostIp', label: 'Host IP', defaultVisible: false },
  { key: 'hostOs', label: 'Host OS', defaultVisible: false },
  { key: 'rack', label: 'Rack', defaultVisible: false },
  { key: 'deployedBy', label: 'Deployed By', defaultVisible: false },
  { key: 'user', label: 'User', defaultVisible: false },
  { key: 'department', label: 'Department', defaultVisible: false },
  { key: 'jiraNumber', label: 'Jira Number', defaultVisible: false },
  { key: 'actions', label: 'Actions', defaultVisible: true, alwaysVisible: true },
];

export default function VMInventoryPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Handle URL parameters for filtering
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('statusFilter');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, []);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isApprovalHistoryDialogOpen, setIsApprovalHistoryDialogOpen] = useState(false); // State for Approval History Dialog
  const [vmToDelete, setVmToDelete] = useState<VirtualMachine | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [vmToEdit, setVmToEdit] = useState<VirtualMachine | null>(null);
  const [vmToView, setVmToView] = useState<VirtualMachine | null>(null);
  const [selectedVmForHistory, setSelectedVmForHistory] = useState<VirtualMachine | null>(null); // State for selected VM for history
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([]); // State for approval history data
  const [newVM, setNewVM] = useState<Partial<NewVirtualMachine>>({
    vmStatus: "Active",
    internetAccess: false,
  });
  const [importContent, setImportContent] = useState<string>("");
  const [importType, setImportType] = useState<"csv" | "excel">("csv");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof VirtualMachine | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columnConfigs.filter(col => col.defaultVisible).map(col => col.key))
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch VMs from the API
  const { data: vms = [], isLoading, error } = useQuery({ 
    queryKey: ['/api/vm-inventory'],
    queryFn: async () => {
      const response = await fetch('/api/vm-inventory');
      if (!response.ok) throw new Error('Failed to fetch VM inventory');
      return response.json();
    },
  });

  // Fetch Approval History for a specific VM
  const fetchApprovalHistory = async (vmId: number) => {
    try {
      const response = await apiRequest('GET', `/api/vm-inventory/${vmId}/approval-history`);
      if (!response.ok) throw new Error('Failed to fetch approval history');
      const data: ApprovalHistoryEntry[] = await response.json();
      setApprovalHistory(data);
    } catch (err) {
      console.error("Error fetching approval history:", err);
      toast({
        title: "Error",
        description: "Could not load approval history.",
        variant: "destructive",
      });
    }
  };

  // Create VM mutation
  const createVmMutation = useMutation({
    mutationFn: async (vmData: any) => {
      const response = await apiRequest('POST', '/api/vm-inventory', vmData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vm-inventory'] });
      
      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'created',
          itemType: 'VM Inventory',
          itemName: data.vmName || 'New VM',
          details: `VM added: ${data.vmName}, Requestor: ${data.requestor}, Knox ID: ${data.knoxId}, Status: ${data.vmStatus}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));
      
      toast({
        title: "Success",
        description: "VM added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update VM mutation
  const updateVmMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/vm-inventory/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vm-inventory'] });
      
      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'updated',
          itemType: 'VM Inventory',
          itemName: data.vmName || 'VM',
          details: `VM updated: ${data.vmName}, Status: ${data.vmStatus}, Knox ID: ${data.knoxId}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));
      
      toast({
        title: "Success",
        description: "VM updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete VM mutation
  const deleteVmMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/vm-inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vm-inventory'] });
      toast({
        title: "Success",
        description: "VM deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import VM mutation
  const importVmMutation = useMutation({
    mutationFn: async (file: File) => {
      const csvContent = await file.text();
      const csvVMs = parseVMCSV(csvContent);
      const vmData = convertCSVToVMs(csvVMs);

      const response = await apiRequest('POST', '/api/vm-inventory/import', { vms: vmData });
      return response.json();
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vm-inventory'] });
      setImportResults(results);
      toast({
        title: "Import Completed",
        description: `Successfully imported ${results.successful} VMs, ${results.failed} failed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importVmMutation.mutate(file);
    }
  };

  // Function to calculate VM status based on dates
  const calculateVMStatus = (startDate: string, endDate: string, currentStatus: string) => {
    if (currentStatus === "Overdue - Notified" || currentStatus === "Decommissioned") {
      return currentStatus; // Manual statuses should not be auto-changed
    }

    if (!startDate || !endDate) {
      return "Active"; // Default if no dates
    }

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today >= start && today <= end) {
      return "Active";
    } else if (today > end) {
      return "Overdue - Not Notified";
    } else {
      return "Active"; // Future start date
    }
  };

  // Process VMs with calculated status
  const processedVMs = vms.map(vm => ({
    ...vm,
    vmStatus: calculateVMStatus(vm.startDate, vm.endDate, vm.vmStatus)
  }));

  // Sorting function
  const handleSort = (key: keyof VirtualMachine) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon
  const getSortIcon = (key: keyof VirtualMachine) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-3 w-3" /> : 
      <ArrowDown className="h-3 w-3" />;
  };

  // Column filter handler
  const handleFilterChange = (columnKey: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchTerm("");
    setStatusFilter(null);
  };

  // Get unique values for filters
  const getUniqueValues = (key: keyof VirtualMachine) => {
    const values = processedVMs
      .map(vm => vm[key])
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .sort();
    return values as string[];
  };

  const handleInputChange = (field: keyof NewVirtualMachine, value: string | boolean | number) => {
    setNewVM((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!newVM.vmName || !newVM.requestor) {
      toast({
        title: "Missing information",
        description: "Please fill in the required fields (VM Name and Requestor).",
        variant: "destructive",
      });
      return;
    }

    const vmData = {
      vmId: newVM.vmId || "",
      vmName: newVM.vmName,
      vmStatus: newVM.vmStatus || "Active",
      vmIp: newVM.vmIp || "",
      vmOs: newVM.vmOs || "",
      cpuCount: newVM.cpuCount || 0,
      memoryGB: newVM.memoryGB || 0,
      diskCapacityGB: newVM.diskCapacityGB || 0,
      requestor: newVM.requestor || "",
      knoxId: newVM.knoxId || "",
      department: newVM.department || "",
      startDate: newVM.startDate || "",
      endDate: newVM.endDate || "",
      jiraNumber: newVM.jiraNumber || "",
      approvalNumber: newVM.approvalNumber || "",
      remarks: newVM.remarks || "",
      internetAccess: newVM.internetAccess || false,
      vmOsVersion: newVM.vmOsVersion || "",
      hypervisor: newVM.hypervisor || "",
      hostName: newVM.hostName || "",
      hostModel: newVM.hostModel || "",
      hostIp: newVM.hostIp || "",
      hostOs: newVM.hostOs || "",
      rack: newVM.rack || "",
      deployedBy: newVM.deployedBy || "",
      user: newVM.user || "",
      jiraTicket: newVM.jiraTicket || "",
      dateDeleted: newVM.dateDeleted || null,
      guestOs: newVM.guestOs || "",
      powerState: newVM.powerState || "stopped",
      memoryMB: newVM.memoryMB || 0,
      diskGB: newVM.diskGB || 0,
      ipAddress: newVM.ipAddress || "",
      macAddress: newVM.macAddress || "",
      vmwareTools: newVM.vmwareTools || "",
      cluster: newVM.cluster || "",
      datastore: newVM.datastore || "",
    };

    createVmMutation.mutate(vmData, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewVM({
          vmStatus: "Active",
          internetAccess: false,
        });
      },
    });
  };

  const handleDeleteVM = () => {
    if (!vmToDelete) return;

    deleteVmMutation.mutate(vmToDelete.id, {
      onSuccess: () => {
        setIsConfirmDeleteOpen(false);
        setVmToDelete(null);
      },
    });
  };

  const handleDeleteClick = (vm: VirtualMachine) => {
    setVmToDelete(vm);
    setIsConfirmDeleteOpen(true);
  };

  const handleExportCSV = () => {
    if (filteredAndSortedVMs && filteredAndSortedVMs.length > 0) {
      const csvData = convertToCSV(filteredAndSortedVMs);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'vm_inventory.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast({
        title: "Export Successful",
        description: `Exported ${filteredAndSortedVMs.length} VM records to CSV.`,
      });
    } else {
      toast({
        title: "No data to export",
        description: "There is no VM inventory data to export.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        vmId: "VM-001",
        vmName: "Production Web Server",
        vmStatus: "Active",
        vmIp: "192.168.1.100",
        vmOs: "Ubuntu 20.04 LTS",
        cpuCount: 4,
        memoryGB: 16,
        diskCapacityGB: 500,
        requestor: "John Doe",
        knoxId: "KNOX001",
        department: "IT Department",
        startDate: "2024-01-15",
        endDate: "2024-12-15",
        jiraNumber: "PROJ-1234",
        approvalNumber: "APPR-5678",
        remarks: "Critical production server for web applications",
        internetAccess: true,
        vmOsVersion: "20.04.6 LTS",
        hypervisor: "VMware vSphere",
        hostname: "esxi-host-01",
        hostModel: "Dell PowerEdge R730",
        hostIp: "192.168.1.50",
        hostOs: "VMware ESXi 7.0",
        rack: "Rack-A-01",
        deployedBy: "Admin User",
        user: "webapp-user",
        jiraTicket: "PROJ-1234",
        dateDeleted: null,
      },
      {
        vmId: "VM-002",
        vmName: "Development Database",
        vmStatus: "Active",
        vmIp: "192.168.1.101",
        vmOs: "CentOS 8",
        cpuCount: 2,
        memoryGB: 8,
        diskCapacityGB: 250,
        requestor: "Jane Smith",
        knoxId: "KNOX002",
        department: "Development",
        startDate: "2024-02-01",
        endDate: "2024-11-30",
        jiraNumber: "DEV-2468",
        approvalNumber: "APPR-9012",
        remarks: "Development database server for testing",
        internetAccess: false,
        vmOsVersion: "8.4",
        hypervisor: "VMware vSphere",
        hostname: "esxi-host-02",
        hostModel: "Dell PowerEdge R640",
        hostIp: "192.168.1.51",
        hostOs: "VMware ESXi 7.0",
        rack: "Rack-B-02",
        deployedBy: "Dev Team",
        user: "dbadmin",
        jiraTicket: "DEV-2468",
        dateDeleted: null,
      }
    ];

    const csvContent = convertToCSV(templateData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'vm_inventory_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Template Downloaded",
      description: "VM inventory import template has been downloaded successfully.",
    });
  };

  const handleVmEditChange = (field: keyof VirtualMachine, value: string | boolean | number) => {
    if (!vmToEdit) return;

    setVmToEdit(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleEditVM = () => {
    if (!vmToEdit) return;

    const vmData = {
      vmId: vmToEdit.vmId || "",
      vmName: vmToEdit.vmName,
      vmStatus: vmToEdit.vmStatus || "Active",
      vmIp: vmToEdit.vmIp || "",
      vmOs: vmToEdit.vmOs || "",
      cpuCount: vmToEdit.cpuCount || 0,
      memoryGB: vmToEdit.memoryGB || 0,
      diskCapacityGB: vmToEdit.diskCapacityGB || 0,
      requestor: vmToEdit.requestor || "",
      knoxId: vmToEdit.knoxId || "",
      department: vmToEdit.department || "",
      startDate: vmToEdit.startDate || "",
      endDate: vmToEdit.endDate || "",
      jiraNumber: vmToEdit.jiraNumber || "",
      approvalNumber: vmToEdit.approvalNumber || "",
      remarks: vmToEdit.remarks || "",
      internetAccess: vmToEdit.internetAccess || false,
      vmOsVersion: vmToEdit.vmOsVersion || "",
      hypervisor: vmToEdit.hypervisor || "",
      hostName: vmToEdit.hostName || "",
      hostModel: vmToEdit.hostModel || "",
      hostIp: vmToEdit.hostIp || "",
      hostOs: vmToEdit.hostOs || "",
      rack: vmToEdit.rack || "",
      deployedBy: vmToEdit.deployedBy || "",
      user: vmToEdit.user || "",
      jiraTicket: vmToEdit.jiraTicket || "",
      dateDeleted: vmToEdit.dateDeleted || null,
      guestOs: vmToEdit.guestOs || "",
      powerState: vmToEdit.powerState || "stopped",
      memoryMB: vmToEdit.memoryMB || 0,
      diskGB: vmToEdit.diskGB || 0,
      ipAddress: vmToEdit.ipAddress || "",
      macAddress: vmToEdit.macAddress || "",
      vmwareTools: vmToEdit.vmwareTools || "",
      cluster: vmToEdit.cluster || "",
      datastore: vmToEdit.datastore || "",
    };

    updateVmMutation.mutate({ id: vmToEdit.id, data: vmData }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setVmToEdit(null);
      },
    });
  };

  // Memoized filtered and sorted VMs
  const filteredAndSortedVMs = useMemo(() => {
    let filtered = processedVMs.filter((vm) => {
      const vmId = vm.vmId || vm.vmName || '';
      const vmName = vm.vmName || '';
      const vmIp = vm.vmIp || '';
      const vmStatus = vm.vmStatus || '';
      const knoxId = vm.knoxId || '';
      const requestor = vm.requestor || '';

      // Global search
      const matchesSearch = searchTerm === "" || 
        vmName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        vmId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vmIp.includes(searchTerm) ||
        knoxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        requestor.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = !statusFilter || statusFilter === "all" || 
        (vmStatus && vmStatus.toLowerCase() === (statusFilter || "").toLowerCase());

      // Column filters
      const matchesColumnFilters = Object.entries(columnFilters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const vmValue = vm[key as keyof VirtualMachine];
        if (!vmValue) return false;
        return String(vmValue).toLowerCase().includes(filterValue.toLowerCase());
      });

      return matchesSearch && matchesStatus && matchesColumnFilters;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Convert to string for comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr < bStr) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [processedVMs, searchTerm, statusFilter, columnFilters, sortConfig]);

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    switch(status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "overdue - not notified":
        return <Badge variant="destructive">Overdue - Not Notified</Badge>;
      case "overdue - notified":
        return <Badge className="bg-orange-600">Overdue - Notified</Badge>;
      case "decommissioned":
        return <Badge variant="secondary">Decommissioned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleColumnVisibility = (columnKey: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnKey)) {
      newVisible.delete(columnKey);
    } else {
      newVisible.add(columnKey);
    }
    setVisibleColumns(newVisible);
  };

  const resetToDefaultColumns = () => {
    setVisibleColumns(new Set(columnConfigs.filter(col => col.defaultVisible).map(col => col.key)));
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredAndSortedVMs.length);
  const paginatedVMs = filteredAndSortedVMs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredAndSortedVMs.length / itemsPerPage);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Virtual Machine Inventory</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New VM
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative w-full md:w-auto flex-1">
          <Input
            placeholder="Search by VM Name, ID, Knox ID, or Requestor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Overdue - Not Notified">Overdue - Not Notified</SelectItem>
              <SelectItem value="Overdue - Notified">Overdue - Notified</SelectItem>
              <SelectItem value="Decommissioned">Decommissioned</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Button variant="outline" className="w-full sm:w-auto" onClick={handleDownloadTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <Button 
            variant="outline" 
            className="w-full sm:w-auto" 
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>

          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnConfigs.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => !col.alwaysVisible && toggleColumnVisibility(col.key)}
                  disabled={col.alwaysVisible}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetToDefaultColumns}>
                Reset to Default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            className="w-full sm:w-auto" 
            onClick={clearAllFilters}
            disabled={Object.keys(columnFilters).length === 0 && !searchTerm && !statusFilter}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>

          <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/vm-inventory'] });
            toast({
              title: "Refreshing",
              description: "VM data refreshed",
            });
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto w-full justify-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Status Management Instructions
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <CardDescription>Guidelines for managing VM status throughout the lifecycle</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border border-green-200 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800 mb-2">Active</h4>
                        <p className="text-sm text-green-700 mb-2">Virtual machines currently in production use within their approved duration period.</p>
                        <ul className="text-xs text-green-600 space-y-1">
                          <li>• VM is operational and accessible</li>
                          <li>• Current date is within start and end date range</li>
                          <li>• All required approvals are in place</li>
                          <li>• Regular monitoring and maintenance applied</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border border-orange-200 bg-orange-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-800 mb-2">Overdue - Notified</h4>
                        <p className="text-sm text-orange-700 mb-2">VMs past their approved end date where stakeholders have been formally notified.</p>
                        <ul className="text-xs text-orange-600 space-y-1">
                          <li>• End date has passed</li>
                          <li>• Notification sent to requestor and department</li>
                          <li>• Awaiting extension request or decommission approval</li>
                          <li>• May be subject to automatic shutdown policies</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800 mb-2">Overdue - Not Notified</h4>
                        <p className="text-sm text-red-700 mb-2">VMs that have exceeded their approved duration but stakeholders haven't been notified yet.</p>
                        <ul className="text-xs text-red-600 space-y-1">
                          <li>• End date has passed automatically</li>
                          <li>• System-calculated status change</li>
                          <li>• Requires immediate review and notification</li>
                          <li>• High priority for administrative action</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border border-gray-200 bg-gray-50 rounded-lg">
                      <Database className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Decommissioned</h4>
                        <p className="text-sm text-gray-700 mb-2">VMs that have been formally retired and removed from active service.</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• VM has been powered down and removed</li>
                          <li>• Data backup and migration completed</li>
                          <li>• Resources freed for reallocation</li>
                          <li>• Final status - no further action required</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Status Management Workflow
                  </h4>
                  <p className="text-sm text-blue-700">
                    VM statuses are automatically calculated based on start/end dates, except for "Overdue - Notified" and "Decommissioned" which must be manually set by administrators after appropriate actions are taken.
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {columnConfigs.map((col) => 
                    visibleColumns.has(col.key) && (
                      <TableHead key={col.key}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{col.label}</span>
                            {col.key !== 'actions' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort(col.key as keyof VirtualMachine)}
                                className="h-6 w-6 p-0"
                              >
                                {getSortIcon(col.key as keyof VirtualMachine)}
                              </Button>
                            )}
                          </div>
                          {col.key !== 'actions' && !col.alwaysVisible && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <Filter className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56" align="end">
                                {['vmStatus', 'vmOs', 'department'].includes(col.key) ? (
                                  <Select
                                    value={columnFilters[col.key] || "all"}
                                    onValueChange={(value) => handleFilterChange(col.key, value === "all" ? "" : value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={`Filter by ${col.label.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All {col.label}</SelectItem>
                                      {getUniqueValues(col.key as keyof VirtualMachine).map(value => (
                                        <SelectItem key={value} value={value}>
                                          {value}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    placeholder={`Filter ${col.label.toLowerCase()}...`}
                                    value={columnFilters[col.key] || ""}
                                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                  />
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVMs.map((vm) => (
                  <TableRow key={vm.id}>
                    {visibleColumns.has('vmStatus') && (
                      <TableCell>{getStatusBadge(vm.vmStatus)}</TableCell>
                    )}
                    {visibleColumns.has('vmName') && (
                      <TableCell className="font-medium">{vm.vmName || 'Unnamed VM'}</TableCell>
                    )}
                    {visibleColumns.has('knoxId') && (
                      <TableCell>{vm.knoxId || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('startDate') && (
                      <TableCell>{vm.startDate || 'Not set'}</TableCell>
                    )}
                    {visibleColumns.has('endDate') && (
                      <TableCell>{vm.endDate || 'Not set'}</TableCell>
                    )}
                    {visibleColumns.has('approvalNumber') && (
                      <TableCell className="flex items-center gap-2">
                        {vm.approvalNumber || 'N/A'}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                          onClick={() => {
                            setSelectedVmForHistory(vm);
                            fetchApprovalHistory(vm.id);
                            setIsApprovalHistoryDialogOpen(true);
                          }}
                        >
                          <History className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    )}
                    {visibleColumns.has('remarks') && (
                      <TableCell className="max-w-xs truncate">{vm.remarks || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('requestor') && (
                      <TableCell>{vm.requestor || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('vmId') && (
                      <TableCell>{vm.vmId || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('vmOs') && (
                      <TableCell>{vm.vmOs || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('vmIp') && (
                      <TableCell>{vm.vmIp || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('cpuCount') && (
                      <TableCell>{vm.cpuCount || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('memoryGB') && (
                      <TableCell>{vm.memoryGB || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('diskCapacityGB') && (
                      <TableCell>{vm.diskCapacityGB || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('department') && (
                      <TableCell>{vm.department || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('jiraNumber') && (
                      <TableCell>{vm.jiraNumber || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.has('actions') && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center gap-2"
                              onClick={() => {
                                setVmToView(vm);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center gap-2"
                              onClick={() => {
                                setVmToEdit(vm);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit VM
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="cursor-pointer text-destructive flex items-center gap-2"
                              onClick={() => handleDeleteClick(vm)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete VM
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {paginatedVMs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnConfigs.length} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {filteredAndSortedVMs.length > itemsPerPage && (
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedVMs.length)} of {filteredAndSortedVMs.length} VMs
                {Object.keys(columnFilters).length > 0 || searchTerm || statusFilter ? (
                  <span className="text-muted-foreground/60"> (filtered from {processedVMs.length} total)</span>
                ) : null}
              </div>

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
          </CardContent>
        )}
      </Card>

      {/* Add VM Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Virtual Machine</DialogTitle>
            <DialogDescription>
              Enter the details for the new virtual machine.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Core VM Information */}
            <div className="space-y-4 border-b border-border pb-4">
              <h3 className="text-base font-medium flex items-center text-primary">
                <Server className="h-4 w-4 mr-2" />
                Core VM Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vmName">VM Name *</Label>
                  <Input 
                    id="vmName" 
                    value={newVM.vmName || ''} 
                    onChange={(e) => handleInputChange('vmName', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vmId">VM ID</Label>
                  <Input 
                    id="vmId" 
                    value={newVM.vmId || ''} 
                    onChange={(e) => handleInputChange('vmId', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vmStatus">VM Status</Label>
                  <Select 
                    value={newVM.vmStatus} 
                    onValueChange={(value) => handleInputChange('vmStatus', value)}
                  >
                    <SelectTrigger id="vmStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Overdue - Not Notified">Overdue - Not Notified</SelectItem>
                      <SelectItem value="Overdue - Notified">Overdue - Notified</SelectItem>
                      <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vmIp">IP Address</Label>
                  <Input 
                    id="vmIp" 
                    value={newVM.vmIp || ''} 
                    onChange={(e) => handleInputChange('vmIp', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* System Specifications */}
            <div className="space-y-4 border-b border-border pb-4">
              <h3 className="text-base font-medium flex items-center text-primary">
                <HardDrive className="h-4 w-4 mr-2" />
                System Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vmOs">Operating System</Label>
                  <Input 
                    id="vmOs" 
                    value={newVM.vmOs || ''} 
                    onChange={(e) => handleInputChange('vmOs', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpuCount">CPU Cores</Label>
                  <Input 
                    id="cpuCount" 
                    type="number"
                    value={newVM.cpuCount || ''} 
                    onChange={(e) => handleInputChange('cpuCount', parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memoryGB">Memory (GB)</Label>
                  <Input 
                    id="memoryGB" 
                    type="number"
                    value={newVM.memoryGB || ''} 
                    onChange={(e) => handleInputChange('memoryGB', parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diskCapacityGB">Disk Capacity (GB)</Label>
                  <Input 
                    id="diskCapacityGB" 
                    type="number"
                    value={newVM.diskCapacityGB || ''} 
                    onChange={(e) => handleInputChange('diskCapacityGB', parseInt(e.target.value) || 0)} 
                  />
                </div>
              </div>
            </div>

            {/* Request & Approval Information */}
            <div className="space-y-4 border-b border-border pb-4">
              <h3 className="text-base font-medium flex items-center text-primary">
                <Users className="h-4 w-4 mr-2" />
                Request & Approval Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestor">Requestor *</Label>
                  <Input 
                    id="requestor" 
                    value={newVM.requestor || ''} 
                    onChange={(e) => handleInputChange('requestor', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="knoxId">Knox ID</Label>
                  <Input 
                    id="knoxId" 
                    value={newVM.knoxId || ''} 
                    onChange={(e) => handleInputChange('knoxId', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    value={newVM.department || ''} 
                    onChange={(e) => handleInputChange('department', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approvalNumber">Approval Number</Label>
                  <Input 
                    id="approvalNumber" 
                    value={newVM.approvalNumber || ''} 
                    onChange={(e) => handleInputChange('approvalNumber', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Duration & Tracking */}
            <div className="space-y-4 border-b border-border pb-4">
              <h3 className="text-base font-medium flex items-center text-primary">
                <Calendar className="h-4 w-4 mr-2" />
                Duration & Tracking
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Duration Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date"
                    value={newVM.startDate || ''} 
                    onChange={(e) => handleInputChange('startDate', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Duration End Date</Label>
                  <Input 
                    id="endDate" 
                    type="date"
                    value={newVM.endDate || ''} 
                    onChange={(e) => handleInputChange('endDate', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jiraNumber">Jira Number</Label>
                  <Input 
                    id="jiraNumber" 
                    value={newVM.jiraNumber || ''} 
                    onChange={(e) => handleInputChange('jiraNumber', e.target.value)} 
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea 
                    id="remarks" 
                    value={newVM.remarks || ''} 
                    onChange={(e) => handleInputChange('remarks', e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end mt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="w-full sm:w-auto"
            >
              Add VM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit VM Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Virtual Machine</DialogTitle>
            <DialogDescription>
              Update the details for this virtual machine.
            </DialogDescription>
          </DialogHeader>

          {vmToEdit && (
            <div className="py-4 space-y-6">
              {/* Core VM Information */}
              <div className="space-y-4 border-b border-border pb-4">
                <h3 className="text-base font-medium flex items-center text-primary">
                  <Server className="h-4 w-4 mr-2" />
                  Core VM Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vmName">VM Name *</Label>
                    <Input 
                      id="edit-vmName" 
                      value={vmToEdit.vmName || ''} 
                      onChange={(e) => handleVmEditChange('vmName', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-vmId">VM ID</Label>
                    <Input 
                      id="edit-vmId" 
                      value={vmToEdit.vmId || ''} 
                      onChange={(e) => handleVmEditChange('vmId', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-vmStatus">VM Status</Label>
                    <Select 
                      value={vmToEdit.vmStatus} 
                      onValueChange={(value) => handleVmEditChange('vmStatus', value)}
                    >
                      <SelectTrigger id="edit-vmStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Overdue - Not Notified">Overdue - Not Notified</SelectItem>
                        <SelectItem value="Overdue - Notified">Overdue - Notified</SelectItem>
                        <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-vmIp">IP Address</Label>
                    <Input 
                      id="edit-vmIp" 
                      value={vmToEdit.vmIp || ''} 
                      onChange={(e) => handleVmEditChange('vmIp', e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* System Specifications */}
              <div className="space-y-4 border-b border-border pb-4">
                <h3 className="text-base font-medium flex items-center text-primary">
                  <HardDrive className="h-4 w-4 mr-2" />
                  System Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vmOs">Operating System</Label>
                    <Input 
                      id="edit-vmOs" 
                      value={vmToEdit.vmOs || ''} 
                      onChange={(e) => handleVmEditChange('vmOs', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cpuCount">CPU Cores</Label>
                    <Input 
                      id="edit-cpuCount" 
                      type="number"
                      value={vmToEdit.cpuCount || ''} 
                      onChange={(e) => handleVmEditChange('cpuCount', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-memoryGB">Memory (GB)</Label>
                    <Input 
                      id="edit-memoryGB" 
                      type="number"
                      value={vmToEdit.memoryGB || ''} 
                      onChange={(e) => handleVmEditChange('memoryGB', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-diskCapacityGB">Disk Capacity (GB)</Label>
                    <Input 
                      id="edit-diskCapacityGB" 
                      type="number"
                      value={vmToEdit.diskCapacityGB || ''} 
                      onChange={(e) => handleVmEditChange('diskCapacityGB', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                </div>
              </div>

              {/* Request & Approval Information */}
              <div className="space-y-4 border-b border-border pb-4">
                <h3 className="text-base font-medium flex items-center text-primary">
                  <Users className="h-4 w-4 mr-2" />
                  Request & Approval Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-requestor">Requestor *</Label>
                    <Input 
                      id="edit-requestor" 
                      value={vmToEdit.requestor || ''} 
                      onChange={(e) => handleVmEditChange('requestor', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-knoxId">Knox ID</Label>
                    <Input 
                      id="edit-knoxId" 
                      value={vmToEdit.knoxId || ''} 
                      onChange={(e) => handleVmEditChange('knoxId', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-department">Department</Label>
                    <Input 
                      id="edit-department" 
                      value={vmToEdit.department || ''} 
                      onChange={(e) => handleVmEditChange('department', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-approvalNumber">Approval Number</Label>
                    <Input 
                      id="edit-approvalNumber" 
                      value={vmToEdit.approvalNumber || ''} 
                      onChange={(e) => handleVmEditChange('approvalNumber', e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* Duration & Tracking */}
              <div className="space-y-4">
                <h3 className="text-base font-medium flex items-center text-primary">
                  <Calendar className="h-4 w-4 mr-2" />
                  Duration & Tracking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-startDate">Duration Start Date</Label>
                    <Input 
                      id="edit-startDate" 
                      type="date"
                      value={vmToEdit.startDate || ''} 
                      onChange={(e) => handleVmEditChange('startDate', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-endDate">Duration End Date</Label>
                    <Input 
                      id="edit-endDate" 
                      type="date"
                      value={vmToEdit.endDate || ''} 
                      onChange={(e) => handleVmEditChange('endDate', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-jiraNumber">Jira Number</Label>
                    <Input 
                      id="edit-jiraNumber" 
                      value={vmToEdit.jiraNumber || ''} 
                      onChange={(e) => handleVmEditChange('jiraNumber', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="edit-remarks">Remarks</Label>
                    <Textarea 
                      id="edit-remarks" 
                      value={vmToEdit.remarks || ''} 
                      onChange={(e) => handleVmEditChange('remarks', e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setVmToEdit(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditVM}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              VM Details: {vmToView?.vmName}
            </DialogTitle>
            <DialogDescription>
              Detailed information for this virtual machine.
            </DialogDescription>
          </DialogHeader>

          {vmToView && (
            <div className="py-4 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{vmToView.vmName}</h2>
                  <p className="text-muted-foreground">ID: {vmToView.vmId || 'N/A'}</p>
                </div>
                <div className="flex flex-col items-end">
                  {getStatusBadge(vmToView.vmStatus)}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-medium mb-2 flex items-center text-primary">
                    <Server className="h-4 w-4 mr-2" />
                    Core Information
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="font-medium">VM Name:</dt>
                    <dd>{vmToView.vmName}</dd>
                    <dt className="font-medium">VM ID:</dt>
                    <dd>{vmToView.vmId || 'N/A'}</dd>
                    <dt className="font-medium">Status:</dt>
                    <dd>{getStatusBadge(vmToView.vmStatus)}</dd>
                    <dt className="font-medium">IP Address:</dt>
                    <dd>{vmToView.vmIp || 'N/A'}</dd>
                    <dt className="font-medium">Operating System:</dt>
                    <dd>{vmToView.vmOs || 'N/A'}</dd>
                  </dl>
                </div>

                <div>
                  <h3 className="text-base font-medium mb-2 flex items-center text-primary">
                    <HardDrive className="h-4 w-4 mr-2" />
                    System Specifications
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="font-medium">CPU Cores:</dt>
                    <dd>{vmToView.cpuCount || 'N/A'}</dd>
                    <dt className="font-medium">Memory:</dt>
                    <dd>{vmToView.memoryGB ? `${vmToView.memoryGB} GB` : 'N/A'}</dd>
                    <dt className="font-medium">Disk Capacity:</dt>
                    <dd>{vmToView.diskCapacityGB ? `${vmToView.diskCapacityGB} GB` : 'N/A'}</dd>
                  </dl>
                </div>

                <div>
                  <h3 className="text-base font-medium mb-2 flex items-center text-primary">
                    <Users className="h-4 w-4 mr-2" />
                    Request & Approval
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="font-medium">Requestor:</dt>
                    <dd>{vmToView.requestor || 'N/A'}</dd>
                    <dt className="font-medium">Knox ID:</dt>
                    <dd>{vmToView.knoxId || 'N/A'}</dd>
                    <dt className="font-medium">Department:</dt>
                    <dd>{vmToView.department || 'N/A'}</dd>
                    <dt className="font-medium">Approval Number:</dt>
                    <dd>{vmToView.approvalNumber || 'N/A'}</dd>
                  </dl>
                </div>

                <div>
                  <h3 className="text-base font-medium mb-2 flex items-center text-primary">
                    <Calendar className="h-4 w-4 mr-2" />
                    Duration & Tracking
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="font-medium">Start Date:</dt>
                    <dd>{vmToView.startDate || 'N/A'}</dd>
                    <dt className="font-medium">End Date:</dt>
                    <dd>{vmToView.endDate || 'N/A'}</dd>
                    <dt className="font-medium">Jira Number:</dt>
                    <dd>{vmToView.jiraNumber || 'N/A'}</dd>
                  </dl>
                </div>
              </div>

              {vmToView.remarks && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-base font-medium mb-2 flex items-center text-primary">
                      <FileText className="h-4 w-4 mr-2" />
                      Remarks
                    </h3>
                    <p className="text-sm whitespace-pre-line border border-border rounded-md p-3 bg-muted/50">
                      {vmToView.remarks}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                setIsViewDialogOpen(false);
                setVmToEdit(vmToView);
                setIsEditDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit VM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval History Dialog */}
      <Dialog open={isApprovalHistoryDialogOpen} onOpenChange={setIsApprovalHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Approval Number History - {selectedVmForHistory?.vmName}
            </DialogTitle>
            <DialogDescription>
              Track all changes made to the approval number for this virtual machine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {approvalHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approval number changes recorded for this VM.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvalHistory.map((entry, index) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {index === 0 ? "Latest" : `Change ${approvalHistory.length - index}`}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.changedAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">From</Label>
                            <p className="font-mono text-sm bg-red-50 border border-red-200 rounded px-2 py-1">
                              {entry.oldApprovalNumber || 'None'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">To</Label>
                            <p className="font-mono text-sm bg-green-50 border border-green-200 rounded px-2 py-1">
                              {entry.newApprovalNumber || 'None'}
                            </p>
                          </div>
                        </div>

                        {entry.changedByName && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Changed By</Label>
                            <p className="text-sm">{entry.changedByName} ({entry.changedByUsername})</p>
                          </div>
                        )}

                        {entry.reason && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Reason</Label>
                            <p className="text-sm">{entry.reason}</p>
                          </div>
                        )}

                        {entry.notes && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Notes</Label>
                            <p className="text-sm">{entry.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsApprovalHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Virtual Machines</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import VM data. Download the template for the correct format.
              <br />
              <strong>Special characters supported:</strong> All symbols including , . @ - _ + = () [] {} | ; : " ' / \ ? ! # $ % ^ & *
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportFile}
                className="hidden"
              />
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importVmMutation.isPending}
                  >
                    Choose CSV File
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload a CSV file with VM data
                </p>
              </div>
            </div>

            {importVmMutation.isPending && (
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 transition ease-in-out duration-150">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              </div>
            )}

            {importResults && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Import Results</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Total: {importResults.total}</p>
                  <p className="text-green-600">Successful: {importResults.successful}</p>
                  {importResults.updated > 0 && <p className="text-blue-600">Updated: {importResults.updated}</p>}
                  {importResults.failed > 0 && <p className="text-red-600">Failed: {importResults.failed}</p>}
                </div>
                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <div className="max-h-32 overflow-y-auto">
                      {importResults.errors.map((error: string, index: number) => (
                        <p key={index} className="text-xs text-red-600">{error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportResults(null);
              }}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setVmToDelete(null);
        }}
        onConfirm={handleDeleteVM}
        itemType="virtual machine"
        itemName={vmToDelete ? `${vmToDelete.vmName} (${vmToDelete.vmId})` : ""}
        isLoading={deleteVmMutation.isPending}
      />
    </div>
  );
}