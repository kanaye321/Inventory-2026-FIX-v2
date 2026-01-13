import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Settings, FileText, Table, Columns, Filter, Download, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type PageColumn = {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "email" | "url" | "json";
  label: string;
  required: boolean;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  defaultValue?: string;
};

export default function PageBuilder() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [columns, setColumns] = useState<PageColumn[]>([]);
  const [pageName, setPageName] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [tableName, setTableName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("FileText");
  const [importExportEnabled, setImportExportEnabled] = useState(true);

  const { data: customPages, isLoading } = useQuery({
    queryKey: ["/api/page-builder/pages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/page-builder/pages");
      return response.json();
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/page-builder/pages", data);
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error("Server returned non-JSON response: " + text.substring(0, 100));
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create page");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({
        title: "Page created",
        description: "Custom page has been created successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Page creation error:", error);
      toast({
        title: "Error creating page",
        description: error.message || "Failed to create page. Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/page-builder/pages/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({
        title: "Page updated",
        description: "Custom page and database columns have been updated successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update page.",
        variant: "destructive",
      });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/page-builder/pages/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({
        title: "Page deleted",
        description: "Custom page has been deleted successfully.",
      });
    },
  });

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: "",
        type: "text",
        label: "",
        required: false,
        searchable: true,
        sortable: true,
        filterable: true,
        defaultValue: "",
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof PageColumn, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };

    // If updating the name field, auto-format it
    if (field === 'name' && typeof value === 'string') {
      newColumns[index].name = value.toLowerCase().replace(/\s+/g, "_");
    }

    setColumns(newColumns);
  };

  const resetForm = () => {
    setEditingPage(null);
    setPageName("");
    setPageSlug("");
    setTableName("");
    setDescription("");
    setIcon("FileText");
    setColumns([]);
    setImportExportEnabled(true);
  };

  const handleSubmit = () => {
    // Validation
    if (!pageName || !pageSlug || (!editingPage && !tableName) || columns.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and add at least one column.",
        variant: "destructive",
      });
      return;
    }

    // Validate columns
    for (const col of columns) {
      if (!col.name || !col.label || !col.type) {
        toast({
          title: "Validation Error",
          description: "All columns must have a name, label, and type.",
          variant: "destructive",
        });
        return;
      }
    }

    const pageData = {
      pageName: pageName.trim(),
      pageSlug: pageSlug.trim(),
      tableName: editingPage ? editingPage.tableName : tableName.trim(),
      description: description?.trim() || '',
      icon: icon || 'FileText',
      columns: columns,
      filters: [],
      sortConfig: { field: "id", direction: "asc" },
      paginationConfig: { pageSize: 10, enabled: true },
      importExportEnabled: importExportEnabled !== false,
    };

    if (editingPage) {
      updatePageMutation.mutate({ id: editingPage.id, data: pageData });
    } else {
      createPageMutation.mutate(pageData);
    }
  };

  const handleEditPage = (page: any) => {
    console.log('Editing page:', page);
    setEditingPage(page);

    // Handle both camelCase and snake_case field names
    const pageName = page.pageName || page.page_name || "";
    const pageSlug = page.pageSlug || page.page_slug || "";
    const tableName = page.tableName || page.table_name || "";
    const description = page.description || "";
    const icon = page.icon || "FileText";
    const importExport = page.importExportEnabled ?? page.import_export_enabled ?? true;

    // Parse columns if they're stored as string
    let columnsData = page.columns || [];
    if (typeof columnsData === 'string') {
      try {
        columnsData = JSON.parse(columnsData);
      } catch (e) {
        console.error('Error parsing columns:', e);
        columnsData = [];
      }
    }

    console.log('Setting form values:', {
      pageName,
      pageSlug,
      tableName,
      description,
      icon,
      importExport,
      columns: columnsData
    });

    setPageName(pageName);
    setPageSlug(pageSlug);
    setTableName(tableName);
    setDescription(description);
    setIcon(icon);
    setImportExportEnabled(importExport);
    setColumns(columnsData);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Page Builder" description="Create and manage custom pages with dynamic columns and features">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit Custom Page" : "Create Custom Page"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Name</Label>
                  <Input value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="My Custom Page" />
                </div>
                <div className="space-y-2">
                  <Label>Page Slug (URL)</Label>
                  <Input
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    placeholder="my-custom-page"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Table Name (Database)</Label>
                  <Input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    placeholder="my_custom_table"
                    disabled={!!editingPage}
                  />
                  {editingPage && (
                    <p className="text-xs text-muted-foreground">Table name cannot be changed after creation</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FileText">FileText</SelectItem>
                      <SelectItem value="Table">Table</SelectItem>
                      <SelectItem value="Database">Database</SelectItem>
                      <SelectItem value="Folder">Folder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Page description" />
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={importExportEnabled} onCheckedChange={setImportExportEnabled} />
                <Label>Enable Import/Export</Label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Columns</Label>
                  <Button onClick={addColumn} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column
                  </Button>
                </div>

                {columns.map((column, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Column Name (Database)</Label>
                          <Input
                            value={column.name}
                            onChange={(e) => updateColumn(index, "name", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                            placeholder="column_name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Display Label</Label>
                          <Input value={column.label} onChange={(e) => updateColumn(index, "label", e.target.value)} placeholder="Column Label" />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={column.type} onValueChange={(v) => updateColumn(index, "type", v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="json">JSON</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Default Value</Label>
                          <Input value={column.defaultValue} onChange={(e) => updateColumn(index, "defaultValue", e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-4 col-span-2">
                          <div className="flex items-center space-x-2">
                            <Switch checked={column.required} onCheckedChange={(v) => updateColumn(index, "required", v)} />
                            <Label>Required</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch checked={column.searchable} onCheckedChange={(v) => updateColumn(index, "searchable", v)} />
                            <Label>Searchable</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch checked={column.sortable} onCheckedChange={(v) => updateColumn(index, "sortable", v)} />
                            <Label>Sortable</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch checked={column.filterable} onCheckedChange={(v) => updateColumn(index, "filterable", v)} />
                            <Label>Filterable</Label>
                          </div>
                          <Button onClick={() => removeColumn(index)} variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createPageMutation.isPending || updatePageMutation.isPending}>
                  {editingPage ? "Update Page" : "Create Page"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4">
        {customPages?.map((page: any) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {page.pageName}
                  </CardTitle>
                  <CardDescription>{page.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/custom/${page.pageSlug || page.page_slug}`}>View Page</a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditPage(page)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deletePageMutation.mutate(page.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Table className="h-4 w-4" />
                  <span>Table: {page.tableName || page.table_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Columns className="h-4 w-4" />
                  <span>Columns: {Array.isArray(page.columns) ? page.columns.length : (typeof page.columns === 'string' ? JSON.parse(page.columns).length : 0)}</span>
                </div>
                {(page.importExportEnabled ?? page.import_export_enabled) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4" />
                    <span>Import/Export: Enabled</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}