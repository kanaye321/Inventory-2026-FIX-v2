
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { KeyRound, Search, Loader2, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User } from "@shared/schema";

function PasswordManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number, password: string }) => {
      const response = await apiRequest("POST", `/api/admin/reset-password/${userId}`, { 
        password,
        forceChange: forceChangeOnLogin 
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
      return response.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsResetDialogOpen(false);
      setUserToReset(null);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password reset successfully",
        description: forceChangeOnLogin 
          ? "User will be required to change password on next login."
          : "Password has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error resetting password",
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

  const handleResetPassword = () => {
    if (!userToReset) return;

    if (newPassword.length < 8) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: userToReset.id,
      password: newPassword
    });
  };

  const openResetDialog = (user: User) => {
    setUserToReset(user);
    setNewPassword("");
    setConfirmPassword("");
    setForceChangeOnLogin(true);
    setIsResetDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center">
          <KeyRound className="mr-3 h-8 w-8" />
          Password Management
        </h1>
        <p className="text-muted-foreground">Reset user passwords and enforce password policies</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Password Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8+ chars</div>
            <p className="text-xs text-muted-foreground">Minimum length</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MFA Protected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.mfaEnabled).length}</div>
            <p className="text-xs text-muted-foreground">Additional security</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admin Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.isAdmin).length}</div>
            <p className="text-xs text-muted-foreground">Elevated access</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Password Management</CardTitle>
          <CardDescription>Reset passwords and manage user authentication</CardDescription>
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
                          <Check className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetDialog(user)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Reset password for{" "}
              <strong>
                {userToReset?.firstName} {userToReset?.lastName} (@{userToReset?.username})
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters required
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forceChange"
                checked={forceChangeOnLogin}
                onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="forceChange" className="text-sm">
                Require user to change password on next login
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetDialogOpen(false);
                setUserToReset(null);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending || !newPassword || !confirmPassword}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PasswordManagement;
