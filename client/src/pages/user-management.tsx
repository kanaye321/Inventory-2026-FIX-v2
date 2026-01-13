
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema, type User, type InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Users, Settings, Shield, Edit, Trash2, Eye, Plus, Crown, UserCheck, Loader2, Search, Filter } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface UserPermissions {
  users: { view: boolean; edit: boolean; add: boolean };
  assets: { view: boolean; edit: boolean; add: boolean };
  components: { view: boolean; edit: boolean; add: boolean };
  accessories: { view: boolean; edit: boolean; add: boolean };
  licenses: { view: boolean; edit: boolean; add: boolean };
  reports: { view: boolean; edit: boolean; add: boolean };
  settings: { view: boolean; edit: boolean; add: boolean };
  vmInventory: { view: boolean; edit: boolean; add: boolean };
  networkDiscovery: { view: boolean; edit: boolean; add: boolean };
  admin: { view: boolean; edit: boolean; add: boolean };
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: UserPermissions;
  isSystem?: boolean;
  userCount: number;
}

const defaultPermissions: UserPermissions = {
  users: { view: false, edit: false, add: false },
  assets: { view: true, edit: false, add: false },
  components: { view: true, edit: false, add: false },
  accessories: { view: true, edit: false, add: false },
  licenses: { view: true, edit: false, add: false },
  reports: { view: true, edit: false, add: false },
  settings: { view: false, edit: false, add: false },
  vmInventory: { view: true, edit: false, add: false },
  networkDiscovery: { view: false, edit: false, add: false },
  admin: { view: false, edit: false, add: false },
};

const systemRoles: Role[] = [
  {
    id: 1,
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: {
      users: { view: true, edit: true, add: true },
      assets: { view: true, edit: true, add: true },
      components: { view: true, edit: true, add: true },
      accessories: { view: true, edit: true, add: true },
      licenses: { view: true, edit: true, add: true },
      reports: { view: true, edit: true, add: true },
      settings: { view: true, edit: true, add: true },
      vmInventory: { view: true, edit: true, add: true },
      networkDiscovery: { view: true, edit: true, add: true },
      admin: { view: true, edit: true, add: true },
    },
    isSystem: true,
    userCount: 1
  },
  {
    id: 2,
    name: "Manager",
    description: "Can manage most resources but limited admin access",
    permissions: {
      users: { view: true, edit: false, add: false },
      assets: { view: true, edit: true, add: true },
      components: { view: true, edit: true, add: true },
      accessories: { view: true, edit: true, add: true },
      licenses: { view: true, edit: true, add: true },
      reports: { view: true, edit: true, add: false },
      settings: { view: false, edit: false, add: false },
      vmInventory: { view: true, edit: true, add: false },
      networkDiscovery: { view: true, edit: false, add: false },
      admin: { view: false, edit: false, add: false },
    },
    isSystem: true,
    userCount: 0
  },
  {
    id: 3,
    name: "User",
    description: "Standard user with view-only access to most resources",
    permissions: defaultPermissions,
    isSystem: true,
    userCount: 0
  }
];

export default function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<UserPermissions>(defaultPermissions);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Role management state
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<UserPermissions>(defaultPermissions);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState<Role | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: apiRoles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const res = await fetch('/api/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const addUserForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      isAdmin: false,
    },
  });

  const editUserForm = useForm<Partial<InsertUser>>({
    resolver: zodResolver(insertUserSchema.partial()),
    defaultValues: {},
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const userWithPermissions = {
        ...data,
        permissions: defaultPermissions
      };
      const response = await apiRequest("POST", "/api/users", userWithPermissions);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsAddDialogOpen(false);
      addUserForm.reset();
      toast({
        title: "Success",
        description: "User created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<InsertUser> }) => {
      const response = await apiRequest("PATCH", `/api/users/${data.id}`, data.updates);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      editUserForm.reset();
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { id: number; permissions: UserPermissions }) => {
      const response = await apiRequest("PUT", `/api/users/${data.id}/permissions`, { permissions: data.permissions });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update permissions');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsPermissionsDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User permissions updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsConfirmDeleteOpen(false);
      setUserToDelete(null);
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignUserToRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; roleId: number }) => {
      const response = await apiRequest("PATCH", `/api/users/${data.userId}`, { 
        roleId: data.roleId,
        isAdmin: false
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign user to role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setAssignUserDialogOpen(false);
      setSelectedRoleForAssignment(null);
      toast({
        title: "Success",
        description: "User assigned to role successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editUserForm.reset({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department || "",
      isAdmin: user.isAdmin || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    const userPermissions = user.permissions || {};
    const safePermissions = { ...defaultPermissions };

    Object.keys(defaultPermissions).forEach(moduleKey => {
      if (userPermissions[moduleKey as keyof UserPermissions]) {
        safePermissions[moduleKey as keyof UserPermissions] = {
          ...defaultPermissions[moduleKey as keyof UserPermissions],
          ...userPermissions[moduleKey as keyof UserPermissions]
        };
      }
    });

    setEditingPermissions(safePermissions);
    setIsPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (module: keyof UserPermissions, action: keyof UserPermissions[keyof UserPermissions], value: boolean) => {
    setEditingPermissions(prev => ({
      ...prev,
      [module]: {
        view: false,
        edit: false,
        add: false,
        ...prev[module],
        [action]: value
      }
    }));
  };

  const handleNewRolePermissionChange = (module: keyof UserPermissions, action: keyof UserPermissions[keyof UserPermissions], value: boolean) => {
    setNewRolePermissions(prev => ({
      ...prev,
      [module]: {
        view: false,
        edit: false,
        add: false,
        ...prev[module],
        [action]: value
      }
    }));
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Missing role name",
        description: "Please provide a name for the new role.",
        variant: "destructive",
      });
      return;
    }

    const newRole: Role = {
      id: Date.now(),
      name: newRoleName,
      description: newRoleDescription,
      permissions: newRolePermissions,
      isSystem: false,
      userCount: 0
    };

    setCustomRoles(prev => [...prev, newRole]);
    setIsAddRoleDialogOpen(false);
    setNewRoleName("");
    setNewRoleDescription("");
    setNewRolePermissions(defaultPermissions);

    toast({
      title: "Role Created",
      description: `Role "${newRoleName}" has been created successfully.`,
    });
  };

  const allRoles = [...(apiRoles || systemRoles), ...customRoles];

  const permissionModules = [
    { key: 'users' as keyof UserPermissions, label: 'User Management', icon: Users },
    { key: 'assets' as keyof UserPermissions, label: 'Assets', icon: Shield },
    { key: 'components' as keyof UserPermissions, label: 'Components', icon: Settings },
    { key: 'accessories' as keyof UserPermissions, label: 'Accessories', icon: Plus },
    { key: 'licenses' as keyof UserPermissions, label: 'Licenses', icon: Shield },
    { key: 'reports' as keyof UserPermissions, label: 'Reports', icon: Eye },
    { key: 'vmInventory' as keyof UserPermissions, label: 'VM Inventory', icon: Settings },
    { key: 'networkDiscovery' as keyof UserPermissions, label: 'Network Discovery', icon: Settings },
    { key: 'settings' as keyof UserPermissions, label: 'System Settings', icon: Settings },
    { key: 'admin' as keyof UserPermissions, label: 'Admin Panel', icon: Shield },
  ];

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || 
      (filterRole === "admin" && user.isAdmin) ||
      (filterRole === "user" && !user.isAdmin && !user.roleId) ||
      (user.roleId && user.roleId.toString() === filterRole);

    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and their permissions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <UserPlus className="h-5 w-5 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New User</DialogTitle>
              <DialogDescription>Create a new user account with appropriate permissions</DialogDescription>
            </DialogHeader>
            <Form {...addUserForm}>
              <form onSubmit={addUserForm.handleSubmit((data) => addUserMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addUserForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addUserForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={addUserForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="IT Department" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">Administrator Privileges</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Grant full administrative access to this user
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addUserMutation.isPending}>
                    {addUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Search and Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, username, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Administrators</SelectItem>
                      <SelectItem value="user">Standard Users</SelectItem>
                      {allRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground">@{user.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.department || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "default" : "secondary"} className="font-medium">
                              {user.isAdmin ? (
                                <><Crown className="h-3 w-3 mr-1" /> Administrator</>
                              ) : (
                                user.roleId ? allRoles.find(r => r.id === user.roleId)?.name || "User" : "User"
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPermissions(user)}
                                title="Edit Permissions"
                                className="hover:bg-purple-50 hover:text-purple-600"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setIsConfirmDeleteOpen(true);
                                }}
                                disabled={user.isAdmin && user.id === 1}
                                title="Delete User"
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles ({allRoles.length})</CardTitle>
                  <CardDescription>Manage user roles and their permissions</CardDescription>
                </div>
                <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>Define a new role with specific permissions</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="roleName">Role Name</Label>
                          <Input
                            id="roleName"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="Enter role name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="roleDescription">Description</Label>
                          <Input
                            id="roleDescription"
                            value={newRoleDescription}
                            onChange={(e) => setNewRoleDescription(e.target.value)}
                            placeholder="Enter role description"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Permissions</Label>
                        {permissionModules.map((module) => {
                          const Icon = module.icon;
                          return (
                            <Card key={module.key}>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <Icon className="h-4 w-4" />
                                  {module.label}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`new-${module.key}-view`}
                                      checked={newRolePermissions[module.key]?.view || false}
                                      onCheckedChange={(checked) => 
                                        handleNewRolePermissionChange(module.key, 'view', checked as boolean)
                                      }
                                    />
                                    <Label htmlFor={`new-${module.key}-view`}>View</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`new-${module.key}-edit`}
                                      checked={newRolePermissions[module.key]?.edit || false}
                                      onCheckedChange={(checked) => 
                                        handleNewRolePermissionChange(module.key, 'edit', checked as boolean)
                                      }
                                    />
                                    <Label htmlFor={`new-${module.key}-edit`}>Edit</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`new-${module.key}-add`}
                                      checked={newRolePermissions[module.key]?.add || false}
                                      onCheckedChange={(checked) => 
                                        handleNewRolePermissionChange(module.key, 'add', checked as boolean)
                                      }
                                    />
                                    <Label htmlFor={`new-${module.key}-add`}>Add</Label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleCreateRole}
                        disabled={!newRoleName.trim()}
                      >
                        Create Role
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Users Count</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRoles.map((role) => {
                      const actualUserCount = users.filter(user => {
                        if (role.id === 1) {
                          return user.isAdmin === true;
                        }
                        return user.roleId === role.id;
                      }).length;

                      return (
                        <TableRow key={role.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="max-w-md text-muted-foreground">{role.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{actualUserCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.isSystem ? "default" : "secondary"}>
                              {role.isSystem ? "System" : "Custom"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedRoleForAssignment(role);
                                  setAssignUserDialogOpen(true);
                                }}
                                title="Assign User to Role"
                                className="hover:bg-green-50 hover:text-green-600"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedRole(role);
                                  setNewRoleName(role.name);
                                  setNewRoleDescription(role.description);
                                  setNewRolePermissions(role.permissions);
                                  setIsEditRoleDialogOpen(true);
                                }}
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={role.isSystem && role.id === 1}
                                onClick={() => {
                                  if (role.isSystem) {
                                    toast({
                                      title: "System role modified",
                                      description: `Role "${role.name}" permissions have been reset.`,
                                    });
                                  } else {
                                    setCustomRoles(prev => prev.filter(r => r.id !== role.id));
                                    toast({
                                      title: "Role deleted",
                                      description: `Role "${role.name}" has been deleted.`,
                                    });
                                  }
                                }}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Modify role permissions and details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRoleName">Role Name</Label>
                <Input
                  id="editRoleName"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Enter role name"
                  disabled={selectedRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRoleDescription">Description</Label>
                <Input
                  id="editRoleDescription"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Enter role description"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              {permissionModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Card key={module.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4" />
                        {module.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${module.key}-view`}
                            checked={newRolePermissions[module.key]?.view || false}
                            onCheckedChange={(checked) => 
                              handleNewRolePermissionChange(module.key, 'view', checked as boolean)
                            }
                          />
                          <Label htmlFor={`edit-${module.key}-view`}>View</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${module.key}-edit`}
                            checked={newRolePermissions[module.key]?.edit || false}
                            onCheckedChange={(checked) => 
                              handleNewRolePermissionChange(module.key, 'edit', checked as boolean)
                            }
                          />
                          <Label htmlFor={`edit-${module.key}-edit`}>Edit</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${module.key}-add`}
                            checked={newRolePermissions[module.key]?.add || false}
                            onCheckedChange={(checked) => 
                              handleNewRolePermissionChange(module.key, 'add', checked as boolean)
                            }
                          />
                          <Label htmlFor={`edit-${module.key}-add`}>Add</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                if (selectedRole?.isSystem) {
                  toast({
                    title: "System role updated",
                    description: `Role "${selectedRole.name}" has been updated.`,
                  });
                } else {
                  setCustomRoles(prev => prev.map(r => 
                    r.id === selectedRole?.id 
                      ? { ...r, name: newRoleName, description: newRoleDescription, permissions: newRolePermissions }
                      : r
                  ));
                  toast({
                    title: "Role updated",
                    description: `Role "${selectedRole?.name}" has been updated.`,
                  });
                }

                setIsEditRoleDialogOpen(false);
                setSelectedRole(null);
                setNewRoleName("");
                setNewRoleDescription("");
                setNewRolePermissions(defaultPermissions);
              }}
              disabled={!newRoleName.trim()}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit((data) => selectedUser && editUserMutation.mutate({ id: selectedUser.id, updates: data }))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold">Administrator Privileges</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Grant full administrative access
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit User Permissions</DialogTitle>
            <DialogDescription>
              Configure what {selectedUser?.firstName} {selectedUser?.lastName} can view, edit, and add
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {permissionModules.map((module) => {
              const Icon = module.icon;
              return (
                <Card key={module.key}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5" />
                      {module.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-view`}
                          checked={editingPermissions[module.key]?.view || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'view', checked as boolean)
                          }
                        />
                        <Label htmlFor={`${module.key}-view`}>View</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-edit`}
                          checked={editingPermissions[module.key]?.edit || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'edit', checked as boolean)
                          }
                        />
                        <Label htmlFor={`${module.key}-edit`}>Edit</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-add`}
                          checked={editingPermissions[module.key]?.add || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'add', checked as boolean)
                          }
                        />
                        <Label htmlFor={`${module.key}-add`}>Add</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedUser && updatePermissionsMutation.mutate({ 
                id: selectedUser.id, 
                permissions: editingPermissions 
              })}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? "Updating..." : "Update Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User to Role Dialog */}
      <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to {selectedRoleForAssignment?.name}</DialogTitle>
            <DialogDescription>
              Select a user to assign to the {selectedRoleForAssignment?.name} role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select 
                onValueChange={(userId) => {
                  if (selectedRoleForAssignment) {
                    assignUserToRoleMutation.mutate({
                      userId: parseInt(userId),
                      roleId: selectedRoleForAssignment.id
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(user => {
                      if (selectedRoleForAssignment?.id === 1) {
                        return !user.isAdmin;
                      }
                      return user.roleId !== selectedRoleForAssignment?.id && !user.isAdmin;
                    })
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName} (@{user.username})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
        itemName={userToDelete ? `${userToDelete.firstName} ${userToDelete.lastName} (@${userToDelete.username})` : ""}
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}
