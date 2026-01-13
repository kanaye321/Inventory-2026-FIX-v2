import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface User {
  id: string
  username: string
  firstName?: string
  lastName?: string
  email?: string
  department?: string
  isAdmin?: boolean
  roleId?: number | null
  permissions?: {
    [key: string]: {
      view: boolean;
      edit: boolean;
      add: boolean;
      delete?: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      console.log('Fetching user data from /api/user...');
      const res = await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        console.log('User fetch failed with status:', res.status, res.statusText);
        if (res.status === 401) {
          console.log('User not authenticated (401)');
          return null;
        }
        throw new Error(`Failed to fetch user: ${res.status}`);
      }
      const userData = await res.json();
      console.log('✅ User data from auth hook:', {
        id: userData?.id,
        username: userData?.username,
        isAdmin: userData?.isAdmin,
        roleId: userData?.roleId,
        mfaEnabled: userData?.mfaEnabled,
        hasPermissions: !!userData?.permissions,
        fullData: userData
      });
      
      // Validate user data
      if (!userData || !userData.id || !userData.username) {
        console.error('❌ Invalid user data received:', userData);
        throw new Error('Invalid user data received from server');
      }
      
      console.log('✅ User data validated successfully');
      return userData;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2000),
    staleTime: 0,
    gcTime: 0, // Don't cache the user data
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<number>(120); // Default 120 minutes
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Fetch session timeout setting
  useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/settings', {
          credentials: 'include'
        });
        if (!res.ok) {
          console.warn('Failed to fetch settings, using default timeout');
          return null;
        }
        const settings = await res.json();
        if (settings.sessionTimeout) {
          console.log('Session timeout set to:', settings.sessionTimeout, 'minutes');
          setSessionTimeout(settings.sessionTimeout);
        }
        return settings;
      } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleAutoLogout = useCallback(async () => {
    console.log('Auto-logout triggered due to inactivity');
    
    // Clear the timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if ((window as any).warningTimeoutRef) {
      clearTimeout((window as any).warningTimeoutRef);
    }
    
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'inactivity' })
      });
    } catch (error) {
      console.error('Auto-logout failed:', error);
    }
    
    localStorage.removeItem('user');
    
    // Show notification
    toast({
      title: "Session Expired",
      description: "You have been automatically logged out due to inactivity.",
      variant: "destructive",
      duration: 5000,
    });
    
    // Redirect after showing notification
    setTimeout(() => {
      window.location.href = '/auth';
    }, 2000);
  }, [toast]);

  const resetTimeout = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout in milliseconds (sessionTimeout is in minutes)
    const timeoutMs = sessionTimeout * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60000, timeoutMs * 0.9); // Warn 1 minute before or at 90% of timeout
    
    // Clear any existing warning timeout
    if ((window as any).warningTimeoutRef) {
      clearTimeout((window as any).warningTimeoutRef);
    }
    
    // Set warning notification
    (window as any).warningTimeoutRef = setTimeout(() => {
      toast({
        title: "Session Expiring Soon",
        description: "Your session will expire in 1 minute due to inactivity. Move your mouse to stay logged in.",
        variant: "default",
        duration: 10000,
      });
    }, warningMs);
    
    // Set auto-logout timeout
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, timeoutMs);
  }, [user, sessionTimeout, handleAutoLogout, toast]);

  // Track user activity
  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    const handleActivity = () => {
      const now = Date.now();
      // Only reset if at least 1 second has passed since last activity
      if (now - lastActivityRef.current > 1000) {
        console.log('User activity detected, resetting timeout');
        resetTimeout();
      }
    };

    // Set initial timeout
    resetTimeout();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimeout]);

  useEffect(() => {
    if (!isLoading && error === null) { // User is successfully loaded or not logged in
      setAuthLoading(false);
    } else if (!isLoading && error !== null) { // Error occurred during fetch
      console.error("Error fetching user:", error);
      setAuthLoading(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if ((window as any).warningTimeoutRef) {
        clearTimeout((window as any).warningTimeoutRef);
      }
    };
  }, [isLoading, error]);


  const login = (userData: User) => {
    console.log('Login - storing user data:', userData)
    localStorage.setItem('user', JSON.stringify(userData));
    // Redirect to dashboard instead of reloading
    window.location.href = '/';
  }

  const logout = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
    console.log('Logout - clearing user data')
    localStorage.removeItem('user');
    // Force a page reload to clear all cached data and redirect to auth
    window.location.href = '/auth';
  }

  const contextValue: AuthContextType = {
    user: user || null, // Ensure user is null if data is undefined or null
    login,
    logout,
    loading: authLoading
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}