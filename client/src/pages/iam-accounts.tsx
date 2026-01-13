import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusIcon,
  SearchIcon,
  FileDownIcon,
  UploadIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  FileTextIcon,
  Ellipsis,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  HistoryIcon // Changed to HistoryIcon to avoid conflict with Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";


// IAM Account type - matches database schema
interface IAMAccount {
  id: number;
  requestor: string;
  knoxId: string;
  name: string | null; // Users Name
  userKnoxId: string | null; // User Knox ID - new field
  permission: string;
  durationStartDate: string | null;
  durationEndDate: string | null;
  cloudPlatform: string;
  projectAccounts: string | null;
  approvalId: string | null;
  remarks?: string | null;
  status: 'active' | 'expired' | 'expired_not_notified' | 'expired_notified' | 'extended' | 'access_removed';
  createdAt: string;
  updatedAt: string;
}

// Interface for Approval History
interface IAMAccountApprovalHistory {
  id: number;
  iamAccountId: number;
  approvalNumber: string;
  duration: string; // e.g., "3 months", "6 months"
  action: string; // e.g., "Approved", "Extended", "Revoked"
  actedBy: string;
  actedAt: string;
}

const cloudPlatforms = ["AWS", "Azure", "Google Cloud", "Oracle Cloud"];
// Updated status types to include new expired statuses
const statusTypes = ["active", "expired", "expired_not_notified", "expired_notified", "extended", "access_removed"];

type SortField = 'requestor' | 'knoxId' | 'permission' | 'cloudPlatform' | 'projectAccounts' | 'approvalId' | 'status';
type SortDirection = 'asc' | 'desc' | null;

interface ColumnFilter {
  requestor: string;
  knoxId: string;
  name: string;
  userKnoxId: string;
  permission: string;
  cloudPlatform: string;
  projectAccounts: string;
  approvalId: string;
  status: string;
}

export default function IAMAccounts() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [projectAccountFilter, setProjectAccountFilter] = useState("all");

  // Handle URL parameters for filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('statusFilter');
    if (statusParam && statusTypes.includes(statusParam)) {
      setStatusFilter(statusParam);
    }
  }, []);
  const [accountToEdit, setAccountToEdit] = useState<IAMAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<IAMAccount | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCheckingExpired, setIsCheckingExpired] = useState(false);

  // State for Approval History Dialog
  const [isApprovalHistoryDialogOpen, setIsApprovalHistoryDialogOpen] = useState(false);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<IAMAccount | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<IAMAccountApprovalHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting and column filtering state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({
    requestor: '',
    knoxId: '',
    name: '',
    userKnoxId: '',
    permission: '',
    cloudPlatform: '',
    projectAccounts: '',
    approvalId: '',
    status: ''
  });

  // Column visibility state - default columns as requested
  const [visibleColumns, setVisibleColumns] = useState({
    requestor: true,
    knoxId: true,
    name: true,
    userKnoxId: true,
    role: true, // permission/role
    duration: true,
    cloudPlatform: false,
    projectAccounts: true,
    approvalId: true,
    status: true,
    remarks: true,
    actions: true
  });

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<IAMAccount>>({
    requestor: "",
    knoxId: "",
    name: "",
    userKnoxId: "",
    permission: "",
    durationStartDate: "",
    durationEndDate: "",
    cloudPlatform: "",
    projectAccounts: "",
    approvalId: "",
    remarks: "",
    status: 'active'
  });

  // Function to calculate automatic status based on dates
  const calculateStatus = (account: IAMAccount): IAMAccount => {
    const now = new Date();
    const startDate = account.durationStartDate ? new Date(account.durationStartDate) : null;
    const endDate = account.durationEndDate ? new Date(account.durationEndDate) : null;

    let calculatedStatus = account.status;

    // Auto-calculate status based on dates
    if (startDate && endDate) {
      if (now >= startDate && now <= endDate) {
        calculatedStatus = 'active';
      } else if (now > endDate) {
        // If expired and not manually set to notified, default to expired_not_notified
        calculatedStatus = account.status === 'expired_notified' ? 'expired_notified' : 'expired_not_notified';
      }
    } else if (endDate && now > endDate) {
      // If only end date exists and it's past
      calculatedStatus = account.status === 'expired_notified' ? 'expired_notified' : 'expired_not_notified';
    }

    // Handle manual status updates for extended/access_removed
    if (account.status === 'extended') {
      calculatedStatus = 'extended';
    } else if (account.status === 'access_removed') {
      calculatedStatus = 'access_removed';
    }

    return { ...account, status: calculatedStatus };
  };

  // Fetch IAM accounts from API
  const { data: rawIamAccounts = [], isLoading, error } = useQuery({
    queryKey: ['/api/iam-accounts'],
    queryFn: async () => {
      console.log('Fetching IAM accounts from API...');
      try {
        const response = await fetch('/api/iam-accounts', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`Failed to fetch IAM accounts: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Received IAM accounts data:', data);
        console.log('Number of accounts:', data?.length || 0);

        // Ensure we return an array
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error fetching IAM accounts:', err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 0 // Always refetch to ensure fresh data
  });

  // Apply automatic status calculation
  const iamAccounts = rawIamAccounts.map(calculateStatus);

  // Fetch IAM Account Approval History
  const fetchApprovalHistory = async (accountId: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/iam-accounts/${accountId}/history`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch approval history: ${errorText}`);
      }

      const data = await response.json();
      setApprovalHistory(data);
    } catch (err) {
      console.error('Error fetching approval history:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load approval history.",
        variant: "destructive",
      });
      setApprovalHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<IAMAccount>) => {
      const response = await fetch('/api/iam-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create IAM account: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
      
      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'created',
          itemType: 'IAM Account',
          itemName: data.knoxId || 'New Account',
          details: `IAM Account created: ${data.knoxId}, Requestor: ${data.requestor}, Platform: ${data.cloudPlatform}, Permission: ${data.permission}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IAMAccount> }) => {
      const response = await fetch(`/api/iam-accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update IAM account: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
      
      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'updated',
          itemType: 'IAM Account',
          itemName: data.knoxId || 'Account',
          details: `IAM Account updated: ${data.knoxId}, Status: ${data.status}, Requestor: ${data.requestor}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/iam-accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete IAM account: ${errorText}`);
      }

      return true;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
      
      // Find the deleted account details for the email
      const deletedAccount = iamAccounts.find(acc => acc.id === deletedId);
      if (deletedAccount) {
        // Send email notification
        fetch('/api/send-modification-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'deleted',
            itemType: 'IAM Account',
            itemName: `${deletedAccount.knoxId || 'Account'} - ${deletedAccount.requestor}`,
            details: `IAM Account deleted: ${deletedAccount.knoxId}, Requestor: ${deletedAccount.requestor}, Platform: ${deletedAccount.cloudPlatform}`
          })
        }).catch(err => console.error('Failed to send email notification:', err));
      }
    }
  });

  // Get unique values from actual data for filters
  const uniquePlatforms = [...new Set(iamAccounts.map(account => account.cloudPlatform).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(iamAccounts.map(account => account.status).filter(Boolean))].sort();
  const uniqueProjectAccounts = [...new Set(iamAccounts.map(account => account.projectAccounts).filter(Boolean))].sort();

  const filteredAccounts = iamAccounts.filter(account => {
    const matchesSearch = !searchTerm ||
      account.requestor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.knoxId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.approvalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.cloudPlatform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.projectAccounts?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || account.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || account.cloudPlatform === platformFilter;
    const matchesProjectAccount = projectAccountFilter === "all" || account.projectAccounts === projectAccountFilter;

    // Column filters - fix the null/undefined handling
    const matchesColumnFilters = (
      (account.requestor || '').toLowerCase().includes(columnFilters.requestor.toLowerCase()) &&
      (account.knoxId || '').toLowerCase().includes(columnFilters.knoxId.toLowerCase()) &&
      (account.userKnoxId || '').toLowerCase().includes(columnFilters.userKnoxId.toLowerCase()) &&
      (account.permission || '').toLowerCase().includes(columnFilters.permission.toLowerCase()) &&
      (columnFilters.cloudPlatform === '' || account.cloudPlatform === columnFilters.cloudPlatform) &&
      (account.projectAccounts || '').toLowerCase().includes(columnFilters.projectAccounts.toLowerCase()) &&
      (account.approvalId || '').toLowerCase().includes(columnFilters.approvalId.toLowerCase()) &&
      (columnFilters.status === '' || account.status === columnFilters.status)
    );

    return matchesSearch && matchesStatus && matchesPlatform && matchesProjectAccount && matchesColumnFilters;
  }).sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue: string | null = '';
    let bValue: string | null = '';

    switch (sortField) {
      case 'requestor':
        aValue = a.requestor || '';
        bValue = b.requestor || '';
        break;
      case 'knoxId':
        aValue = a.knoxId || '';
        bValue = b.knoxId || '';
        break;
      case 'permission':
        aValue = a.permission || '';
        bValue = b.permission || '';
        break;
      case 'cloudPlatform':
        aValue = a.cloudPlatform || '';
        bValue = b.cloudPlatform || '';
        break;
      case 'projectAccounts':
        aValue = a.projectAccounts || '';
        bValue = b.projectAccounts || '';
        break;
      case 'approvalId':
        aValue = a.approvalId || '';
        bValue = b.approvalId || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle column filter change
  const handleFilterChange = (field: keyof ColumnFilter, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({
      requestor: '',
      knoxId: '',
      name: '',
      userKnoxId: '',
      permission: '',
      cloudPlatform: '',
      projectAccounts: '',
      approvalId: '',
      status: ''
    });
    setSortField(null);
    setSortDirection(null);
    setCurrentPage(1);
    setSearchTerm("");
    setStatusFilter("all");
    setPlatformFilter("all");
    setProjectAccountFilter("all");
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDownIcon className="h-4 w-4" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUpIcon className="h-4 w-4" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDownIcon className="h-4 w-4" />;
    }
    return <ArrowUpDownIcon className="h-4 w-4" />;
  };

  const generatePageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages.filter((page, index, self) => {
      // Remove duplicates and consecutive ellipses
      if (page === '...') {
        return index === 0 || self[index - 1] !== '...';
      }
      return self.indexOf(page) === index;
    });
  };

  // Debug logging
  console.log('Raw IAM accounts data:', iamAccounts);
  console.log('Filtered IAM accounts:', filteredAccounts);
  console.log('Current filters:', { searchTerm, statusFilter, platformFilter, projectAccountFilter });
  console.log('Unique platforms:', uniquePlatforms);
  console.log('Unique statuses:', uniqueStatuses);
  console.log('Unique project accounts:', uniqueProjectAccounts);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'expired':
      case 'expired_not_notified':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired (Not Notified)</Badge>;
      case 'expired_notified':
        return <Badge variant="destructive" className="bg-red-700 hover:bg-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Expired (Notified)</Badge>;
      case 'extended':
        return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white"><RotateCcw className="w-3 h-3 mr-1" />Extended</Badge>;
      case 'access_removed':
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><XCircle className="w-3 h-3 mr-1" />Access Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalIdDisplay = (approvalId: string, status: string) => {
    // Highlight if expired and not notified for attention
    if (status === 'expired' || status === 'expired_not_notified') {
      return (
        <span className="font-bold underline text-red-600">
          {approvalId}
        </span>
      );
    }
    return approvalId;
  };

  const getDurationDisplay = (account: IAMAccount) => {
    if (account.status === 'extended') {
      // Updated note for Extended Status
      return <span className="text-gray-400 italic">Extended Access (dates removed)</span>;
    }
    if (account.status === 'access_removed') {
      // Updated note for Access Remove
      return (
        <div>
          <div className="text-gray-400 line-through">Start: {account.durationStartDate || 'N/A'}</div>
          <div>End: {account.durationEndDate || 'N/A'}</div>
        </div>
      );
    }
    return (
      <div>
        <div>Start: {account.durationStartDate || 'N/A'}</div>
        <div>End: {account.durationEndDate || 'N/A'}</div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Handle specific logic for extended and access_removed status changes
    let updatedFormData = { ...formData };

    if (formData.status === 'extended') {
      updatedFormData.durationStartDate = ''; // Manually remove both dates
      updatedFormData.durationEndDate = '';
      updatedFormData.remarks = (updatedFormData.remarks || '') + ' Extended Access'; // Add comment to remarks
    } else if (formData.status === 'access_removed') {
      updatedFormData.durationStartDate = ''; // Manually remove start date
      updatedFormData.remarks = (updatedFormData.remarks || '') + ' Access Removed'; // Add comment to remarks
    } else if (accountToEdit && accountToEdit.status === 'extended' && formData.status !== 'extended') {
      // If transitioning FROM extended, ensure dates are handled appropriately
      // This part might need more specific logic depending on how 'extended' is meant to be overwritten
    } else if (accountToEdit && accountToEdit.status === 'access_removed' && formData.status !== 'access_removed') {
      // If transitioning FROM access_removed
    }


    try {
      if (accountToEdit) {
        await updateMutation.mutateAsync({ id: accountToEdit.id, data: updatedFormData });
        toast({
          title: "Account Updated",
          description: "IAM Account has been updated successfully"
        });
      } else {
        await createMutation.mutateAsync(updatedFormData);
        toast({
          title: "Account Created",
          description: "IAM Account has been created successfully"
        });
      }

      setIsAddDialogOpen(false);
      setAccountToEdit(null);
      resetForm();
    } catch (error) {
      console.error('Error saving IAM account:', error);
      toast({
        title: "Error",
        description: "Failed to save IAM account. Please check your data and try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      requestor: "",
      knoxId: "",
      name: "",
      userKnoxId: "",
      permission: "",
      durationStartDate: "",
      durationEndDate: "",
      cloudPlatform: "",
      projectAccounts: "",
      approvalId: "",
      remarks: "",
      status: 'active'
    });
  };

  const handleEdit = (account: IAMAccount) => {
    setAccountToEdit(account);
    // Pre-fill form, ensuring correct handling of null/empty dates for manual statuses
    setFormData({
      ...account,
      durationStartDate: account.status === 'extended' || account.status === 'access_removed' ? '' : account.durationStartDate || '',
      durationEndDate: account.status === 'extended' ? '' : account.durationEndDate || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async () => {
    if (accountToDelete) {
      try {
        await deleteMutation.mutateAsync(accountToDelete.id);
        toast({
          title: "Account Deleted",
          description: "IAM Account has been deleted successfully"
        });
        setAccountToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete IAM account",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no IAM accounts to export.",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = [
      "requestor",
      "knoxId",
      "name",
      "userKnoxId",
      "role",
      "cloudPlatform",
      "durationStartDate",
      "durationEndDate",
      "projectAccounts",
      "approvalId",
      "remarks",
      "status"
    ];

    // Helper function to properly escape CSV values
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      
      // Check if value needs quoting (contains comma, quote, newline, or special chars)
      const needsQuoting = stringValue.includes(',') || 
                          stringValue.includes('"') || 
                          stringValue.includes('\n') || 
                          stringValue.includes('\r') ||
                          stringValue.includes(':') ||
                          stringValue.includes(';');
      
      if (needsQuoting) {
        // Escape double quotes by doubling them and wrap in quotes
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    const csvData = filteredAccounts.map(account => [
      account.requestor || '',
      account.knoxId || '',
      account.name || '',
      account.userKnoxId || '',
      account.permission || '',
      account.cloudPlatform || '',
      account.durationStartDate || '',
      account.durationEndDate || '',
      account.projectAccounts || '',
      account.approvalId || '',
      account.remarks || '',
      account.status || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(escapeCSVValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `iam-accounts-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "IAM accounts data has been exported to CSV."
    });
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        requestor: "John Doe",
        knoxId: "KNOX001",
        name: "John Doe",
        userKnoxId: "john.doe",
        role: "IAM:ReadOnly",
        cloudPlatform: "AWS",
        durationStartDate: "2024-01-15",
        durationEndDate: "2024-07-15",
        projectAccounts: "dev-account-001",
        approvalId: "APV-2024-001",
        remarks: "Development access for Q1 project",
        status: "active"
      },
      {
        requestor: "Jane Smith",
        knoxId: "KNOX002",
        name: "Jane Smith",
        userKnoxId: "jane.smith",
        role: "IAM:FullAccess",
        cloudPlatform: "Azure",
        durationStartDate: "2024-02-01",
        durationEndDate: "2024-08-01",
        projectAccounts: "prod-account-002",
        approvalId: "APV-2024-002",
        remarks: "Production environment access",
        status: "expired_not_notified"
      },
      {
        requestor: "Peter Jones",
        knoxId: "KNOX004",
        name: "Peter Jones",
        userKnoxId: "peter.jones",
        role: "S3:Read",
        cloudPlatform: "AWS",
        durationStartDate: "",
        durationEndDate: "2024-09-01",
        projectAccounts: "bucket-access",
        approvalId: "APV-2024-004",
        remarks: "Removed start date as requested",
        status: "access_removed"
      },
      {
        requestor: "Alice Brown",
        knoxId: "KNOX005",
        name: "Alice Brown",
        userKnoxId: "alice.brown",
        role: "EC2:StartStop",
        cloudPlatform: "AWS",
        durationStartDate: "",
        durationEndDate: "",
        projectAccounts: "compute-access",
        approvalId: "APV-2024-005",
        remarks: "Extended Access",
        status: "extended"
      },
      {
        requestor: "Mike O'Connor",
        knoxId: "KNOX003",
        name: "Mike O'Connor",
        userKnoxId: "mike.oconnor",
        role: "S3:ListBucket,S3:GetObject",
        cloudPlatform: "AWS",
        durationStartDate: "2024-03-01",
        durationEndDate: "2024-09-01",
        projectAccounts: "test@company.com",
        approvalId: "APV-2024-003",
        remarks: "Special chars: @#$%&*()_+-=[]{}|;':\",./<>?",
        status: "active"
      }
    ];

    const csvContent = [
      "requestor,knoxId,name,userKnoxId,role,cloudPlatform,durationStartDate,durationEndDate,projectAccounts,approvalId,remarks,status",
      ...templateData.map(row =>
        `"${row.requestor.replace(/"/g, '""')}","${row.knoxId}","${row.name}","${row.userKnoxId}","${row.role.replace(/"/g, '""')}","${row.cloudPlatform}","${row.durationStartDate}","${row.durationEndDate}","${row.projectAccounts.replace(/"/g, '""')}","${row.approvalId}","${row.remarks.replace(/"/g, '""')}",${row.status}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'iam-accounts-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "IAM accounts import template has been downloaded successfully."
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const parseCSVData = (csvContent: string) => {
    // Enhanced CSV parser that handles multi-line text within quoted fields
    const parseCSVContent = (content: string): string[][] => {
      const result: string[][] = [];
      const lines = content.split('\n');
      let currentRow: string[] = [];
      let currentField = '';
      let inQuotes = false;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let charIndex = 0;

        while (charIndex < line.length) {
          const char = line[charIndex];
          const nextChar = line[charIndex + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Handle escaped quotes within quoted field
              currentField += '"';
              charIndex += 2;
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
              charIndex++;
            }
          } else if (char === ',' && !inQuotes) {
            // End of field when not in quotes
            currentRow.push(currentField.trim());
            currentField = '';
            charIndex++;
          } else {
            // Regular character
            currentField += char;
            charIndex++;
          }
        }

        // If we're in quotes, add a newline and continue to next line
        if (inQuotes && lineIndex < lines.length - 1) {
          currentField += '\n';
        } else {
          // End of line and not in quotes, finish the field and row
          currentRow.push(currentField.trim());
          if (currentRow.some(field => field.length > 0) || result.length === 0) {
            result.push([...currentRow]);
          }
          currentRow = [];
          currentField = '';
          inQuotes = false;
        }
      }

      // Handle any remaining field/row
      if (currentField || currentRow.length > 0) {
        if (currentField) currentRow.push(currentField.trim());
        if (currentRow.length > 0) result.push(currentRow);
      }

      return result;
    };

    const rows = parseCSVContent(csvContent);

    if (rows.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const accounts = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];

      // Skip completely empty rows
      if (values.length === 0 || values.every(val => !val || val.trim() === '')) {
        continue;
      }

      try {

        const account: any = { status: 'active' };
        headers.forEach((header, index) => {
          let value = (values[index] || '').trim();

          // Handle empty cells - preserve empty strings for optional fields
          if (!value || value === 'N/A' || value === 'NULL' || value === 'null' || value.toLowerCase() === 'n/a') {
            value = ''; // Keep empty instead of converting to dash
          }

          switch (header) {
            case 'requestor':
              account.requestor = value;
              break;
            case 'knoxid':
            case 'knox_id':
            case 'knox id':
              account.knoxId = value;
              break;
            case 'name':
            case 'username':
            case 'user_name':
            case 'user name':
            case 'users name':
              account.name = value || null;
              break;
            case 'userknoxid':
            case 'user_knox_id':
            case 'user knox id':
            case 'user_knoxid':
              account.userKnoxId = value || null;
              break;
            case 'permission':
            case 'permission/iam/scop':
            case 'role':
              account.permission = value;
              break;
            case 'durationstartdate':
            case 'duration_start_date':
            case 'duration start date':
              account.durationStartDate = value === '-' ? null : value;
              break;
            case 'durationenddate':
            case 'duration_end_date':
            case 'duration end date':
              account.durationEndDate = value === '-' ? null : value;
              break;
            case 'cloudplatform':
            case 'cloud_platform':
            case 'cloud platform':
              account.cloudPlatform = value;
              break;
            case 'projectaccounts':
            case 'project_accounts':
            case 'project accounts':
              account.projectAccounts = value;
              break;
            case 'approvalid':
            case 'approval_id':
            case 'approval id':
              account.approvalId = value;
              break;
            case 'remarks':
            case 'notes':
              account.remarks = value;
              break;
            case 'status':
              // Map imported statuses to internal types
              if (value === 'expired_not_notified' || value === 'expired - not notified') {
                account.status = 'expired_not_notified';
              } else if (value === 'expired_notified' || value === 'expired - notified') {
                account.status = 'expired_notified';
              } else if (value === 'access_removed' || value === 'access removed') {
                account.status = 'access_removed';
              } else if (value === 'extended' || value === 'extended access') {
                account.status = 'extended';
              } else {
                account.status = value === '-' ? 'active' : value; // Default to active if empty or '-'
              }
              break;
          }
        });

        // Since all fields are now optional, check if the row has ANY meaningful data
        const hasAnyData = Object.values(account).some(value =>
          value !== null && value !== undefined && value !== '' && value !== '-'
        );

        if (hasAnyData) {
          // Clean up all fields - convert empty values to null
          account.requestor = (!account.requestor || account.requestor === '-' || account.requestor.trim() === '') ? null : account.requestor;
          account.knoxId = (!account.knoxId || account.knoxId === '-' || account.knoxId.trim() === '') ? null : account.knoxId;
          account.name = (!account.name || account.name === '-' || account.name.trim() === '') ? null : account.name;
          account.userKnoxId = (!account.userKnoxId || account.userKnoxId === '-' || account.userKnoxId.trim() === '') ? null : account.userKnoxId;
          account.permission = (!account.permission || account.permission === '-' || account.permission.trim() === '') ? null : account.permission;
          account.cloudPlatform = (!account.cloudPlatform || account.cloudPlatform === '-' || account.cloudPlatform.trim() === '') ? null : account.cloudPlatform;
          account.durationStartDate = (!account.durationStartDate || account.durationStartDate === '-' || account.durationStartDate.trim() === '') ? null : account.durationStartDate;
          account.durationEndDate = (!account.durationEndDate || account.durationEndDate === '-' || account.durationEndDate.trim() === '') ? null : account.durationEndDate;
          account.projectAccounts = (!account.projectAccounts || account.projectAccounts === '-' || account.projectAccounts.trim() === '') ? null : account.projectAccounts;
          account.approvalId = (!account.approvalId || account.approvalId === '-' || account.approvalId.trim() === '') ? null : account.approvalId;
          account.remarks = (!account.remarks || account.remarks === '-' || account.remarks.trim() === '') ? null : account.remarks;

          accounts.push(account);
          console.log(`✅ Accepting row ${i + 1}:`, account);
        } else {
          console.warn(`Skipping row ${i + 1}: Completely empty row`);
        }
      } catch (parseError) {
        console.warn(`Error parsing line ${i + 1}:`, parseError);
        // Continue with next line instead of failing completely
        continue;
      }
    }

    return accounts;
  };

  const handleCheckExpiredAccounts = async () => {
    setIsCheckingExpired(true);

    try {
      console.log('🔍 Checking for expired IAM accounts...');

      const response = await fetch('/api/check-iam-expirations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to check expired accounts');
      }

      const result = await response.json();
      console.log('Check expired accounts result:', result);

      if (result.count > 0) {
        toast({
          title: "Expired Accounts Found ⚠️",
          description: `Found ${result.count} expired account(s). Notifications sent to admin and account owners (${result.accounts?.map(a => a.knoxId).join(', ')}@samsung.com).`,
        });
      } else {
        toast({
          title: "No Expired Accounts ✓",
          description: "No expired IAM accounts found that need notification.",
        });
      }

      // Refresh the accounts list to show updated statuses
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
    } catch (error) {
      console.error('Error checking expired accounts:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check expired accounts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingExpired(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import.",
        variant: "destructive"
      });
      return;
    }

    setImportStatus('uploading');
    setImportProgress(25);

    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(importFile);
      });

      setImportProgress(50);

      const parsedAccounts = parseCSVData(fileContent);

      console.log('Parsed accounts for import:', parsedAccounts);

      if (parsedAccounts.length === 0) {
        throw new Error('No valid accounts found in CSV. Please ensure required fields (requestor, knoxId, permission, cloudPlatform) are filled.');
      }

      setImportProgress(75);

      // Send to API for import
      const response = await fetch('/api/iam-accounts/import', {
        method: 'POST',
        body: JSON.stringify({ accounts: parsedAccounts }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${errorText}`);
      }

      const importResult = await response.json();

      setImportProgress(100);
      setImportStatus('success');

      toast({
        title: "Import successful",
        description: `Successfully imported ${importResult.successful || parsedAccounts.length} IAM accounts.`
      });

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });

      // Reset import state
      setImportFile(null);
      setIsImportDialogOpen(false);
      setImportStatus('idle');
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">IAM Accounts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage Identity and Access Management accounts. Status is automatically calculated based on duration dates - Active if within date range, Expired if past end date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add IAM Account
          </Button>
          <Popover open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Ellipsis className="mr-2 h-4 w-4" />
                Show/Hide Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-3">Toggle Columns</h4>
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`col-${key}`}
                      checked={value}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`col-${key}`} className="text-sm capitalize">
                      {key === 'role' ? 'Role' : key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={handleCheckExpiredAccounts}
            disabled={isCheckingExpired}
            className="bg-orange-50 hover:bg-orange-100 border-orange-200"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {isCheckingExpired ? 'Checking...' : 'Check Expired Accounts'}
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileDownIcon className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by requestor, Knox ID, approval ID, platform, or project account..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {uniquePlatforms.map(platform => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectAccountFilter} onValueChange={setProjectAccountFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Project Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Project Accounts</SelectItem>
              {uniqueProjectAccounts.map(projectAccount => (
                <SelectItem key={projectAccount} value={projectAccount}>
                  {projectAccount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All Filters
          </Button>
        </div>
      </div>

      {/* Status Management Instructions */}
      <Card>
        <CardContent className="p-4">
          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/20">
            <div className="text-sm space-y-2">
              <div>
                <p className="font-semibold mb-2">Status Management Instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Active:</strong> Current valid access within duration dates</li>
                  <li><strong>Expired - Not Notified:</strong> Automatic status when account expires based on duration dates</li>
                  <li><strong>Expired - Notified:</strong> Manually set when user is notified of account expiration</li>
                  <li><strong>Extended:</strong> Manually remove both dates and add comments on remarks: Extended Access</li>
                  <li><strong>Access Removed:</strong> Manually remove the start date and add comment on remarks the date of removal</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.requestor && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Requestor</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('requestor')} className="h-6 w-6 p-0">
                            {getSortIcon('requestor')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter requestors..." value={columnFilters.requestor} onChange={(e) => handleFilterChange('requestor', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.knoxId && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Knox ID</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('knoxId')} className="h-6 w-6 p-0">
                            {getSortIcon('knoxId')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter Knox IDs..." value={columnFilters.knoxId} onChange={(e) => handleFilterChange('knoxId', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.name && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <span>Users Name</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter names..." value={columnFilters.name} onChange={(e) => handleFilterChange('name', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.userKnoxId && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <span>User Knox ID</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter User Knox IDs..." value={columnFilters.userKnoxId} onChange={(e) => handleFilterChange('userKnoxId', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.role && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Role</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('permission')} className="h-6 w-6 p-0">
                            {getSortIcon('permission')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter roles..." value={columnFilters.permission} onChange={(e) => handleFilterChange('permission', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.duration && <TableHead>Duration</TableHead>}
                  {visibleColumns.cloudPlatform && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Cloud Platform</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('cloudPlatform')} className="h-6 w-6 p-0">
                            {getSortIcon('cloudPlatform')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Select value={columnFilters.cloudPlatform || "all"} onValueChange={(value) => handleFilterChange('cloudPlatform', value === "all" ? "" : value)}>
                              <SelectTrigger><SelectValue placeholder="Filter by platform" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Platforms</SelectItem>
                                {uniquePlatforms.map(platform => (<SelectItem key={platform} value={platform}>{platform}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.projectAccounts && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Project Accounts</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('projectAccounts')} className="h-6 w-6 p-0">
                            {getSortIcon('projectAccounts')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter project accounts..." value={columnFilters.projectAccounts} onChange={(e) => handleFilterChange('projectAccounts', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.approvalId && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Approval ID</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('approvalId')} className="h-6 w-6 p-0">
                            {getSortIcon('approvalId')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Input placeholder="Filter approval IDs..." value={columnFilters.approvalId} onChange={(e) => handleFilterChange('approvalId', e.target.value)} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Status</span>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-6 w-6 p-0">
                            {getSortIcon('status')}
                          </Button>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <FilterIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="end">
                            <Select value={columnFilters.status || "all"} onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}>
                              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {uniqueStatuses.map(status => (<SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.remarks && <TableHead>Remarks</TableHead>}
                  {visibleColumns.actions && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading IAM accounts...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-red-500">
                      Error loading IAM accounts: {error.message}
                    </TableCell>
                  </TableRow>
                ) : paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {iamAccounts.length === 0 ? 'No IAM accounts found' : 'No accounts match the current filters'}
                      <br />
                      <small className="text-xs text-gray-400">
                        Total accounts in database: {iamAccounts.length}
                      </small>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccounts.map((account) => (
                    <TableRow key={account.id}>
                      {visibleColumns.requestor && <TableCell className="font-medium">{account.requestor || '-'}</TableCell>}
                      {visibleColumns.knoxId && <TableCell>{account.knoxId || '-'}</TableCell>}
                      {visibleColumns.name && <TableCell>{account.name || '-'}</TableCell>}
                      {visibleColumns.userKnoxId && <TableCell>{account.userKnoxId || '-'}</TableCell>}
                      {visibleColumns.role && <TableCell>{account.permission || '-'}</TableCell>}
                      {visibleColumns.duration && (
                        <TableCell className="text-sm">
                          {getDurationDisplay(account)}
                        </TableCell>
                      )}
                      {visibleColumns.cloudPlatform && <TableCell>{account.cloudPlatform || '-'}</TableCell>}
                      {visibleColumns.projectAccounts && <TableCell>{account.projectAccounts || '-'}</TableCell>}
                      {visibleColumns.approvalId && (
                        <TableCell>
                          {getApprovalIdDisplay(account.approvalId || '-', account.status)}
                        </TableCell>
                      )}
                      {visibleColumns.status && <TableCell>{getStatusBadge(account.status)}</TableCell>}
                      {visibleColumns.remarks && <TableCell className="max-w-xs truncate">{account.remarks || '-'}</TableCell>}
                      {visibleColumns.actions && (
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(account)}>
                              <EditIcon className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setAccountToDelete(account)}>
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedAccountForHistory(account); fetchApprovalHistory(account.id); setIsApprovalHistoryDialogOpen(true); }}>
                              <HistoryIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={cn(
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {generatePageNumbers().map((pageNumber) => (
                    <PaginationItem key={String(pageNumber)}>
                      {pageNumber === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNumber as number);
                          }}
                          isActive={pageNumber === currentPage}
                        >
                          {pageNumber}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={cn(
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="text-sm text-gray-500">
                {totalItems} total accounts
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{accountToEdit ? 'Edit IAM Account' : 'Add New IAM Account'}</DialogTitle>
            <DialogDescription>
              {accountToEdit ? 'Update the IAM account details' : 'Create a new IAM account entry'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Requestor</label>
                <Input
                  value={formData.requestor || ''}
                  onChange={(e) => setFormData({...formData, requestor: e.target.value})}
                  placeholder="Enter requestor name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Knox ID</label>
                <Input
                  value={formData.knoxId || ''}
                  onChange={(e) => setFormData({...formData, knoxId: e.target.value})}
                  placeholder="Enter Knox ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Users Name</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter user's full name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">User Knox ID</label>
                <Input
                  value={formData.userKnoxId || ''}
                  onChange={(e) => setFormData({...formData, userKnoxId: e.target.value})}
                  placeholder="Enter user Knox ID"
                />
                <p className="text-xs text-gray-500">Email will be sent to: {formData.userKnoxId || 'userknoxid'}@samsung.com</p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Textarea
                  value={formData.permission || ''}
                  onChange={(e) => setFormData({...formData, permission: e.target.value})}
                  placeholder="Enter role details"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration Start Date</label>
                <Input
                  type="date"
                  value={formData.durationStartDate || ''}
                  onChange={(e) => setFormData({...formData, durationStartDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration End Date</label>
                <Input
                  type="date"
                  value={formData.durationEndDate || ''}
                  onChange={(e) => setFormData({...formData, durationEndDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cloud Platform</label>
                <Input
                  value={formData.cloudPlatform || ''}
                  onChange={(e) => setFormData({...formData, cloudPlatform: e.target.value})}
                  placeholder="Enter cloud platform (e.g., AWS, Azure)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Accounts</label>
                <Input
                  value={formData.projectAccounts || ''}
                  onChange={(e) => setFormData({...formData, projectAccounts: e.target.value})}
                  placeholder="Enter project accounts"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Approval ID</label>
                <Input
                  value={formData.approvalId || ''}
                  onChange={(e) => setFormData({...formData, approvalId: e.target.value})}
                  placeholder="Enter approval ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'active'} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTypes.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter any additional remarks"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setAccountToEdit(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {accountToEdit ? 'Update Account' : 'Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval History Dialog */}
      <Dialog open={isApprovalHistoryDialogOpen} onOpenChange={setIsApprovalHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approval History for {selectedAccountForHistory?.requestor} ({selectedAccountForHistory?.knoxId})</DialogTitle>
            <DialogDescription>View the approval and extension history for this IAM account.</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex justify-center items-center py-10">
              <p>Loading history...</p>
            </div>
          ) : approvalHistory.length === 0 ? (
            <div className="flex justify-center items-center py-10">
              <p>No approval history found for this account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Approval Number</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Acted By</TableHead>
                    <TableHead>Acted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalHistory.map((historyItem) => (
                    <TableRow key={historyItem.id}>
                      <TableCell>{historyItem.approvalNumber}</TableCell>
                      <TableCell>{historyItem.duration}</TableCell>
                      <TableCell>{historyItem.action}</TableCell>
                      <TableCell>{historyItem.actedBy}</TableCell>
                      <TableCell>{new Date(historyItem.actedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsApprovalHistoryDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import IAM Accounts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple IAM accounts. Download the template for the correct format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="p-4 border border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <FileTextIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Download the CSV template to ensure proper formatting
                </p>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <FileDownIcon className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select CSV File</label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {importFile && (
                <p className="text-sm text-gray-600">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {importStatus === 'uploading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing accounts...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* CSV Format Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Column order:</strong> requestor, knoxId, name, userKnoxId, role, cloudPlatform, durationStartDate, durationEndDate, projectAccounts, approvalId, remarks, status</p>
              <p><strong>Users Name:</strong> Full name of the user</p>
              <p><strong>User Knox ID:</strong> Used for email notifications (will send to userKnoxId@samsung.com)</p>
              <p><strong>Knox ID:</strong> Also receives notifications at knoxId@samsung.com</p>
              <p><strong>Date format:</strong> YYYY-MM-DD</p>
              <p><strong>Status options:</strong> active, expired, expired_not_notified, expired_notified, extended, access_removed</p>
              <p><strong>Note:</strong> All fields are optional - records with empty fields will be accepted</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
                setImportStatus('idle');
                setImportProgress(0);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={importStatus === 'uploading'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={!importFile || importStatus === 'uploading'}
            >
              {importStatus === 'uploading' ? 'Importing...' : 'Import Accounts'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDelete}
        itemType="IAM account"
        itemName={accountToDelete ? `${accountToDelete.requestor} (${accountToDelete.knoxId})` : ""}
        isLoading={false}
      />
    </div>
  );
}