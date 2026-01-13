import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { 
  PlusIcon, 
  SearchIcon, 
  MoreHorizontalIcon, 
  EyeIcon, 
  EditIcon, 
  TrashIcon,
  PackageIcon,
  FilterIcon,
  UploadIcon,
  DownloadIcon
} from "lucide-react";
import { format } from "date-fns";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { downloadCSV } from "@/lib/utils";

// Component schema for form validation
const componentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  category: z.string().min(1, "Category is required"),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  specifications: z.string().optional(),
  status: z.enum(["available", "assigned", "defective", "scrap", "returned"]),
  location: z.string().optional(),
  assignedTo: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.coerce.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface Component {
  id: number;
  name: string;
  type: string;
  category: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  specifications?: string;
  status: "available" | "assigned" | "defective" | "scrap" | "returned";
  location?: string;
  assignedTo?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function Components() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [componentToEdit, setComponentToEdit] = useState<Component | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: "",
      type: "",
      category: "General",
      serialNumber: "",
      manufacturer: "",
      model: "",
      specifications: "",
      status: "available",
      location: "",
      assignedTo: "",
      purchaseDate: "",
      purchaseCost: "",
      warrantyExpiry: "",
      notes: ""
    },
  });

  // Fetch components from API
  const { data: components = [], isLoading, error } = useQuery<Component[]>({
    queryKey: ['/api/components'],
    queryFn: async () => {
      const response = await fetch('/api/components', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch components');
      }
      return response.json();
    },
  });

  // Create component mutation
  const createComponentMutation = useMutation({
    mutationFn: async (data: ComponentFormValues) => {
      const response = await fetch('/api/components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create component');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/components'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Component Created",
        description: "The component has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create component",
        variant: "destructive",
      });
    }
  });

  // Update component mutation
  const updateComponentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ComponentFormValues }) => {
      const response = await fetch(`/api/components/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update component');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/components'] });
      setIsEditDialogOpen(false);
      setSelectedComponent(null);
      form.reset();
      toast({
        title: "Component Updated",
        description: "The component has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update component",
        variant: "destructive",
      });
    }
  });

  // Delete component mutation
  const deleteComponentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/components/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete component');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/components'] });
      setIsConfirmDeleteOpen(false);
      setComponentToDelete(null);
      toast({
        title: "Component Deleted",
        description: "The component has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete component",
        variant: "destructive",
      });
    }
  });

  const componentTypes = [
    "CPU",
    "RAM",
    "HDD", 
    "SSD",
    "GPU",
    "Power Supply",
    "Motherboard",
    "Network Card",
    "Sound Card",
    "Fan",
    "Cooling",
    "Cable",
    "Other"
  ];

  const filteredComponents = components.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || component.status === filterStatus;
    const matchesType = filterType === "all" || component.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAdd = () => {
    form.reset();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (component: Component) => {
    setSelectedComponent(component);
    setIsAddDialogOpen(false);
    form.reset({
      name: component.name,
      type: component.type,
      category: component.category,
      serialNumber: component.serialNumber || "",
      manufacturer: component.manufacturer || "",
      model: component.model || "",
      specifications: component.specifications || "",
      status: component.status,
      location: component.location || "",
      assignedTo: component.assignedTo || "",
      purchaseDate: component.purchaseDate || "",
      purchaseCost: component.purchaseCost?.toString() || "",
      warrantyExpiry: component.warrantyExpiry || "",
      notes: component.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (component: Component) => {
    setSelectedComponent(component);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (component: Component) => {
    setComponentToDelete(component);
    setIsConfirmDeleteOpen(true);
  };

  const onSubmit = (data: ComponentFormValues) => {
    console.log('Form submission data:', data);

    // Ensure all fields are properly mapped
    const formattedData = {
      ...data,
      // Convert purchaseCost to number if it's a string
      purchaseCost: data.purchaseCost ? data.purchaseCost.toString() : undefined,
    };

    if (isEditDialogOpen && selectedComponent) {
      console.log('Updating component:', selectedComponent.id, formattedData);
      updateComponentMutation.mutate({ id: selectedComponent.id, data: formattedData });
    } else {
      console.log('Creating new component:', formattedData);
      createComponentMutation.mutate(formattedData);
    }
  };

  const handleExport = () => {
    if (filteredComponents.length === 0) {
      toast({
        title: "Export failed",
        description: "No components to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredComponents.map(component => ({
      Name: component.name,
      Type: component.type,
      Category: component.category,
      Manufacturer: component.manufacturer || '',
      Model: component.model || '',
      SerialNumber: component.serialNumber || '',
      Status: component.status,
      Location: component.location || '',
      AssignedTo: component.assignedTo || '',
      PurchaseDate: component.purchaseDate || '',
      PurchaseCost: component.purchaseCost || '',
      WarrantyExpiry: component.warrantyExpiry || '',
      Specifications: component.specifications || '',
      Notes: component.notes || '',
      CreatedAt: component.createdAt || '',
    }));

    downloadCSV(exportData, 'components-export.csv');
    toast({
      title: "Export successful",
      description: `${filteredComponents.length} components exported to CSV`,
    });
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      Name: "Example Component",
      Type: "CPU",
      Category: "Hardware",
      Manufacturer: "Intel",
      Model: "i7-12700K",
      SerialNumber: "ABC123456789",
      Status: "available",
      Location: "Warehouse A",
      AssignedTo: "",
      PurchaseDate: "2024-01-15",
      PurchaseCost: "350.00",
      WarrantyExpiry: "2027-01-15",
      Specifications: "8-core, 16-thread processor",
      Notes: "Latest generation processor"
    }];

    downloadCSV(templateData, 'components-import-template.csv');
    toast({
      title: "Template Downloaded",
      description: "Component import template has been downloaded successfully."
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      assigned: "secondary", 
      defective: "destructive",
      scrap: "destructive",
      returned: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const uniqueTypes = [...new Set(components.map(c => c.type))];

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading components: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Components</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage hardware components inventory</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleAdd}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Component
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Import Components
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search components by name, manufacturer, model, or serial..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="defective">Defective</SelectItem>
              <SelectItem value="scrap">Scrap</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => {
            setFilterStatus("all");
            setFilterType("all");
            setSearchQuery("");
          }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Components Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Components ({filteredComponents.length})</CardTitle>
              <CardDescription>Hardware components in inventory</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading components...</div>
          ) : filteredComponents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Purchase Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell>{component.type}</TableCell>
                      <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                      <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(component.status)}</TableCell>
                      <TableCell>{component.location || 'N/A'}</TableCell>
                      <TableCell>{component.purchaseCost ? `$${component.purchaseCost}` : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleView(component)}>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(component)}>
                              <EditIcon className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(component)}
                              className="text-red-600"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <PackageIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No components found</p>
              <Button onClick={handleAdd}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add First Component
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Component Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedComponent(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedComponent ? 'Edit Component' : 'Add New Component'}
            </DialogTitle>
            <DialogDescription>
              {selectedComponent ? 'Update component information.' : 'Create a new hardware component.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select 
                  onValueChange={(value) => {
                    console.log('Type selected:', value);
                    form.setValue("type", value);
                  }} 
                  value={form.watch("type")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {componentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-red-500 text-sm">{form.formState.errors.type.message}</p>
                )}
              </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  onValueChange={(value) => form.setValue("category", value)} 
                  value={form.watch("category")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Networking">Networking</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Computing">Computing</SelectItem>
                    <SelectItem value="Peripherals">Peripherals</SelectItem>
                  </SelectContent>
                </Select>
                 {form.formState.errors.category && (
                  <p className="text-red-500 text-sm">{form.formState.errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input id="manufacturer" {...form.register("manufacturer")} />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...form.register("model")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" {...form.register("serialNumber")} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                          onValueChange={(value) => {
                            console.log('Status selected:', value);
                            form.setValue("status", value as any);
                          }} 
                          value={form.watch("status")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="defective">Defective</SelectItem>
                            <SelectItem value="scrap">Scrap</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                          </SelectContent>
                        </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...form.register("location")} />
              </div>
              <div>
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input 
                  id="assignedTo" 
                  {...form.register("assignedTo")}
                  placeholder="Enter name or ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" type="date" {...form.register("purchaseDate")} />
              </div>
              <div>
                <Label htmlFor="purchaseCost">Purchase Cost</Label>
                <Input id="purchaseCost" type="text" {...form.register("purchaseCost")} />
              </div>
            </div>

            <div>
              <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
              <Input id="warrantyExpiry" type="date" {...form.register("warrantyExpiry")} />
            </div>

            <div>
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea id="specifications" {...form.register("specifications")} />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register("notes")} />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedComponent(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createComponentMutation.isPending || updateComponentMutation.isPending}
              >
                {createComponentMutation.isPending || updateComponentMutation.isPending 
                  ? 'Saving...' 
                  : isEditDialogOpen 
                    ? 'Update Component' 
                    : 'Add Component'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Component Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Component Details</DialogTitle>
          </DialogHeader>
          {selectedComponent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Name</Label>
                  <p>{selectedComponent.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Type</Label>
                  <p>{selectedComponent.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Manufacturer</Label>
                  <p>{selectedComponent.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Model</Label>
                  <p>{selectedComponent.model || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Serial Number</Label>
                  <p>{selectedComponent.serialNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <div>{getStatusBadge(selectedComponent.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Location</Label>
                  <p>{selectedComponent.location || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Purchase Cost</Label>
                  <p>{selectedComponent.purchaseCost ? `$${selectedComponent.purchaseCost}` : 'N/A'}</p>
                </div>
              </div>
              {selectedComponent.specifications && (
                <div>
                  <Label className="font-semibold">Specifications</Label>
                  <p>{selectedComponent.specifications}</p>
                </div>
              )}
              {selectedComponent.notes && (
                <div>
                  <Label className="font-semibold">Notes</Label>
                  <p>{selectedComponent.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Components Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Components</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import components in bulk. Download the template first to see the required format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
            <div className="text-center text-sm text-gray-500">
              <p>1. Download the template</p>
              <p>2. Fill in your component data</p>
              <p>3. Upload the completed CSV file</p>
            </div>
            <input
              type="file"
              accept=".csv"
              className="w-full p-2 border rounded"
              onChange={(e) => {
                // Handle file upload logic here
                toast({
                  title: "Feature Coming Soon",
                  description: "CSV import functionality will be available in a future update",
                });
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setComponentToDelete(null);
        }}
        onConfirm={() => {
          if (componentToDelete) {
            deleteComponentMutation.mutate(componentToDelete.id);
            setIsConfirmDeleteOpen(false);
            setComponentToDelete(null);
          }
        }}
        itemType="component"
        itemName={componentToDelete?.name || ""}
      />
    </div>
  );
}