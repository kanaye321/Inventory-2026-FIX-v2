import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, DownloadIcon, UploadIcon, ArrowUpDown, ArrowUp, ArrowDown, FilterIcon, HistoryIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AzureInventoryForm from "@/components/azure-inventory/azure-inventory-form";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export default function AzureInventory() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    type: '',
    resourceGroup: '',
    location: '',
    subscriptions: '',
    status: '',
    remarks: ''
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedChangeType, setSelectedChangeType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();

  const { data: historicalData = [] } = useQuery({
    queryKey: ['/api/azure-inventory/historical'],
    queryFn: async () => {
      const response = await fetch('/api/azure-inventory/historical', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch historical data');
      return response.json();
    },
  });

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: "example-vm",
        type: "Virtual Machine",
        resourceGroup: "production-rg",
        location: "East US",
        subscriptions: "prod-subscription",
        status: "active",
        remarks: "Production server - Example: test@email.com, 10.0.0.1"
      },
      {
        name: "example-storage",
        type: "Storage Account",
        resourceGroup: "production-rg",
        location: "West US",
        subscriptions: "prod-subscription",
        status: "active",
        remarks: "Storage for backups: data.backup@company.com"
      }
    ];

    const headers = ['name', 'type', 'resourceGroup', 'location', 'subscriptions', 'status', 'remarks'];
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape values containing commas, quotes, or special characters
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "azure_inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template Downloaded",
      description: "Azure inventory import template has been downloaded successfully."
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setColumnFilters({
      name: '',
      type: '',
      resourceGroup: '',
      location: '',
      subscriptions: '',
      status: '',
      remarks: ''
    });
    toast({
      title: "Filters Cleared",
      description: "All search and column filters have been cleared."
    });
  };

  const handleExportCSV = () => {
    if (resources.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no Azure resources to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = ['name', 'type', 'resourceGroup', 'location', 'subscriptions', 'status', 'remarks'];
    const csvContent = [
      headers.join(','),
      ...resources.map(resource => 
        headers.map(header => {
          const value = resource[header] || '';
          // Escape values containing commas, quotes, or special characters
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `azure_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        // Robust CSV parsing to handle quoted fields with commas and escaped quotes
        const parseCsvLine = (line: string): string[] => {
          const values: string[] = [];
          let currentVal = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && i + 1 < line.length && line[i + 1] === '"') { // Escaped quote ""
              currentVal += '"';
              i++; // Skip the next quote
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentVal);
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal); // Add the last value
          return values;
        };

        const headers = parseCsvLine(lines[0]).map(h => h.trim());
        const expectedHeaders = ['name', 'type', 'resourceGroup', 'location', 'subscriptions', 'status', 'remarks'];

        // Validate headers
        if (headers.length !== expectedHeaders.length || !expectedHeaders.every(h => headers.includes(h))) {
          throw new Error("CSV headers do not match expected format. Expected: " + expectedHeaders.join(', '));
        }

        const resources = lines.slice(1).map(line => {
          const values = parseCsvLine(line);
          const resource: any = {};
          headers.forEach((header, index) => {
            resource[header] = values[index] === undefined ? '' : values[index]; // Handle missing values
          });
          return resource;
        });

        const response = await fetch('/api/azure-inventory/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ resources })
        });

        const result = await response.json();

        queryClient.invalidateQueries({ queryKey: ['/api/azure-inventory'] });
        queryClient.invalidateQueries({ queryKey: ['/api/azure-inventory/historical'] });
        setIsImportDialogOpen(false);

        toast({
          title: "Import completed",
          description: `${result.successful} resources processed (${result.updated || 0} updated). ${result.deleted || 0} marked as deleted. ${result.failed} failed.`,
        });
      } catch (error) {
        console.error("Import error:", error);
        toast({
          title: "Import failed",
          description: error.message || "An unknown error occurred during import.",
          variant: "destructive"
        });
      }
    };
    reader.onerror = (error) => {
      console.error("File reading error:", error);
      toast({
        title: "File read error",
        description: "Could not read the uploaded file.",
        variant: "destructive"
      });
    };
    reader.readAsText(file);
  };

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['/api/azure-inventory'],
    queryFn: async () => {
      const response = await fetch('/api/azure-inventory', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch Azure inventory');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/azure-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorDetail = await response.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(errorDetail.message || 'Failed to create resource');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsDialogOpen(false);
      setEditingResource(null);
      queryClient.invalidateQueries({ queryKey: ['/api/azure-inventory'] });

      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'created',
          itemType: 'Azure Resource',
          itemName: data.name || 'New Resource',
          details: `Azure resource created: ${data.name}, Type: ${data.type}, Resource Group: ${data.resourceGroup}, Location: ${data.location}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));

      toast({ title: "Resource added", description: "Azure resource has been added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/azure-inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Failed to update resource';
        try {
          const errorDetail = JSON.parse(text);
          errorMessage = errorDetail.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsDialogOpen(false);
      setEditingResource(null);
      queryClient.invalidateQueries({ queryKey: ['/api/azure-inventory'] });

      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'updated',
          itemType: 'Azure Resource',
          itemName: data.name || 'Resource',
          details: `Azure resource updated: ${data.name}, Status: ${data.status}, Type: ${data.type}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));

      toast({ title: "Resource updated", description: "Azure resource has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/azure-inventory/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorDetail = await response.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(errorDetail.message || 'Failed to delete resource');
      }
      return response.status === 204 ? { success: true } : response.json();
    },
    onSuccess: () => {
      setResourceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/azure-inventory'] });
      toast({ title: "Resource deleted", description: "Azure resource has been deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleResourceSubmit = (data: any) => {
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-3 w-3" />;
    return <ArrowUpDown className="h-3 w-3" />;
  };

  const uniqueStatuses = [...new Set(resources.map(r => r.status).filter(Boolean))].sort();
  const uniqueTypes = [...new Set(resources.map(r => r.type).filter(Boolean))].sort();

  const allFilteredResources = resources
    .filter((resource) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        resource?.name?.toLowerCase().includes(search) ||
        resource?.type?.toLowerCase().includes(search) ||
        resource?.resourceGroup?.toLowerCase().includes(search) ||
        resource?.location?.toLowerCase().includes(search) ||
        resource?.subscriptions?.toLowerCase().includes(search)
      );

      const matchesFilters = (
        (resource?.name || '').toLowerCase().includes(columnFilters.name.toLowerCase()) &&
        (columnFilters.type === '' || resource?.type === columnFilters.type) &&
        (resource?.resourceGroup || '').toLowerCase().includes(columnFilters.resourceGroup.toLowerCase()) &&
        (resource?.location || '').toLowerCase().includes(columnFilters.location.toLowerCase()) &&
        (resource?.subscriptions || '').toLowerCase().includes(columnFilters.subscriptions.toLowerCase()) &&
        (columnFilters.status === '' || resource?.status === columnFilters.status) &&
        (resource?.remarks || '').toLowerCase().includes(columnFilters.remarks.toLowerCase())
      );

      return matchesSearch && matchesFilters;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(allFilteredResources.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filteredResources = allFilteredResources.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-600",
      stopped: "bg-yellow-600",
      deallocated: "bg-orange-600",
      deleted: "bg-red-600",
    };
    return <Badge className={statusColors[status] || "bg-gray-600"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Azure Inventory</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage Azure cloud resources - Current Month: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setEditingResource(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center max-w-2xl">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, type, resource group, location, or subscription..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={handleClearFilters}
          disabled={!searchTerm && !Object.values(columnFilters).some(v => v !== '')}
        >
          Clear Filters
        </Button>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Inventory</TabsTrigger>
          <TabsTrigger value="historical">
            <HistoryIcon className="mr-2 h-4 w-4" />
            Historical Data
          </TabsTrigger>
          <TabsTrigger value="charts">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Azure Resources</CardTitle>
              <CardDescription>Track and manage Azure cloud infrastructure</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Name</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-6 w-6 p-0">
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
                            <span>Type</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('type')} className="h-6 w-6 p-0">
                              {getSortIcon('type')}
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
                                value={columnFilters.type || "all"}
                                onValueChange={(value) => handleFilterChange('type', value === "all" ? "" : value)}
                              >
                                <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  {uniqueTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
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
                            <span>Resource Group</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('resourceGroup')} className="h-6 w-6 p-0">
                              {getSortIcon('resourceGroup')}
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
                                placeholder="Filter resource groups..."
                                value={columnFilters.resourceGroup}
                                onChange={(e) => handleFilterChange('resourceGroup', e.target.value)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Location</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('location')} className="h-6 w-6 p-0">
                              {getSortIcon('location')}
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
                                placeholder="Filter locations..."
                                value={columnFilters.location}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Subscriptions</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('subscriptions')} className="h-6 w-6 p-0">
                              {getSortIcon('subscriptions')}
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
                                placeholder="Filter subscriptions..."
                                value={columnFilters.subscriptions}
                                onChange={(e) => handleFilterChange('subscriptions', e.target.value)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
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
                              <Select
                                value={columnFilters.status || "all"}
                                onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}
                              >
                                <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Statuses</SelectItem>
                                  {uniqueStatuses.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
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
                            <span>Remarks</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('remarks')} className="h-6 w-6 p-0">
                              {getSortIcon('remarks')}
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
                                placeholder="Filter remarks..."
                                value={columnFilters.remarks}
                                onChange={(e) => handleFilterChange('remarks', e.target.value)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading Azure resources...
                        </TableCell>
                      </TableRow>
                    ) : filteredResources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {resources.length === 0 ? 'No Azure resources found' : 'No resources match the current search'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredResources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell className="font-medium truncate">{resource.name || '-'}</TableCell>
                          <TableCell className="truncate">{resource.type || '-'}</TableCell>
                          <TableCell className="truncate">{resource.resourceGroup || '-'}</TableCell>
                          <TableCell className="truncate">{resource.location || '-'}</TableCell>
                          <TableCell className="truncate">{resource.subscriptions || '-'}</TableCell>
                          <TableCell>{getStatusBadge(resource.status)}</TableCell>
                          <TableCell className="truncate">{resource.remarks || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingResource(resource);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResourceToDelete(resource)}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
          {allFilteredResources.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-6 pb-4 gap-4">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(endIndex, allFilteredResources.length)} of {allFilteredResources.length} resources
              </div>
              <div className="flex items-center gap-4">
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-sm px-4">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical">
          <Card>
            <CardHeader>
              <CardTitle>Historical Data</CardTitle>
              <CardDescription>Track monthly changes, deletions, and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {[...new Set(historicalData.map(d => d.monthYear))].sort().reverse().map(month => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedChangeType} onValueChange={setSelectedChangeType}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by change type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Changes</SelectItem>
                      <SelectItem value="imported">Imported</SelectItem>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const filtered = historicalData.filter(d => 
                        (selectedMonth === 'all' || d.monthYear === selectedMonth) &&
                        (selectedChangeType === 'all' || d.changeType === selectedChangeType)
                      );

                      if (filtered.length === 0) {
                        toast({
                          title: "No data to export",
                          description: "No historical data matches the current filters.",
                          variant: "destructive"
                        });
                        return;
                      }

                      const headers = ['Month', 'Change Type', 'Name', 'Type', 'Resource Group', 'Location', 'Subscriptions', 'Status', 'Remarks', 'Date'];
                      const csvContent = [
                        headers.join(','),
                        ...filtered.map(d => [
                          d.monthYear,
                          d.changeType,
                          d.name,
                          d.type,
                          d.resourceGroup,
                          d.location,
                          d.subscriptions,
                          d.status,
                          d.remarks || '',
                          new Date(d.createdAt).toLocaleDateString()
                        ].map(v => {
                           const value = v === null || v === undefined ? '' : String(v);
                           // Escape values containing commas, quotes, or special characters
                           if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                             return `"${value.replace(/"/g, '""')}"`;
                           }
                           return value;
                         }).join(','))
                      ].join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `azure_historical_${selectedMonth}_${selectedChangeType}_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Export Filtered Data
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Change Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Resource Group</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Subscriptions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filtered = historicalData.filter(d => 
                          (selectedMonth === 'all' || d.monthYear === selectedMonth) &&
                          (selectedChangeType === 'all' || d.changeType === selectedChangeType)
                        );
                        const histStartIndex = (currentPage - 1) * pageSize;
                        const histEndIndex = histStartIndex + pageSize;
                        const paginatedHistorical = filtered.slice(histStartIndex, histEndIndex);

                        return paginatedHistorical.length > 0 ? (
                          paginatedHistorical.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.monthYear}</TableCell>
                              <TableCell>
                                <Badge className={
                                  record.changeType === 'deleted' ? 'bg-red-600' :
                                  record.changeType === 'updated' ? 'bg-blue-600' :
                                  'bg-green-600'
                                }>
                                  {record.changeType}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{record.name}</TableCell>
                              <TableCell>{record.type}</TableCell>
                              <TableCell>{record.resourceGroup}</TableCell>
                              <TableCell>{record.location}</TableCell>
                              <TableCell>{record.subscriptions}</TableCell>
                              <TableCell>
                                <Badge className={
                                  record.status === 'active' ? 'bg-green-600' :
                                  record.status === 'stopped' ? 'bg-yellow-600' :
                                  record.status === 'deallocated' ? 'bg-orange-600' :
                                  'bg-red-600'
                                }>
                                  {record.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{record.remarks || '-'}</TableCell>
                              <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                              No historical data found for selected filters
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
                {(() => {
                  const filtered = historicalData.filter(d => 
                    (selectedMonth === 'all' || d.monthYear === selectedMonth) &&
                    (selectedChangeType === 'all' || d.changeType === selectedChangeType)
                  );
                  const histTotalPages = Math.ceil(filtered.length / pageSize);
                  const histStartIndex = (currentPage - 1) * pageSize;
                  const histEndIndex = histStartIndex + pageSize;

                  return filtered.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                      <div className="text-sm text-gray-500">
                        Showing {histStartIndex + 1} to {Math.min(histEndIndex, filtered.length)} of {filtered.length} records
                      </div>
                      <div className="flex items-center gap-4">
                        <Select value={pageSize.toString()} onValueChange={(value) => {
                          setPageSize(parseInt(value));
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Page size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 per page</SelectItem>
                            <SelectItem value="25">25 per page</SelectItem>
                            <SelectItem value="50">50 per page</SelectItem>
                            <SelectItem value="100">100 per page</SelectItem>
                          </SelectContent>
                        </Select>
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                              </Button>
                            </PaginationItem>
                            <PaginationItem>
                              <span className="text-sm px-4">
                                Page {currentPage} of {histTotalPages}
                              </span>
                            </PaginationItem>
                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(histTotalPages, prev + 1))}
                                disabled={currentPage === histTotalPages}
                              >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Changes Overview</CardTitle>
                <CardDescription>Track resource changes by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {(() => {
                    const monthlyData = historicalData.reduce((acc, record) => {
                      const month = record.monthYear;
                      if (!acc[month]) {
                        acc[month] = { month, imported: 0, updated: 0, deleted: 0 };
                      }
                      if (record.changeType === 'imported') acc[month].imported++;
                      if (record.changeType === 'updated') acc[month].updated++;
                      if (record.changeType === 'deleted') acc[month].deleted++;
                      return acc;
                    }, {} as Record<string, { month: string; imported: number; updated: number; deleted: number }>);

                    const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

                    return chartData.length > 0 ? (
                      <div className="w-full h-full">
                        <div className="flex flex-wrap gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-600 rounded"></div>
                            <span className="text-sm">Imported</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-600 rounded"></div>
                            <span className="text-sm">Updated</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-600 rounded"></div>
                            <span className="text-sm">Deleted</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Month</th>
                                <th className="text-center p-2">Imported</th>
                                <th className="text-center p-2">Updated</th>
                                <th className="text-center p-2">Deleted</th>
                                <th className="text-center p-2">Total Changes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chartData.map((data) => (
                                <tr key={data.month} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-medium">{data.month}</td>
                                  <td className="text-center p-2">
                                    <Badge className="bg-green-600">{data.imported}</Badge>
                                  </td>
                                  <td className="text-center p-2">
                                    <Badge className="bg-blue-600">{data.updated}</Badge>
                                  </td>
                                  <td className="text-center p-2">
                                    <Badge className="bg-red-600">{data.deleted}</Badge>
                                  </td>
                                  <td className="text-center p-2">
                                    <Badge variant="outline">{data.imported + data.updated + data.deleted}</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No historical data available for visualization
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resource per Type</CardTitle>
                  <CardDescription>Distribution by resource type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(() => {
                      const typeCounts = resources.reduce((acc, resource) => {
                        const type = resource.type || 'Unknown';
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const sortedTypes = Object.entries(typeCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10);

                      const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

                      return sortedTypes.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto max-h-[280px]">
                          {sortedTypes.map(([type, count]) => {
                            const percentage = ((count / total) * 100).toFixed(1);
                            return (
                              <div key={type} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-[150px]" title={type}>{type}</span>
                                  <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-purple-600"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No data available
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource per Group</CardTitle>
                  <CardDescription>Distribution by resource group</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(() => {
                      const groupCounts = resources.reduce((acc, resource) => {
                        const group = resource.resourceGroup || 'Unknown';
                        acc[group] = (acc[group] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const sortedGroups = Object.entries(groupCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10);

                      const total = Object.values(groupCounts).reduce((sum, count) => sum + count, 0);

                      return sortedGroups.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto max-h-[280px]">
                          {sortedGroups.map(([group, count]) => {
                            const percentage = ((count / total) * 100).toFixed(1);
                            return (
                              <div key={group} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-[150px]" title={group}>{group}</span>
                                  <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-blue-600"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No data available
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource per Subscription</CardTitle>
                  <CardDescription>Distribution by subscription</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(() => {
                      const subscriptionCounts = resources.reduce((acc, resource) => {
                        const subscription = resource.subscriptions || 'Unknown';
                        acc[subscription] = (acc[subscription] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const sortedSubscriptions = Object.entries(subscriptionCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10);

                      const total = Object.values(subscriptionCounts).reduce((sum, count) => sum + count, 0);

                      return sortedSubscriptions.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto max-h-[280px]">
                          {sortedSubscriptions.map(([subscription, count]) => {
                            const percentage = ((count / total) * 100).toFixed(1);
                            return (
                              <div key={subscription} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-[150px]" title={subscription}>{subscription}</span>
                                  <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-teal-600"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No data available
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Type Distribution</CardTitle>
                  <CardDescription>Breakdown of all changes by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(() => {
                      const changeTypeCounts = historicalData.reduce((acc, record) => {
                        acc[record.changeType] = (acc[record.changeType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const total = Object.values(changeTypeCounts).reduce((sum, count) => sum + count, 0);

                      return total > 0 ? (
                        <div className="space-y-4">
                          {Object.entries(changeTypeCounts).map(([type, count]) => {
                            const percentage = ((count / total) * 100).toFixed(1);
                            const color = type === 'deleted' ? 'bg-red-600' : type === 'updated' ? 'bg-blue-600' : 'bg-green-600';
                            return (
                              <div key={type} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium capitalize">{type}</span>
                                  <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${color}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No data available
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Status Distribution</CardTitle>
                  <CardDescription>Current status of all resources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(() => {
                      const statusCounts = resources.reduce((acc, resource) => {
                        acc[resource.status] = (acc[resource.status] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

                      return total > 0 ? (
                        <div className="space-y-4">
                          {Object.entries(statusCounts).map(([status, count]) => {
                            const percentage = ((count / total) * 100).toFixed(1);
                            const color = status === 'active' ? 'bg-green-600' : status === 'stopped' ? 'bg-yellow-600' : status === 'deallocated' ? 'bg-orange-600' : 'bg-red-600';
                            return (
                              <div key={status} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium capitalize">{status}</span>
                                  <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${color}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No data available
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>


          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingResource(null);
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
            <DialogDescription>
              {editingResource ? 'Update the Azure resource details' : 'Enter the details for the Azure resource'}
            </DialogDescription>
          </DialogHeader>
          <AzureInventoryForm 
            onSubmit={handleResourceSubmit} 
            isLoading={createMutation.isPending || updateMutation.isPending}
            defaultValues={editingResource}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Azure Resources</DialogTitle>
            <DialogDescription>Upload a CSV file with Azure resource data</DialogDescription>
          </DialogHeader>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportCSV(file);
            }}
          />
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={!!resourceToDelete}
        onClose={() => setResourceToDelete(null)}
        onConfirm={() => resourceToDelete && deleteMutation.mutate(resourceToDelete.id)}
        itemType="Azure resource"
        itemName={resourceToDelete ? resourceToDelete.name : ""}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}