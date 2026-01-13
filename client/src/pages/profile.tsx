import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, MapPin, Calendar, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [location] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    // Check if password change is required via URL parameter or user data
    const params = new URLSearchParams(window.location.search);
    const requiresChange = params.get('changePassword') === 'true' || user?.forcePasswordChange === true;
    setForcePasswordChange(requiresChange);
  }, [user, location]);

  // Fetch user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      const response = await fetch('/api/me');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      setIsEditing(false);
      // Invalidate both queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.setQueryData(['/api/me'], { ...userData, user: updatedUser });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          forceChange: forcePasswordChange
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });

      // Redirect if this was a forced change
      if (forcePasswordChange) {
        setForcePasswordChange(false);
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    updateProfileMutation.mutate(data);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const userProfile = userData?.user || user; // Use fetched data or auth context user

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {forcePasswordChange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Password Change Required:</strong> Your administrator has required you to change your password.
            Please update your password below to continue using the system.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.username} />
                <AvatarFallback className="text-xl">
                  {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">
                {userProfile?.firstName} {userProfile?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">@{userProfile?.username}</p>
              <Badge variant="secondary" className="mt-2">
                {userProfile?.role || "User"}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{userProfile?.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{userProfile?.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{userProfile?.location || "Not provided"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Profile" : "Profile Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    defaultValue={userProfile?.firstName}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={userProfile?.lastName}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={userProfile?.email}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={userProfile?.phone}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={userProfile?.location}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  name="bio"
                  defaultValue={userProfile?.bio}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              {forcePasswordChange
                ? "You are required to change your password."
                : "Update your password if needed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">
                  Current Password {forcePasswordChange && <span className="text-muted-foreground text-xs">(not required)</span>}
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required={!forcePasswordChange}
                  disabled={forcePasswordChange}
                  placeholder={forcePasswordChange ? "Not required for forced reset" : ""}
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Saving..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}