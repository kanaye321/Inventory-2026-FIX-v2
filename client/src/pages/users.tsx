import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SearchIcon, FileDownIcon, Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { downloadCSV } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import UserTable from "@/components/users/user-table";
import UserForm from "@/components/users/user-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import type { User as UserType } from "@shared/schema";

function UsersPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  // User PII data is automatically decrypted by the backend
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    retry: false
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/users', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setIsAddDialogOpen(false);
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Use PATCH instead of PUT for partial updates
      const response = await apiRequest('PATCH', `/api/users/${id}`, data);
      return await response.json();
    },
    onSuccess: (updatedUser, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setIsEditDialogOpen(false);
      setUserToEdit(null);

      // Show different message if password was changed
      const passwordChanged = data.password && data.password.trim() !== '';
      toast({
        title: "User updated",
        description: passwordChanged 
          ? "The user has been updated successfully. Password has been changed."
          : "The user has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setIsConfirmDeleteOpen(false);
      setUserToDelete(null);
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  const filteredUsers = users ? users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const handleExport = () => {
    if (users && users.length > 0) {
      // Create a safe version of the data without passwords
      const safeUsers = users.map(({ password, ...rest }) => ({
        ...rest,
        password: '********' // Replace with placeholder
      }));
      downloadCSV(safeUsers, 'users-export.csv');
      toast({
        title: "Export successful",
        description: "Users data has been exported to CSV",
      });
    } else {
      toast({
        title: "Export failed",
        description: "No data to export",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage system users</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileDownIcon className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <UserTable 
        users={filteredUsers} 
        isLoading={usersLoading}
        onView={(user) => {
          setUserToView(user);
          setIsViewDialogOpen(true);
        }}
        onEdit={(user) => {
          setUserToEdit(user);
          setIsEditDialogOpen(true);
        }}
        onDelete={(user) => {
          setUserToDelete(user);
          setIsConfirmDeleteOpen(true);
        }}
      />

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {userToView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Username:</strong> {userToView.username}
                </div>
                <div>
                  <strong>First Name:</strong> {userToView.firstName}
                </div>
                <div>
                  <strong>Last Name:</strong> {userToView.lastName}
                </div>
                <div>
                  <strong>Email:</strong> {userToView.email}
                </div>
                <div>
                  <strong>Department:</strong> {userToView.department || 'N/A'}
                </div>
                <div>
                  <strong>Role:</strong> {userToView.isAdmin ? 'Administrator' : 'User'}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <UserForm 
            onSubmit={(data) => createUserMutation.mutate(data)} 
            isLoading={createUserMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {userToEdit && (
            <UserForm 
              onSubmit={(data) => updateUserMutation.mutate({ id: userToEdit.id, data })} 
              isLoading={updateUserMutation.isPending}
              defaultValues={{
                username: userToEdit.username,
                firstName: userToEdit.firstName,
                lastName: userToEdit.lastName,
                email: userToEdit.email,
                department: userToEdit.department || "",
                isAdmin: userToEdit.isAdmin,
                password: ""
              }}
              isEditMode={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={() => {
          if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
          }
        }}
        itemType="user"
        itemName={userToDelete?.username || ""}
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}

export default UsersPage;