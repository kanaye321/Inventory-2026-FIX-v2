import React, { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from "@tanstack/react-query";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAdmin?: boolean;
  requiredPermission?: {
    resource: string;
    action: 'view' | 'edit' | 'add' | 'delete';
  };
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAdmin = false,
  requiredPermission
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Check MFA status
  const { data: mfaStatus, isLoading: mfaLoading } = useQuery({
    queryKey: ['/api/mfa/status'],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch('/api/mfa/status', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch MFA status');
      return response.json();
    }
  });


  if (loading || mfaLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  // Enforce MFA setup - redirect to MFA setup if not enabled
  if (mfaStatus && !mfaStatus.enabled && location !== '/mfa-setup') {
    setLocation('/mfa-setup');
    return null;
  }

  // Debug logging
  console.log('ProtectedRoute check for user:', {
    username: user.username,
    isAdmin: user.isAdmin,
    roleId: user.roleId,
    permissions: user.permissions,
    requireAdmin,
    requiredPermission,
    allowedRoles
  });

  // Check admin access - allow if user is admin OR has admin permissions
  if (requireAdmin) {
    const hasAdminAccess = user.isAdmin === true || (user.permissions?.admin?.view === true);
    console.log('Admin access check:', {
      hasAdminAccess,
      isAdmin: user.isAdmin,
      isAdminType: typeof user.isAdmin,
      adminPermissions: user.permissions?.admin
    });

    if (!hasAdminAccess) {
      console.log('Admin access denied, redirecting to dashboard');
      setLocation('/dashboard');
      return null;
    }
  }

  // Check specific permission requirement
  if (requiredPermission) {
    const { resource, action } = requiredPermission;

    // Admin always has access
    if (user.isAdmin) {
      console.log('Permission granted: User is admin');
    } else {
      // Check user permissions
      const hasPermission = user.permissions?.[resource]?.[action] === true;
      console.log('Permission check:', {
        resource,
        action,
        hasPermission,
        userPermissions: user.permissions?.[resource]
      });

      if (!hasPermission) {
        console.log('Permission denied, redirecting to dashboard');
        setLocation('/dashboard');
        return null;
      }
    }
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.isAdmin ? 'admin' : 'user';
    if (!allowedRoles.includes(userRole)) {
      console.log('Role access denied:', { userRole, allowedRoles });
      setLocation('/dashboard');
      return null;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;