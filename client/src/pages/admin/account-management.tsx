
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Shield, 
  Lock, 
  KeyRound,
  UserCog,
  ArrowRight,
  Settings
} from "lucide-react";

export default function AccountManagement() {
  const [, setLocation] = useLocation();

  // Fetch users for stats
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch roles for stats
  const { data: roles = [] } = useQuery({
    queryKey: ['/api/roles'],
  });

  // Calculate stats
  const totalUsers = users.length;
  const mfaEnabledUsers = users.filter((user: any) => user.mfaEnabled).length;
  const customRoles = roles.filter((role: any) => !role.isSystem).length;
  const adminUsers = users.filter((user: any) => user.isAdmin).length;

  const managementCards = [
    {
      title: "User Management",
      description: "Create, edit, and manage user accounts. Assign roles and control user access.",
      icon: Users,
      route: "/user-management",
      color: "from-blue-500 to-indigo-600",
      features: [
        "Create new user accounts",
        "Edit user information",
        "Assign roles and departments",
        "Activate/deactivate accounts"
      ]
    },
    {
      title: "MFA Management",
      description: "Manage two-factor authentication settings for users. Enable or disable MFA.",
      icon: Shield,
      route: "/admin/mfa-management",
      color: "from-emerald-500 to-teal-600",
      features: [
        "View MFA status for all users",
        "Disable MFA for locked accounts",
        "Monitor MFA adoption",
        "Security compliance tracking"
      ]
    },
    {
      title: "User Permissions",
      description: "Configure granular permissions and access control for users and roles.",
      icon: Lock,
      route: "/admin/user-permissions",
      color: "from-purple-500 to-violet-600",
      features: [
        "Set module-level permissions",
        "Create custom roles",
        "Assign permissions to users",
        "View permission reports"
      ]
    },
    {
      title: "Password Management",
      description: "Reset passwords, enforce password policies, and manage account security.",
      icon: KeyRound,
      route: "/admin/password-management",
      color: "from-orange-500 to-red-600",
      features: [
        "Reset user passwords",
        "Force password changes",
        "View password history",
        "Set password policies"
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
            <p className="text-muted-foreground">
              Centralized hub for managing user accounts, permissions, and security settings
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MFA Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mfaEnabledUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsers > 0 ? `${Math.round((mfaEnabledUsers / totalUsers) * 100)}% compliance` : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custom Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customRoles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Permission groups
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Full access accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {managementCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center shadow-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{card.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {card.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Key Features:</p>
                  <ul className="space-y-1">
                    {card.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={() => setLocation(card.route)}
                  className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 transition-opacity`}
                >
                  Open {card.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Settings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Account Settings & Policies</CardTitle>
          </div>
          <CardDescription>
            Configure global account policies and security requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Password Policies</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Minimum length: 8 characters</li>
                <li>• Require uppercase letters</li>
                <li>• Require special characters</li>
                <li>• Password expiration: 90 days</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">MFA Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Mandatory for admin accounts</li>
                <li>• Optional for standard users</li>
                <li>• Microsoft Authenticator supported</li>
                <li>• Emergency access procedures</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Session Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Session timeout: 30 minutes</li>
                <li>• Concurrent sessions: Limited</li>
                <li>• Auto-logout on inactivity</li>
                <li>• Remember device option</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
