
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, FileText, Download, Upload, ArrowUpDown, ArrowUp, ArrowDown, Filter as FilterIcon, X, Mail } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ApprovalMonitoring = {
  id: number;
  type: string | null;
  platform: string | null;
  pic: string | null;
  ipAddress: string | null;
  hostnameAccounts: string | null;
  identifierSerialNumber: string | null;
  approvalNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

// Function to calculate status based on dates
const calculateStatus = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) return 'Active';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (today >= start && today <= end) {
    return 'Active';
  } else if (today > end) {
    return 'Expired';
  } else {
    return 'Active';
  }
};

type SortConfig = {
  field: keyof ApprovalMonitoring;
  direction: 'asc' | 'desc';
};

export default function ApprovalMonitoring() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApprovalMonitoring | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ApprovalMonitoring | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'id', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState({
    type: '',
    platform: '',
    pic: '',
    ipAddress: '',
    hostnameAccounts: '',
    identifierSerialNumber: '',
    approvalNumber: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({
    type: "",
    platform: "",
    pic: "",
    ipAddress: "",
    hostnameAccounts: "",
    identifierSerialNumber: "",
    approvalNumber: "",
    startDate: "",
    endDate: "",
    remarks: "",
  });

  const { data: rawRecords = [], isLoading } = useQuery({
    queryKey: ["/api/approval-monitoring"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/approval-monitoring");
      return response.json();
    },
  });

  // Process records with calculated status
  const records = rawRecords.map((record: ApprovalMonitoring) => ({
    ...record,
    status: calculateStatus(record.startDate, record.endDate)
  }));

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/approval-monitoring", data);
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned an invalid response. Please check your network connection and try again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create record' }));
        throw new Error(errorData.message || 'Failed to create record');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approval-monitoring"] });
      toast({ title: "Success", description: "Approval monitoring record created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Create mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create record",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/approval-monitoring/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approval-monitoring"] });
      toast({ title: "Success", description: "Approval monitoring record updated successfully" });
      setIsDialogOpen(false);
      setEditingRecord(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update record",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/approval-monitoring/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approval-monitoring"] });
      toast({ title: "Success", description: "Approval monitoring record deleted successfully" });
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete record",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        const text = await file.text();
        
        // Check if file starts with HTML DOCTYPE (common error)
        if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
          throw new Error('Invalid file format: HTML file detected instead of CSV. Please upload a valid CSV file.');
        }
        
        // Check if it's JSON (another common mistake)
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          throw new Error('Invalid file format: JSON file detected instead of CSV. Please upload a valid CSV file.');
        }
        
        // Enhanced CSV parser that handles quoted fields and special characters
        const parseCSVLine = (csvContent: string): string[][] => {
          const result: string[][] = [];
          const lines = csvContent.split('\n');
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
              if (currentRow.some(field => field.length > 0)) {
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
        
        const rows = parseCSVLine(text);
        
        if (rows.length === 0) {
          throw new Error('CSV file is empty');
        }
        
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        if (headers.length === 0) {
          throw new Error('CSV file has no columns');
        }
        
        const records = rows.slice(1).map(row => {
          const record: any = {};
          headers.forEach((header, index) => {
            let value = row[index] || '';
            // Clean up the value - remove only leading/trailing quotes, preserve content
            value = value.trim();
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            }
            // Replace empty values with null instead of "-"
            record[header] = value || null;
          });
          return record;
        });

        const response = await apiRequest("POST", "/api/approval-monitoring/import", { records });
        const data = await response.json();
        
        // Check if response is actually HTML error
        if (typeof data === 'string' && data.toLowerCase().includes('<!doctype')) {
          throw new Error('Server returned an error page. Please check your network connection and try again.');
        }
        
        return data;
      } catch (error: any) {
        if (error.message.includes('Unexpected token')) {
          throw new Error('Invalid CSV format. Please ensure you are uploading a valid CSV file, not HTML or JSON.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/approval-monitoring"] });
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.count || 0} records successfully` 
      });
      setIsImportDialogOpen(false);
      setCsvFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import records",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "",
      platform: "",
      pic: "",
      ipAddress: "",
      hostnameAccounts: "",
      identifierSerialNumber: "",
      approvalNumber: "",
      startDate: "",
      endDate: "",
      remarks: "",
    });
  };

  const handleSubmit = () => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (record: ApprovalMonitoring) => {
    setEditingRecord(record);
    setFormData({
      type: record.type || "",
      platform: record.platform || "",
      pic: record.pic || "",
      ipAddress: record.ipAddress || "",
      hostnameAccounts: record.hostnameAccounts || "",
      identifierSerialNumber: record.identifierSerialNumber || "",
      approvalNumber: record.approvalNumber || "",
      startDate: record.startDate || "",
      endDate: record.endDate || "",
      remarks: record.remarks || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (record: ApprovalMonitoring) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      deleteMutation.mutate(recordToDelete.id);
    }
  };

  const handleSort = (field: keyof ApprovalMonitoring) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExport = () => {
    const headers = ['type', 'platform', 'pic', 'ipAddress', 'hostnameAccounts', 'identifierSerialNumber', 'approvalNumber', 'startDate', 'endDate', 'remarks'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedRecords.map(record => 
        headers.map(header => `"${record[header as keyof ApprovalMonitoring] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approval-monitoring-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export Successful", description: "Records exported to CSV" });
  };

  const handleDownloadTemplate = () => {
    const headers = ['type', 'platform', 'pic', 'ipAddress', 'hostnameAccounts', 'identifierSerialNumber', 'approvalNumber', 'startDate', 'endDate', 'remarks'];
    const csvContent = headers.join(',') + '\n' + 
      '"Server","AWS","John Doe","192.168.1.1","server-01","SN123456","APR-2025-001","2025-01-01","2025-12-31","Sample entry"';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'approval-monitoring-template.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Template Downloaded", description: "CSV template downloaded successfully" });
  };

  const handleImport = () => {
    if (csvFile) {
      // Validate file type
      if (!csvFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file (.csv)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (csvFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      importMutation.mutate(csvFile);
    }
  };

  const clearFilters = () => {
    handleFilterChange({
      type: '',
      platform: '',
      pic: '',
      approvalNumber: '',
      status: '',
      search: ''
    });
  };

  // Filter and sort records
  const filteredAndSortedRecords = records
    .filter((record: ApprovalMonitoring) => {
      if (columnFilters.type && !record.type?.toLowerCase().includes(columnFilters.type.toLowerCase())) return false;
      if (columnFilters.platform && !record.platform?.toLowerCase().includes(columnFilters.platform.toLowerCase())) return false;
      if (columnFilters.pic && !record.pic?.toLowerCase().includes(columnFilters.pic.toLowerCase())) return false;
      if (columnFilters.ipAddress && !record.ipAddress?.toLowerCase().includes(columnFilters.ipAddress.toLowerCase())) return false;
      if (columnFilters.hostnameAccounts && !record.hostnameAccounts?.toLowerCase().includes(columnFilters.hostnameAccounts.toLowerCase())) return false;
      if (columnFilters.identifierSerialNumber && !record.identifierSerialNumber?.toLowerCase().includes(columnFilters.identifierSerialNumber.toLowerCase())) return false;
      if (columnFilters.approvalNumber && !record.approvalNumber?.toLowerCase().includes(columnFilters.approvalNumber.toLowerCase())) return false;
      if (columnFilters.status && record.status !== columnFilters.status) return false;
      return true;
    })
    .sort((a: ApprovalMonitoring, b: ApprovalMonitoring) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const uniqueStatuses = Array.from(new Set(records.map((r: ApprovalMonitoring) => r.status).filter(Boolean)));

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecords.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredAndSortedRecords.slice(startIndex, endIndex);

  // Handle column filter change
  const handleFilterChange = (field: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({
      type: '',
      platform: '',
      pic: '',
      ipAddress: '',
      hostnameAccounts: '',
      identifierSerialNumber: '',
      approvalNumber: '',
      status: ''
    });
    setCurrentPage(1);
  };

  const getSortIcon = (field: keyof ApprovalMonitoring) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Approval Monitoring</h1>
          <p className="text-sm text-gray-600">Track and manage approval records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearAllFilters}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              try {
                const response = await apiRequest('POST', '/api/check-approval-expirations');
                const data = await response.json();
                toast({
                  title: data.count > 0 ? "Expiring Approvals Found" : "No Expiring Approvals",
                  description: data.message,
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to check approval expirations",
                  variant: "destructive",
                });
              }
            }}
          >
            <Mail className="mr-2 h-4 w-4" />
            Check Expirations
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import approval monitoring records
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csvFile">CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file type and extension
                        if (!file.name.endsWith('.csv')) {
                          toast({
                            title: "Invalid File Type",
                            description: "Please select a CSV file (.csv)",
                            variant: "destructive",
                          });
                          e.target.value = '';
                          return;
                        }
                        
                        // Validate file size (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: "File Too Large",
                            description: "File size must be less than 10MB",
                            variant: "destructive",
                          });
                          e.target.value = '';
                          return;
                        }
                        
                        try {
                          const text = await file.text();
                          
                          // Check for HTML/error responses in file content
                          if (text.trim().toLowerCase().startsWith('<!doctype') || 
                              text.trim().toLowerCase().startsWith('<html') ||
                              text.trim().startsWith('{') ||
                              text.trim().startsWith('[')) {
                            throw new Error('Invalid file format. Please upload a valid CSV file.');
                          }
                          
                          // Validate CSV has content
                          if (!text.trim()) {
                            throw new Error('CSV file is empty');
                          }
                          
                          // Enhanced CSV parser that handles quoted fields properly
                          const parseCSVLine = (line: string): string[] => {
                            const result: string[] = [];
                            let current = '';
                            let inQuotes = false;
                            
                            for (let i = 0; i < line.length; i++) {
                              const char = line[i];
                              const nextChar = line[i + 1];
                              
                              if (char === '"') {
                                if (inQuotes && nextChar === '"') {
                                  current += '"';
                                  i++;
                                } else {
                                  inQuotes = !inQuotes;
                                }
                              } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                              } else {
                                current += char;
                              }
                            }
                            result.push(current.trim());
                            return result;
                          };
                          
                          const lines = text.split('\n').filter(line => line.trim());
                          
                          if (lines.length < 2) {
                            toast({
                              title: "Invalid CSV",
                              description: "CSV file must contain headers and at least one data row",
                              variant: "destructive",
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
                          const records = [];
                          
                          for (let i = 1; i < lines.length; i++) {
                            const values = parseCSVLine(lines[i]);
                            const record: any = {};
                            
                            headers.forEach((header, index) => {
                              let value = (values[index] || '').trim();
                              // Remove surrounding quotes
                              if (value.startsWith('"') && value.endsWith('"')) {
                                value = value.slice(1, -1);
                              }
                              if (value.startsWith("'") && value.endsWith("'")) {
                                value = value.slice(1, -1);
                              }
                              
                              // Map headers to record fields - handle all variations
                              switch (header) {
                                case 'type': record.type = value; break;
                                case 'platform': record.platform = value; break;
                                case 'pic': record.pic = value; break;
                                case 'ip address':
                                case 'ipaddress':
                                case 'ip_address': 
                                  record['ip address'] = value; 
                                  break;
                                case 'hostname/accounts':
                                case 'hostnameaccounts':
                                case 'hostname_accounts':
                                case 'hostname accounts':
                                case 'hostname/account':
                                case 'hostname': 
                                  record['hostname/accounts'] = value; 
                                  break;
                                case 'identifier/serial number':
                                case 'identifierserialnumber':
                                case 'identifier_serial_number':
                                case 'identifier serial number':
                                case 'identifier/serialnumber':
                                case 'identifier':
                                case 'serial number':
                                case 'serialnumber':
                                case 'serial_number':
                                  record['identifier/serial number'] = value; 
                                  break;
                                case 'approval number':
                                case 'approvalnumber':
                                case 'approval_number': 
                                  record['approval number'] = value; 
                                  break;
                                case 'start date':
                                case 'startdate':
                                case 'start_date': 
                                  record['start date'] = value; 
                                  break;
                                case 'end date':
                                case 'enddate':
                                case 'end_date': 
                                  record['end date'] = value; 
                                  break;
                                case 'remarks':
                                case 'notes': 
                                  record.remarks = value; 
                                  break;
                              }
                            });
                            
                            if (record.type || record.platform) {
                              records.push(record);
                            }
                          }
                          
                          if (records.length === 0) {
                            toast({
                              title: "No Valid Data",
                              description: "CSV must contain data rows",
                              variant: "destructive",
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          // Import the records
                          const response = await fetch('/api/approval-monitoring/import', {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({ records })
                          });
                          
                          // Check content type before parsing
                          const contentType = response.headers.get('content-type');
                          if (!contentType || !contentType.includes('application/json')) {
                            const textResponse = await response.text();
                            console.error('Non-JSON response received:', textResponse.substring(0, 200));
                            throw new Error('Server returned an invalid response. Please check your network connection and try again.');
                          }
                          
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: 'Import failed' }));
                            throw new Error(errorData.message || 'Import failed');
                          }
                          
                          const result = await response.json();
                          toast({
                            title: "Import Successful",
                            description: `Imported ${result.successful || records.length} records successfully`,
                          });
                          
                          queryClient.invalidateQueries({ queryKey: ['/api/approval-monitoring'] });
                          setIsImportDialogOpen(false);
                          e.target.value = '';
                          setCsvFile(file);
                        } catch (error) {
                          console.error('Import error:', error);
                          toast({
                            title: "Import Failed",
                            description: "Failed to import CSV file. Please check the format.",
                            variant: "destructive",
                          });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only CSV files are accepted (.csv)
                  </p>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={!csvFile || importMutation.isPending}>
                  {importMutation.isPending ? "Importing..." : "Import"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Edit Record" : "Add New Record"}</DialogTitle>
                <DialogDescription>
                  Fill in the approval monitoring details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input
                      id="platform"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pic">PIC</Label>
                    <Input
                      id="pic"
                      value={formData.pic}
                      onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress">IP Address</Label>
                    <Input
                      id="ipAddress"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostnameAccounts">Hostname/Accounts</Label>
                  <Input
                    id="hostnameAccounts"
                    value={formData.hostnameAccounts}
                    onChange={(e) => setFormData({ ...formData, hostnameAccounts: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifierSerialNumber">Identifier/Serial Number</Label>
                    <Input
                      id="identifierSerialNumber"
                      value={formData.identifierSerialNumber}
                      onChange={(e) => setFormData({ ...formData, identifierSerialNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvalNumber">Approval Number</Label>
                    <Input
                      id="approvalNumber"
                      value={formData.approvalNumber}
                      onChange={(e) => setFormData({ ...formData, approvalNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRecord ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Approval Monitoring Records</CardTitle>
              <CardDescription>View and manage all approval monitoring records</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRecords.length)} of {filteredAndSortedRecords.length} records
              </Badge>
              <Label className="text-sm text-muted-foreground">Rows per page:</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredAndSortedRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Type</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('type')}
                            className="h-6 w-6 p-0"
                          >
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
                            <Input
                              placeholder="Filter types..."
                              value={columnFilters.type}
                              onChange={(e) => handleFilterChange('type', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Platform</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('platform')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('platform')}
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
                              placeholder="Filter platforms..."
                              value={columnFilters.platform}
                              onChange={(e) => handleFilterChange('platform', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>PIC</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('pic')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('pic')}
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
                              placeholder="Filter PIC..."
                              value={columnFilters.pic}
                              onChange={(e) => handleFilterChange('pic', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>IP Address</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('ipAddress')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('ipAddress')}
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
                              placeholder="Filter IP addresses..."
                              value={columnFilters.ipAddress}
                              onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Hostname/Accounts</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('hostnameAccounts')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('hostnameAccounts')}
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
                              placeholder="Filter hostname/accounts..."
                              value={columnFilters.hostnameAccounts}
                              onChange={(e) => handleFilterChange('hostnameAccounts', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Identifier/SN</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('identifierSerialNumber')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('identifierSerialNumber')}
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
                              placeholder="Filter identifiers..."
                              value={columnFilters.identifierSerialNumber}
                              onChange={(e) => handleFilterChange('identifierSerialNumber', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Approval Number</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('approvalNumber')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('approvalNumber')}
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
                              placeholder="Filter approval numbers..."
                              value={columnFilters.approvalNumber}
                              onChange={(e) => handleFilterChange('approvalNumber', e.target.value)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Start Date</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('startDate')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('startDate')}
                          </Button>
                        </div>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>End Date</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('endDate')}
                            className="h-6 w-6 p-0"
                          >
                            {getSortIcon('endDate')}
                          </Button>
                        </div>
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
                            <Select value={columnFilters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">All Status</SelectItem>
                                {uniqueStatuses.map(status => (
                                  <SelectItem key={status} value={status as string}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record: ApprovalMonitoring) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.type || "-"}</TableCell>
                      <TableCell>{record.platform || "-"}</TableCell>
                      <TableCell>{record.pic || "-"}</TableCell>
                      <TableCell>{record.ipAddress || "-"}</TableCell>
                      <TableCell>{record.hostnameAccounts || "-"}</TableCell>
                      <TableCell>{record.identifierSerialNumber || "-"}</TableCell>
                      <TableCell>{record.approvalNumber || "-"}</TableCell>
                      <TableCell>{record.startDate || "-"}</TableCell>
                      <TableCell>{record.endDate || "-"}</TableCell>
                      <TableCell>
                        <Badge className={record.status === 'Active' ? 'bg-green-600' : 'bg-red-600'}>
                          {record.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(record)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Records Found</h3>
              <p className="text-gray-500 mb-4">
                {records.length > 0 ? "No records match your filters. Try adjusting your filters." : "Click the 'Add Record' button above to create your first approval monitoring record."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredAndSortedRecords.length > 0 && totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <span className="px-4">...</span>
                    </PaginationItem>
                  );
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemType="Approval Monitoring Record"
        itemName={recordToDelete?.approvalNumber || ""}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
