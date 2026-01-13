import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Asset, User, AssetCategories, AssetStatus } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getStatusColor } from "@/lib/utils";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowUpDownIcon,
  FilterIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AssetTableProps {
  assets: Asset[];
  isLoading: boolean;
  onEdit: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  limit?: number;
  onView?: (asset: Asset) => void;
  onFilteredAssetsChange?: (filteredAssets: Asset[]) => void;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

type SortField = 'assetTag' | 'name' | 'serialNumber' | 'status' | 'condition' | 'category' | 'assignedTo' | 'knoxId' ;
type SortDirection = 'asc' | 'desc' | null;

interface ColumnFilter {
  assetTag: string;
  name: string;
  serialNumber: string;
  status: string;
  condition: string;
  category: string;
  assignedTo: string;
  knoxId: string;
}

export default function AssetTable({ assets, isLoading, onEdit, onDelete, limit, onView, onFilteredAssetsChange, pageSize: propPageSize, currentPage, onPageChange }: AssetTableProps) {
  const [page, setPage] = useState(currentPage || 1);
  const [conditionFilter, setConditionFilter] = useState("all");
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState(propPageSize || limit || 10);
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({
    assetTag: '',
    name: '',
    serialNumber: '',
    status: '',
    condition: '',
    category: '',
    assignedTo: '',
    knoxId: ''
  });
  const { toast } = useToast();
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');

  // Get all users to display assigned names
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    retry: false
  });

  // Get assigned information (KnoxID has priority over username)
  const getAssignedInfo = (asset: Asset) => {
    if (asset.knoxId && asset.knoxId.trim() !== '') {
      return asset.knoxId;
    } else if (asset.assignedTo && users) {
      const user = users.find(user => user.id === asset.assignedTo);
      return user ? `${user.firstName} ${user.lastName}` : "-";
    }
    return "-";
  };

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      const response = await apiRequest('DELETE', `/api/assets/${assetId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully.",
      });
      // Invalidate and refetch all asset-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      // Force refetch of assets
      queryClient.refetchQueries({ queryKey: ['/api/assets'] });
      setAssetToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setAssetToDelete(null);
    }
  });

    const downloadCSV = (data: any[], filename: string) => {
    const csv = convertArrayToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertArrayToCSV = (data: any[]) => {
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return `"${value ? String(value).replace(/"/g, '""') : ''}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  const handleExport = () => {
    if (filteredAssets.length === 0) {
      toast({
        title: "Export failed",
        description: "No filtered data to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredAssets.map(asset => ({
      AssetTag: asset.assetTag,
      Name: asset.name,
      SerialNumber: asset.serialNumber,
      Status: asset.status,
      Condition: asset.condition,
      Category: asset.category,
      AssignedTo: getAssignedInfo(asset),
      KnoxId: asset.knoxId || '',
      Location: asset.location || '',
      Notes: asset.notes || '',
      PurchaseDate: asset.purchaseDate || '',
	  ipAddress: asset.ipAddress || '',
	  macAddress: asset.macAddress || '',
	  department: asset.department || '',
      WarrantyExpiration: asset.warrantyExpiration || '',
      ModelNumber: asset.modelNumber || '',
      Manufacturer: asset.manufacturer || '',
      Supplier: asset.supplier || '',
      Cost: asset.cost || '',
      InvoiceNumber: asset.invoiceNumber || '',
      UpdatedAt: asset.updatedAt || '',
    }));

    // Generate filename with filter info
    let filename = 'assets-export';
    const activeFilters = [];
    if (searchTerm) activeFilters.push(`search-${searchTerm.substring(0, 10)}`);
    if (categoryFilter !== 'all') activeFilters.push(`cat-${categoryFilter}`);
    if (statusFilter !== 'all') activeFilters.push(`status-${statusFilter}`);
    if (departmentFilter !== 'all') activeFilters.push(`dept-${departmentFilter}`);

    if (activeFilters.length > 0) {
      filename += `-filtered-${activeFilters.join('-')}`;
    }

    filename += '.csv';

    downloadCSV(exportData, filename);
    toast({
      title: "Export successful",
      description: `${filteredAssets.length} filtered assets exported to CSV`,
    });
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
    setPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({
      assetTag: '',
      name: '',
      serialNumber: '',
      status: '',
      condition: '',
      category: '',
      assignedTo: '',
      knoxId: ''
    });
    setSortField(null);
    setSortDirection(null);
    setPage(1);
  };

  // Filter and sort assets
  const filteredAndSortedAssets = assets
    .filter(asset => {
      const assignedInfo = getAssignedInfo(asset);
      return (
        asset.assetTag?.toLowerCase().includes(columnFilters.assetTag.toLowerCase()) &&
        asset.name?.toLowerCase().includes(columnFilters.name.toLowerCase()) &&
        (asset.serialNumber || '').toLowerCase().includes(columnFilters.serialNumber.toLowerCase()) &&
        (columnFilters.status === '' || asset.status === columnFilters.status) &&
        (columnFilters.condition === '' || asset.condition === columnFilters.condition) &&
        (columnFilters.category === '' || asset.category === columnFilters.category) &&
        assignedInfo.toLowerCase().includes(columnFilters.assignedTo.toLowerCase()) &&
        (asset.knoxId || '').toLowerCase().includes(columnFilters.knoxId.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      let aValue: string | number | null = '';
      let bValue: string | number | null = '';

      switch (sortField) {
        case 'assetTag':
          aValue = a.assetTag || '';
          bValue = b.assetTag || '';
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'serialNumber':
          aValue = a.serialNumber || '';
          bValue = b.serialNumber || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'condition':
          aValue = a.condition || '';
          bValue = b.condition || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'assignedTo':
          aValue = getAssignedInfo(a);
          bValue = getAssignedInfo(b);
          break;
        case 'knoxId':
          aValue = a.knoxId || '';
          bValue = b.knoxId || '';
          break;
      }

      if (aValue === null || bValue === null) return 0; // Handle null values if necessary

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredAndSortedAssets.length / pageSize);
  const displayedAssets = limit ? filteredAndSortedAssets.slice(0, limit) : filteredAndSortedAssets.slice((page - 1) * pageSize, page * pageSize);

  // Get unique values for filter dropdowns
  const uniqueStatuses = [...new Set(assets.map(asset => asset.status))];
  const uniqueConditions = [...new Set(assets.map(asset => asset.condition))];
  const uniqueCategories = [...new Set(assets.map(asset => asset.category))];

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

    useEffect(() => {
      if (onFilteredAssetsChange) {
        onFilteredAssetsChange(filteredAndSortedAssets);
      }
        setFilteredAssets(filteredAndSortedAssets);
    }, [filteredAndSortedAssets, onFilteredAssetsChange]);

  return (
    <div className="bg-card dark:bg-muted rounded-lg shadow">
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={() => assetToDelete && deleteAssetMutation.mutate(assetToDelete.id)}
        itemType="asset"
        itemName={assetToDelete ? `${assetToDelete.name} (${assetToDelete.assetTag})` : ""}
        isLoading={deleteAssetMutation.isPending}
      />

      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Assets Overview</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All Filters
          </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export
            </Button>
          <Link href="/assets">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-100 w-full rounded"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 w-full rounded"></div>
            ))}
          </div>
        ) : !isLoading && assets.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No assets found</h3>
            <p className="text-gray-500 mb-4">No assets exist in the database</p>
            <Link href="/assets?add=true">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add First Asset
              </Button>
            </Link>
          </div>
        ) : displayedAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Asset Tag</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('assetTag')}
                          className="h-6 w-6 p-0"
                        >
                          {getSortIcon('assetTag')}
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <FilterIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <Input
                            placeholder="Filter asset tags..."
                            value={columnFilters.assetTag}
                            onChange={(e) => handleFilterChange('assetTag', e.target.value)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Name</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('name')}
                          className="h-6 w-6 p-0"
                        >
                          {getSortIcon('name')}
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <FilterIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <Input
                            placeholder="Filter names..."
                            value={columnFilters.name}
                            onChange={(e) => handleFilterChange('name', e.target.value)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Serial Number</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('serialNumber')}
                          className="h-6 w-6 p-0"
                        >
                          {getSortIcon('serialNumber')}
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <FilterIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <Input
                            placeholder="Filter serial numbers..."
                            value={columnFilters.serialNumber}
                            onChange={(e) => handleFilterChange('serialNumber', e.target.value)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('status')}
                          className="h-6 w-6 p-0"
                        >
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
                          <Select
                            value={columnFilters.status || "all"}
                            onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              {uniqueStatuses.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Condition</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('condition')}
                          className="h-6 w-6 p-0"
                        >
                          {getSortIcon('condition')}
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <FilterIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <Select
                            value={columnFilters.condition || "all"}
                            onValueChange={(value) => handleFilterChange('condition', value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filter by condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Conditions</SelectItem>
                              {uniqueConditions.map(condition => (
                                <SelectItem key={condition} value={condition}>
                                  {condition}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Category</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('category')}
                          className="h-6 w-6 p-0"
                        >
                          {getSortIcon('category')}
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <FilterIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <Select
                            value={columnFilters.category || "all"}
                            onValueChange={(value) => handleFilterChange('category', value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {uniqueCategories.map(category => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Assigned To</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('assignedTo')}
                          className="h-6 w-6 p-0"
                        >
                          {getSortIcon('assignedTo')}
                        </Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <FilterIcon className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <Input
                            placeholder="Filter assigned to..."
                            value={columnFilters.assignedTo}
                            onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Knox ID</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('knoxId')}
                          className="h-6 w-6 p-0"
                        >
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
                          <Input
                            placeholder="Filter Knox IDs..."
                            value={columnFilters.knoxId}
                            onChange={(e) => handleFilterChange('knoxId', e.target.value)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

			  <TableBody>
                {displayedAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <Link href={`/assets/${asset.id}`} className="text-primary hover:underline">
                        {asset.assetTag}
                      </Link>
                    </TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell className="text-gray-500">{asset.serialNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(asset.status)}>
                        {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={asset.condition === 'Good' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>{getAssignedInfo(asset)}</TableCell>
                    <TableCell>{asset.knoxId || '-'}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Link href={`/assets/${asset.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Asset Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        {onEdit && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onEdit(asset)}
                            title="Edit Asset"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setAssetToDelete(asset)}
                            title="Delete Asset"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!limit && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredAndSortedAssets.length)} of {filteredAndSortedAssets.length} assets
                </div>
                                <Select value={pageSize.toString()} onValueChange={(value) => {
                                        setPageSize(parseInt(value));
                                        setPage(1);
                                }}>
                                        <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select page size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                                {[10, 20, 30, 40, 50].map((size) => (
                                                        <SelectItem key={size} value={size.toString()}>
                                                                Show {size}
                                                        </SelectItem>
                                                ))}
                                        </SelectContent>
                                </Select>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => {
                          const newPage = Math.max(1, page - 1);
                          setPage(newPage);
                          if (onPageChange) onPageChange(newPage);
                        }}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {/* Page numbers */}
                    {(() => {
                      const pages = [];
                      const startPage = Math.max(1, page - 2);
                      const endPage = Math.min(totalPages, page + 2);

                      // Add first page if not in range
                      if (startPage > 1) {
                        pages.push(
                          <PaginationItem key={1}>
                            <PaginationLink 
                              onClick={() => {
                                setPage(1);
                                if (onPageChange) onPageChange(1);
                              }}
                              isActive={page === 1}
                              className="cursor-pointer"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <PaginationItem key="ellipsis1">
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                      }

                      // Add page range
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <PaginationItem key={i}>
                            <PaginationLink 
                              onClick={() => {
                                setPage(i);
                                if (onPageChange) onPageChange(i);
                              }}
                              isActive={page === i}
                              className="cursor-pointer"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      // Add last page if not in range
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <PaginationItem key="ellipsis2">
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        pages.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink 
                              onClick={() => {
                                setPage(totalPages);
                                if (onPageChange) onPageChange(totalPages);
                              }}
                              isActive={page === totalPages}
                              className="cursor-pointer"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      return pages;
                    })()}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => {
                          const newPage = Math.min(totalPages, page + 1);
                          setPage(newPage);
                          if (onPageChange) onPageChange(newPage);
                        }}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {Math.min(limit, filteredAndSortedAssets.length)} of {filteredAndSortedAssets.length} assets
                </div>
                <Link href="/assets" className="text-sm font-medium text-primary hover:underline">
                  View All Assets
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No assets found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first asset</p>
            <Link href="/assets?add=true">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}