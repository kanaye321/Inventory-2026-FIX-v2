import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Download, Upload, ChevronLeft, ChevronRight, FileDown, FileText, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


export default function CustomPage({ pageData }: { pageData?: any }) {
  const params = useParams();
  const slug = params.slug || pageData?.pageSlug;
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: pageConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: [`/api/page-builder/pages/${slug}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/page-builder/pages`);
      const pages = await response.json();
      const page = pages.find((p: any) => p.pageSlug === slug || p.page_slug === slug);

      if (!page) {
        throw new Error(`Page with slug "${slug}" not found`);
      }

      // Normalize the response to use camelCase consistently
      return {
        ...page,
        pageSlug: page.pageSlug || page.page_slug,
        pageName: page.pageName || page.page_name,
        tableName: page.tableName || page.table_name,
        importExportEnabled: page.importExportEnabled ?? page.import_export_enabled ?? true
      };
    },
    retry: 1,
  });

  const { data: tableData, isLoading } = useQuery({
    queryKey: [`/api/page-builder/pages/${slug}/data`, page, pageSize, sortField, sortDirection, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField,
        sortDirection,
        filters: JSON.stringify(filters),
      });
      const response = await apiRequest("GET", `/api/page-builder/pages/${slug}/data?${params}`);
      return response.json();
    },
    enabled: !!pageConfig,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/page-builder/pages/${slug}/data`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/page-builder/pages/${slug}/data`] });
      toast({ title: "Record created successfully" });
      setIsFormOpen(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/page-builder/pages/${slug}/data/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/page-builder/pages/${slug}/data`] });
      toast({ title: "Record updated successfully" });
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/page-builder/pages/${slug}/data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/page-builder/pages/${slug}/data`] });
      toast({ title: "Record deleted successfully" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      // Read and parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        return record;
      });

      const response = await apiRequest("POST", `/api/page-builder/pages/${slug}/records/import`, { records });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/page-builder/pages/${slug}/data`] });
      toast({ 
        title: "Import complete", 
        description: `${data.imported} records imported successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}` 
      });
      setIsImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Import failed", 
        description: error.message || "An error occurred during import",
        variant: "destructive" 
      });
    },
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSubmit = () => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const exportToCSV = () => {
    if (!tableData?.data || !pageConfig) return;

    const headers = pageConfig.columns.map((col: any) => col.label).join(",");
    const rows = tableData.data.map((row: any) =>
      pageConfig.columns.map((col: any) => row[col.name] || "").join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pageConfig.pageName}.csv`;
    a.click();
  };

  const downloadTemplate = () => {
    if (!pageConfig) return;

    const headers = pageConfig.columns.map((col: any) => col.label).join(",");
    const blob = new Blob([headers], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pageConfig.pageName}_template.csv`;
    a.click();
  };

  const handleImportCSV = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    }
  };

  if (isConfigLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading page configuration...</p>
        </div>
      </div>
    );
  }

  if (!pageConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Page Not Found</h3>
          <p className="text-muted-foreground">The custom page "{slug}" could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={pageConfig.pageName} description={pageConfig.description}>
        <div className="flex gap-2">
          {pageConfig.importExportEnabled && (
            <>
              <Button onClick={downloadTemplate} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </>
          )}
          <Button onClick={() => {
            setEditingRecord(null);
            setFormData({});
            setIsFormOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </PageHeader>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Records from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import records. Download the template first to see the required format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>1. Download the template above</p>
              <p>2. Fill in your data following the column format</p>
              <p>3. Upload the completed CSV file below</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            {importFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {importFile.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportFile(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={!importFile || importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Record" : "Add Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pageConfig.columns.map((col: any) => (
              <div key={col.name}>
                <label className="text-sm font-medium">{col.label}</label>
                <Input
                  type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                  value={formData[col.name] || ""}
                  onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                  required={col.required}
                />
              </div>
            ))}
            <Button onClick={handleSubmit} className="w-full">
              {editingRecord ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            {pageConfig.columns.map((col: any) => {
              const uniqueValues = col.filterable ? Array.from(
                new Set(
                  tableData?.data
                    ?.map((row: any) => row[col.name])
                    .filter((val: any) => val !== null && val !== undefined && val !== "")
                )
              ).sort() : [];

              return (
                <TableHead key={col.name}>
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => col.sortable && handleSort(col.name)}
                      className={col.sortable ? "cursor-pointer hover:text-primary" : ""}
                    >
                      {col.label}
                    </span>
                    {sortField === col.name && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                    {col.filterable && uniqueValues.length > 0 && (
                      <Select
                        value={filters[col.name] || "all"}
                        onValueChange={(value) => {
                          setFilters({ ...filters, [col.name]: value === "all" ? "" : value });
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-auto h-6 px-2 border-0 shadow-none hover:bg-accent">
                          <ChevronDown className="h-3 w-3" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All {col.label}</SelectItem>
                          {uniqueValues.map((value: any) => (
                            <SelectItem key={value} value={String(value)}>
                              {String(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableHead>
              );
            })}
            <TableHead>
              <div className="flex items-center gap-2">
                <span>Actions</span>
                {pageConfig?.columns?.filter((col: any) => col.filterable).length > 0 && 
                 Object.keys(filters).some(key => filters[key]) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilters({});
                      setPage(1);
                    }}
                    className="h-6 px-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData?.data.map((record: any) => (
            <TableRow key={record.id}>
              {pageConfig.columns.map((col: any) => (
                <TableCell key={col.name}>{record[col.name]}</TableCell>
              ))}
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRecord(record);
                      setFormData(record);
                      setIsFormOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(record.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {tableData?.pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= (tableData?.pagination.totalPages || 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}