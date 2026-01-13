
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, ShieldOff, Search, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User } from "@shared/schema";

export default function MfaManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userToDisable, setUserToDisable] = useState<User | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch('/api/users', {
        credentials: 'include'
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to fetch users:', errorText);
        throw new Error(`Failed to fetch users: ${res.status}`);
      }
      const data = await res.json();
      console.log('Users data:', data);
      return data;
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/disable-mfa/${userId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disable MFA');
      }
      return response.json();
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsConfirmDialogOpen(false);
      setUserToDisable(null);
      toast({
        title: "MFA disabled",
        description: "Two-factor authentication has been disabled for this user.",
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

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDisableMfa = (user: User) => {
    setUserToDisable(user);
    setIsConfirmDialogOpen(true);
  };

  const confirmDisableMfa = () => {
    if (userToDisable) {
      disableMfaMutation.mutate(userToDisable.id);
    }
  };

  const mfaEnabledCount = users.filter(u => u.mfaEnabled).length;
  const mfaDisabledCount = users.filter(u => !u.mfaEnabled).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MFA Management</h1>
        <p className="text-muted-foreground">Manage user multi-factor authentication settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Enabled</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mfaEnabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Disabled</CardTitle>
            <ShieldOff className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mfaDisabledCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User MFA Status</CardTitle>
          <CardDescription>View and manage MFA registration for all users</CardDescription>
          <div className="relative max-w-md w-full mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Failed to load users: {error.message}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>MFA Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Administrator" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.mfaEnabled ? (
                        <Badge variant="default" className="bg-green-600">
                          <Shield className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <ShieldOff className="h-3 w-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.mfaEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisableMfa(user)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Disable MFA"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Disable MFA for User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disable two-factor authentication for{" "}
              <strong>
                {userToDisable?.firstName} {userToDisable?.lastName} (@{userToDisable?.username})
              </strong>
              ?
              <br />
              <br />
              This will remove their MFA requirement and they will only need their username and password to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setUserToDisable(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisableMfa}
              disabled={disableMfaMutation.isPending}
            >
              {disableMfaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable MFA"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
