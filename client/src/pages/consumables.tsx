import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, CheckCircleIcon, PackageIcon, CalendarIcon, TrendingUpIcon, AlertCircleIcon, SearchIcon, XCircle } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import ConsumableForm from "@/components/consumables/consumable-form";
import { queryClient } from "@/lib/queryClient";
import { Consumable } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function Consumables() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState<Consumable | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<ConsumableAssignment | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    quantity: 1,
    knoxId: '',
    serialNumber: '',
    notes: ''
  });
  const [assignmentToEdit, setAssignmentToEdit] = useState<ConsumableAssignment | null>(null);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  // Fetch consumables with error handling
  const { data: consumables = [], isLoading, error } = useQuery({
    queryKey: ['/api/consumables'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/consumables');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Failed to fetch consumables:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  if (error) {
    console.error('Error loading consumables:', error);
  }

  // Consumable mutation with improved error handling
  const consumablesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/consumables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create consumable: ${errorData}`);
      }

      return response.json();
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/consumables'] });
      toast({
        title: "Success",
        description: "Consumable has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Consumable creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add consumable. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleConsumableSubmit = (data: any) => {
    consumablesMutation.mutate(data);
  };

  // Assignment mutation with improved error handling
  const assignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/consumables/${selectedConsumable?.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific database connection errors
        if (responseData.code === 'DB_CONNECTION_FAILED') {
          throw new Error(`Database Error: ${responseData.error}\n\nInstructions: ${responseData.instruction}`);
        }
        throw new Error(responseData.message || responseData.error || 'Failed to assign consumable');
      }

      return responseData;
    },
    onSuccess: () => {
      setIsAssignDialogOpen(false);
      setSelectedConsumable(null);
      setAssignmentData({ assignedTo: '', quantity: 1, notes: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/consumables'] });
      toast({
        title: "Success",
        description: "Consumable has been assigned successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message;
      const isDbError = errorMessage.includes('Database Error:');

      console.error('Assignment error:', error);
      toast({
        title: isDbError ? "Database Connection Failed" : "Assignment Failed",
        description: errorMessage,
        variant: "destructive",
        duration: isDbError ? 10000 : 5000,
      });
    }
  });

  const handleAssignConsumable = (consumable: Consumable) => {
    setSelectedConsumable(consumable);
    setAssignmentData({ assignedTo: '', quantity: 1, notes: '' });
    setIsAssignDialogOpen(true);
  };

  const handleAssignmentSubmit = () => {
    if (!assignmentData.assignedTo.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter who the consumable is assigned to.",
        variant: "destructive",
      });
      return;
    }

    if (assignmentData.quantity <= 0 || assignmentData.quantity > (selectedConsumable?.quantity || 0)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    assignmentMutation.mutate(assignmentData);
  };

  // Filter and paginate consumables
  const filteredConsumables = useMemo(() => {
    if (!consumables) return [];

    return consumables.filter(consumable => {
      const searchLower = searchQuery.toLowerCase();
      return (
        consumable.name?.toLowerCase().includes(searchLower) ||
        consumable.category?.toLowerCase().includes(searchLower) ||
        consumable.modelNumber?.toLowerCase().includes(searchLower) ||
        consumable.manufacturer?.toLowerCase().includes(searchLower) ||
        consumable.location?.toLowerCase().includes(searchLower)
      );
    });
  }, [consumables, searchQuery]);

  const paginatedConsumables = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredConsumables.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredConsumables, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredConsumables.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-8 p-6 animate-in fade-in-0 duration-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2 animate-in slide-in-from-left-5 duration-700">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Consumables
            </h1>
            <p className="text-lg text-slate-600 font-medium">Manage consumable items and inventory</p>
          </div>
          <div className="flex flex-wrap gap-3 animate-in slide-in-from-right-5 duration-700">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Add Consumable
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-slate-800">Add New Consumable</DialogTitle>
                  <DialogDescription className="text-slate-600">
                    Enter the details for the new consumable item
                  </DialogDescription>
                </DialogHeader>
                <ConsumableForm 
                  onSubmit={handleConsumableSubmit} 
                  isLoading={consumablesMutation.isPending} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircleIcon className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unable to load consumables. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in slide-in-from-bottom-8 delay-200">
          <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-100">
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <TrendingUpIcon className="h-6 w-6 text-indigo-600" />
              Consumables Inventory
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              Track and manage consumable items and assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search consumables by name, category, model, manufacturer, or location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="ml-4 text-slate-600">Loading consumables...</div>
              </div>
            ) : filteredConsumables.length > 0 ? (
              <div className="space-y-6">
                <div className="grid gap-6">
                {paginatedConsumables.map((consumable, index) => (
                  <Card 
                    key={consumable.id} 
                    className={`group hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] animate-in slide-in-from-bottom-4`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {consumable.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-2">
                            <PackageIcon className="h-4 w-4 text-indigo-500" />
                            <span>{consumable.category}</span>
                            {consumable.modelNumber && <span className="text-slate-400">• {consumable.modelNumber}</span>}
                          </CardDescription>
                        </div>
                        <Badge 
                          className={`${
                            consumable.status === 'available' 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          } border`}
                        >
                          {consumable.status === 'available' ? 'Available' : 'In Use'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                          <p className="text-xs text-indigo-600 font-medium mb-1">Total</p>
                          <p className="text-2xl font-bold text-indigo-900">{consumable.quantity || 0}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <p className="text-xs text-green-600 font-medium mb-1">Available</p>
                          <p className="text-2xl font-bold text-green-900">{consumable.quantity || 0}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-600 font-medium mb-1">Location</p>
                          <p className="text-sm font-semibold text-slate-900 truncate">{consumable.location || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-600 font-medium mb-1">Manufacturer</p>
                          <p className="text-sm font-semibold text-slate-900 truncate">{consumable.manufacturer || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/consumables/${consumable.id}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          >
                            View Details
                          </Button>
                        </Link>
                        <Button 
                          variant="default"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleAssignConsumable(consumable)}
                          disabled={!consumable.quantity || consumable.quantity <= 0}
                        >
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-16 animate-in fade-in-0 duration-700">
                <SearchIcon className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                <h3 className="text-2xl font-bold text-slate-800 mb-3">No results found</h3>
                <p className="text-slate-600 mb-4">No consumables match your search criteria.</p>
                <Button onClick={() => setSearchQuery('')} variant="outline">Clear Search</Button>
              </div>
            ) : (
              <div className="text-center py-16 animate-in fade-in-0 duration-700">
                <div className="relative mb-8">
                  <CheckCircleIcon className="h-24 w-24 mx-auto text-green-500 animate-pulse" />
                  <div className="absolute inset-0 h-24 w-24 mx-auto rounded-full bg-green-100 animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">No Consumables Found</h3>
                <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto">
                  Click the "Add Consumable" button above to start tracking your consumable items.
                </p>
                <div className="flex justify-center">
                  <Link href="/">
                    <Button 
                      variant="outline" 
                      className="px-8 py-3 text-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105"
                    >
                      Return to Dashboard
                    </Button>
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
              <DialogTitle>Assign Consumable</DialogTitle>
              <DialogDescription>
                Assign {selectedConsumable?.name} to a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="assignedTo">Assigned To *</Label>
                <Input
                  id="assignedTo"
                  value={assignmentData.assignedTo}
                  onChange={(e) => {
                    setAssignmentData({...assignmentData, assignedTo: e.target.value});
                    // setAssigneeSearch(e.target.value); // Assuming assignee search is handled elsewhere or not critical for this fix
                  }}
                  placeholder="Search by name or Knox ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type to search for users by name or Knox ID
                </p>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedConsumable?.quantity || 1}
                  value={assignmentData.quantity}
                  onChange={(e) => setAssignmentData({...assignmentData, quantity: parseInt(e.target.value) || 1})}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: {selectedConsumable?.quantity || 0}
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={assignmentData.notes}
                  onChange={(e) => setAssignmentData({...assignmentData, notes: e.target.value})}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}