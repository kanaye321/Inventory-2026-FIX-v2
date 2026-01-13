import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon, CheckCircleIcon, MonitorIcon, CalendarIcon, DownloadIcon, UploadIcon, FileDownIcon, SearchIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import ITEquipmentForm from "@/components/it-equipment/it-equipment-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { formatDate, downloadCSV } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import ITEquipmentCSVImport from "@/components/it-equipment/it-equipment-csv-import";

export default function ITEquipment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<any | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    quantity: 1,
    knoxId: '',
    serialNumber: '',
    notes: ''
  });
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch IT equipment
  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['/api/it-equipment'],
    queryFn: async () => {
      const response = await fetch('/api/it-equipment');
      if (!response.ok) throw new Error('Failed to fetch IT equipment');
      return response.json();
    },
  });

  // Create IT equipment mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        // Validate data before sending
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid data provided');
        }

        const response = await fetch('/api/it-equipment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create IT equipment');
        }

        return response.json();
      } catch (error) {
        console.error('Error creating IT equipment:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/it-equipment'] });

      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'created',
          itemType: 'IT Equipment',
          itemName: data.assetTag || data.serialNumber || 'New Equipment',
          details: `IT Equipment created: ${data.assetTag || 'N/A'}, Type: ${data.type || 'N/A'}, Model: ${data.model || 'N/A'}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));

      toast({
        title: "Equipment added",
        description: "The IT equipment has been added successfully. Email notification sent.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error adding the equipment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEquipmentSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  // Assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/it-equipment/${selectedForAssignment?.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign equipment');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsAssignDialogOpen(false);
      setSelectedForAssignment(null);
      setAssignmentData({ assignedTo: '', quantity: 1, knoxId: '', serialNumber: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/it-equipment'] });
      toast({
        title: "Success",
        description: "Equipment has been assigned successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAssignEquipment = (equipment: any) => {
    setSelectedForAssignment(equipment);
    setAssignmentData({ 
      assignedTo: '', 
      quantity: 1, 
      knoxId: '', 
      serialNumber: '', 
      notes: '' 
    });
    setIsAssignDialogOpen(true);
  };

  const handleAssignmentSubmit = () => {
    if (!assignmentData.assignedTo.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter who the equipment is assigned to.",
        variant: "destructive",
      });
      return;
    }

    const availableQuantity = (selectedForAssignment?.totalQuantity || 0) - (selectedForAssignment?.assignedQuantity || 0);

    if (assignmentData.quantity <= 0 || assignmentData.quantity > availableQuantity) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    assignmentMutation.mutate(assignmentData);
  };

  const handleExportCSV = async () => {
    if (equipment && equipment.length > 0) {
      try {
        // Fetch assignment data for all equipment
        const equipmentWithAssignments = await Promise.all(
          equipment.map(async (item) => {
            try {
              const response = await fetch(`/api/it-equipment/${item.id}/assignments`);
              const assignments = response.ok ? await response.json() : [];

              // If there are assignments, create multiple rows (one per assignment)
              if (assignments && assignments.length > 0) {
                return assignments.map((assignment: any) => ({
                  name: item.name,
                  category: item.category,
                  totalQuantity: item.totalQuantity,
                  model: item.model || '',
                  location: item.location || '',
                  dateAcquired: item.dateAcquired || '',
                  knoxId: item.knoxId || '',
                  serialNumber: item.serialNumber || '',
                  dateRelease: item.dateRelease || '',
                  remarks: item.remarks || '',
                  status: item.status,
                  assignedTo: assignment.assignedTo || '',
                  assignedQuantity: assignment.quantity || '',
                  assignedDate: assignment.assignedDate || '',
                  assignmentKnoxId: assignment.knoxId || '',
                  assignmentSerialNumber: assignment.serialNumber || '',
                  assignmentNotes: assignment.notes || ''
                }));
              } else {
                // No assignments, return equipment with empty assignment fields
                return [{
                  name: item.name,
                  category: item.category,
                  totalQuantity: item.totalQuantity,
                  model: item.model || '',
                  location: item.location || '',
                  dateAcquired: item.dateAcquired || '',
                  knoxId: item.knoxId || '',
                  serialNumber: item.serialNumber || '',
                  dateRelease: item.dateRelease || '',
                  remarks: item.remarks || '',
                  status: item.status,
                  assignedTo: '',
                  assignedQuantity: '',
                  assignedDate: '',
                  assignmentKnoxId: '',
                  assignmentSerialNumber: '',
                  assignmentNotes: ''
                }];
              }
            } catch (error) {
              console.error(`Error fetching assignments for equipment ${item.id}:`, error);
              return [{
                name: item.name,
                category: item.category,
                totalQuantity: item.totalQuantity,
                model: item.model || '',
                location: item.location || '',
                dateAcquired: item.dateAcquired || '',
                knoxId: item.knoxId || '',
                serialNumber: item.serialNumber || '',
                dateRelease: item.dateRelease || '',
                remarks: item.remarks || '',
                status: item.status,
                assignedTo: '',
                assignedQuantity: '',
                assignedDate: '',
                assignmentKnoxId: '',
                assignmentSerialNumber: '',
                assignmentNotes: ''
              }];
            }
          })
        );

        // Flatten the array of arrays
        const csvData = equipmentWithAssignments.flat();
        downloadCSV(csvData, 'it_equipment_with_assignments.csv');

        toast({
          title: "Export successful",
          description: `Exported ${csvData.length} records including assignment data.`,
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: "Export failed",
          description: "Failed to export IT equipment data with assignments.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No data to export",
        description: "There is no IT equipment data to export.",
      });
    }
  };

  const handleSelectEquipment = (equipmentId: string, checked: boolean) => {
    setSelectedEquipment((prevSelected) => {
      if (checked) {
        return [...prevSelected, equipmentId];
      } else {
        return prevSelected.filter((id) => id !== equipmentId);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEquipment(equipment.map((item) => String(item.id)));
    } else {
      setSelectedEquipment([]);
    }
  };

  // Filter and paginate equipment
  const filteredEquipment = useMemo(() => {
    if (!equipment) return [];

    return equipment.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.model?.toLowerCase().includes(searchLower) ||
        item.location?.toLowerCase().includes(searchLower) ||
        item.knoxId?.toLowerCase().includes(searchLower) ||
        item.serialNumber?.toLowerCase().includes(searchLower)
      );
    });
  }, [equipment, searchQuery]);

  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const paginatedEquipment = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEquipment.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEquipment, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: "Sample Laptop",
        category: "Laptop",
        totalQuantity: "10",
        model: "ThinkPad X1 Carbon",
        location: "Head Office - Room 201",
        dateAcquired: "2023-01-15",
        knoxId: "KNOX001",
        serialNumber: "SN123456789",
        dateRelease: "",
        remarks: "High-performance laptop for development work",
        status: "available",
        assignedTo: "John Doe",
        assignedQuantity: "1",
        assignedDate: "2023-01-20",
        assignmentKnoxId: "KNOX-JD-001",
        assignmentSerialNumber: "SN123456789-JD",
        assignmentNotes: "For development tasks"
      },
      {
        name: "Sample Desktop",
        category: "Desktop",
        totalQuantity: "5",
        model: "OptiPlex 7090",
        location: "Branch Office - Floor 3",
        dateAcquired: "2023-02-10",
        knoxId: "KNOX002",
        serialNumber: "SN987654321",
        dateRelease: "",
        remarks: "Desktop computer for office productivity",
        status: "available",
        assignedTo: "Jane Smith",
        assignedQuantity: "1",
        assignedDate: "2023-02-15",
        assignmentKnoxId: "KNOX-JS-002",
        assignmentSerialNumber: "SN987654321-JS",
        assignmentNotes: "For general office use"
      }
    ];

    const csvContent = [
      "name,category,totalQuantity,model,location,dateAcquired,knoxId,serialNumber,dateRelease,remarks,status,assignedTo,assignedQuantity,assignedDate,assignmentKnoxId,assignmentSerialNumber,assignmentNotes",
      ...templateData.map(row => 
        `"${row.name}",${row.category},${row.totalQuantity},"${row.model}","${row.location}",${row.dateAcquired},${row.knoxId},${row.serialNumber},${row.dateRelease},"${row.remarks}",${row.status},"${row.assignedTo}","${row.assignedQuantity}","${row.assignedDate}","${row.assignmentKnoxId}","${row.assignmentSerialNumber}","${row.assignmentNotes}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'it-equipment-import-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Template Downloaded",
      description: "IT Equipment import template has been downloaded successfully."
    });
  };

  // Update IT equipment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ITEquipment> }) => {
      const response = await fetch(`/api/it-equipment/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update IT equipment: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/it-equipment'] });

      // Send email notification
      fetch('/api/send-modification-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'updated',
          itemType: 'IT Equipment',
          itemName: data.assetTag || data.serialNumber || 'Equipment',
          details: `IT Equipment updated: ${data.assetTag || 'N/A'}, Status: ${data.status || 'N/A'}`
        })
      }).catch(err => console.error('Failed to send email notification:', err));

      toast({
        title: "Success",
        description: "IT Equipment has been updated successfully"
      });
    }
  });


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">IT Equipment</h1>
          <p className="text-sm text-gray-600">Manage IT equipment inventory and assignments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCSV}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileDownIcon className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UploadIcon className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import IT Equipment from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to bulk import IT equipment data
                </DialogDescription>
              </DialogHeader>
              <ITEquipmentCSVImport onImportComplete={() => setIsImportDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add IT Equipment</DialogTitle>
                <DialogDescription>
                  Enter the details for the IT equipment
                </DialogDescription>
              </DialogHeader>
              <ITEquipmentForm 
                onSubmit={handleEquipmentSubmit} 
                isLoading={createMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IT Equipment Management</CardTitle>
          <CardDescription>Track and manage IT equipment inventory and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, category, model, location, Knox ID, or serial number..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Found {filteredEquipment.length} result{filteredEquipment.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : equipment && equipment.length > 0 ? (
            <>
              <div className="space-y-4">
                {/* Select All and Bulk Actions */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedEquipment.length === filteredEquipment.length && filteredEquipment.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      {selectedEquipment.length > 0 
                        ? `${selectedEquipment.length} selected` 
                        : 'Select All'}
                    </span>
                  </div>
                  <Button variant="destructive" size="sm" disabled={selectedEquipment.length === 0}>
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedEquipment.length})
                  </Button>
                </div>

                {/* Equipment Grid */}
                {paginatedEquipment.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedEquipment.map((item) => {
                      const totalQuantity = item.totalQuantity || 0;
                      const assignedQuantity = item.assignedQuantity || 0;
                      const availableQuantity = totalQuantity - assignedQuantity;
                      const isAvailable = availableQuantity > 0;
                      const usagePercentage = totalQuantity > 0 ? (assignedQuantity / totalQuantity) * 100 : 0;

                      return (
                        <Card key={item.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden">
                          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {isAvailable && (
                                  <Switch 
                                    id={`equipment-${item.id}`}
                                    checked={selectedEquipment.includes(item.id)}
                                    onCheckedChange={(checked) => handleSelectEquipment(item.id, checked)}
                                  />
                                )}
                                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <MonitorIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{item.name}</CardTitle>
                                  <CardDescription className="text-xs">{item.category}</CardDescription>
                                </div>
                              </div>
                              <Badge 
                                className={availableQuantity > 0 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'}
                              >
                                {availableQuantity > 0 ? 'Available' : 'Full'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-500 text-xs">Model</p>
                                <p className="font-medium truncate">{item.model || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Location</p>
                                <p className="font-medium truncate">{item.location || 'N/A'}</p>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Usage</span>
                                <span className="font-medium">{assignedQuantity} / {totalQuantity}</span>
                              </div>
                              <Progress value={usagePercentage} className="h-2" />
                              <div className="flex justify-between text-xs">
                                <span className="text-green-600 font-medium">{availableQuantity} available</span>
                                {item.dateAcquired && (
                                  <span className="text-gray-500">
                                    <CalendarIcon className="h-3 w-3 inline mr-1" />
                                    {formatDate(item.dateAcquired)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Link href={`/it-equipment/${item.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  Details
                                </Button>
                              </Link>
                              <Button 
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleAssignEquipment(item)}
                                disabled={availableQuantity <= 0}
                              >
                                Assign
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-10">
                      <MonitorIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No equipment found matching your search.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNumber)}
                                isActive={currentPage === pageNumber}
                                className="cursor-pointer"
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <span className="px-4">...</span>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">IT Equipment Management Ready</h3>
              <p className="text-gray-500 mb-4">
                Click the "Add Equipment" button above to start tracking your IT equipment.
              </p>
              <div className="flex justify-center">
                <Link href="/">
                  <Button variant="outline">Return to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Equipment</DialogTitle>
            <DialogDescription>
              Assign {selectedForAssignment?.name} to a user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="assignedTo" className="text-sm font-medium">Assigned To *</label>
              <Input
                id="assignedTo"
                value={assignmentData.assignedTo}
                onChange={(e) => setAssignmentData({...assignmentData, assignedTo: e.target.value})}
                placeholder="Enter name or Knox ID"
              />
            </div>
            <div>
              <label htmlFor="quantity" className="text-sm font-medium">Quantity *</label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={(selectedForAssignment?.totalQuantity || 0) - (selectedForAssignment?.assignedQuantity || 0)}
                value={assignmentData.quantity}
                onChange={(e) => setAssignmentData({...assignmentData, quantity: parseInt(e.target.value) || 1})}
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: {(selectedForAssignment?.totalQuantity || 0) - (selectedForAssignment?.assignedQuantity || 0)}
              </p>
            </div>
            <div>
              <label htmlFor="knoxId" className="text-sm font-medium">Knox ID</label>
              <Input
                id="knoxId"
                value={assignmentData.knoxId}
                onChange={(e) => setAssignmentData({...assignmentData, knoxId: e.target.value})}
                placeholder="Enter Knox ID"
              />
            </div>
            <div>
              <label htmlFor="serialNumber" className="text-sm font-medium">Serial Number</label>
              <Input
                id="serialNumber"
                value={assignmentData.serialNumber}
                onChange={(e) => setAssignmentData({...assignmentData, serialNumber: e.target.value})}
                placeholder="Enter serial number"
              />
            </div>
            <div>
              <label htmlFor="notes" className="text-sm font-medium">Notes</label>
              <Textarea
                id="notes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData({...assignmentData, notes: e.target.value})}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignmentSubmit}
              disabled={assignmentMutation.isPending || !assignmentData.assignedTo.trim()}
            >
              {assignmentMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}