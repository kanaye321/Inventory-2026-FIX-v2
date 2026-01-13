import React, { useState, useEffect, lazy } from "react";
import ReactDOM from "react-dom/client";
import { Switch, Route, Router, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

// Import actual pages
import AuthPage from "@/pages/auth-page";
import Setup from "@/pages/setup";
import Dashboard from "@/pages/dashboard";
import DashboardNew from "@/pages/dashboard-new";
import Assets from "@/pages/assets";
import AssetDetails from "@/pages/asset-details";
import Accessories from "@/pages/accessories";
import Licenses from "@/pages/licenses";
import LicenseDetails from "@/pages/license-details";
import ITEquipment from "@/pages/it-equipment";
import ITEquipmentDetails from "@/pages/it-equipment-details";
import Users from "@/pages/users";
import UserDetails from "@/pages/user-details";
import Activities from "@/pages/activities";
import Components from "@/pages/components";
import Consumables from "@/pages/consumables";
import ConsumableDetails from "@/pages/consumable-details";
import VMInventory from "@/pages/vm-inventory";
import ServersMonitoring from "@/pages/servers-monitoring";
import BitlockerKeys from "@/pages/bitlocker-keys";
import MonitorInventory from "@/pages/monitor-inventory";
import IAMAccounts from "@/pages/iam-accounts";
import UserManual from "@/pages/user-manual";
import Reports from "@/pages/reports";
import ReportsSecondary from "@/pages/reports-secondary";
import UserManagement from "@/pages/user-management";
import UserPermissions from "@/pages/admin/user-permissions";
import MfaManagement from "@/pages/admin/mfa-management";
import PasswordManagement from "@/pages/admin/password-management";
import AccountManagement from "@/pages/admin/account-management";
import SystemSetup from "@/pages/admin/system-setup";
import DatabaseManagementPage from "@/pages/admin/database";
import DataEncryptionPage from "@/pages/admin/data-encryption";
import SystemLogsPage from "@/pages/system-logs";
import EmailNotificationsPage from "@/pages/email-notifications";
import Profile from "@/pages/profile";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import MfaSetup from "@/pages/mfa-setup";
import ReportIssue from "@/pages/report-issue";
import JiraSettings from "@/pages/admin/jira-settings";
import JiraDashboard from "@/pages/jira-dashboard";
import NotFound from "@/pages/not-found";
// Import Page Builder and Custom Page components
import PageBuilder from "@/pages/admin/page-builder";
import CustomPage from "@/pages/custom-page";
import AzureInventory from "./pages/azure-inventory";
import GcpInventory from "./pages/gcp-inventory";
import AwsInventory from "./pages/aws-inventory";


// This import ensures the custom page component is available

// Import Secret Garden page
import SecretGarden from "@/pages/secret-garden";

// Import Approval Monitoring page
import ApprovalMonitoring from "@/pages/approval-monitoring";

// Import Email Bulk Sender Page
import EmailBulkSenderPage from "@/pages/email-bulk-sender";

import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";
import { FloatingChatbot } from "@/components/chatbot/floating-chatbot";
import ProtectedRoute from "@/lib/protected-route";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Always call all hooks before any conditional returns
  const { data: mfaStatus, isLoading: mfaLoading, error: mfaError } = useQuery({
    queryKey: ['/api/mfa/status'],
    enabled: !!user, // Only run query when user exists
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      if (!user) {
        console.log('No user found, skipping MFA status check');
        return null;
      }

      console.log('Fetching MFA status for user:', user?.username);

      // Add a small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 200));

      const response = await fetch('/api/mfa/status', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        console.error('MFA status fetch failed:', response.status, response.statusText);
        if (response.status === 401) {
          console.log('User not authenticated when checking MFA status');
          return null;
        }
        throw new Error(`Failed to fetch MFA status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MFA status received:', data);
      return data;
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    const currentTheme = localStorage.getItem('vite-ui-theme') || 'system';
    if (currentTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, []);

  // Now handle conditional rendering after all hooks are called
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Switch location={location}>
          <Route path="/setup" component={Setup} />
          <Route path="/login" component={AuthPage} />
          <Route path="*" component={AuthPage} />
        </Switch>
      </div>
    );
  }

  // Show loading while checking MFA status
  if (mfaLoading) {
    console.log('Loading MFA status...');
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking security settings...</p>
          </div>
        </div>
      </div>
    );
  }

  // If MFA status check failed, redirect to MFA setup as safety measure
  if (mfaError) {
    console.log('MFA status check failed, redirecting to MFA setup', mfaError);
    return (
      <div className="min-h-screen bg-background">
        <MfaSetup />
      </div>
    );
  }

  // Check if MFA is enabled - handle all possible states
  const mfaEnabled = mfaStatus?.enabled === true;

  console.log('MFA Check - Status:', mfaStatus, 'Enabled:', mfaEnabled, 'User:', user?.username, 'Location:', location);

  // If MFA is not enabled, force the user to set it up
  if (!mfaEnabled) {
    console.log('MFA not enabled, showing MFA setup page for user:', user?.username);
    return (
      <div className="min-h-screen bg-background">
        <MfaSetup />
      </div>
    );
  }

  // If MFA is enabled, show the AppLayout
  console.log('User authenticated with MFA enabled, showing app layout for user:', user?.username);
  console.log('Full user object:', JSON.stringify(user, null, 2));
  console.log('Current location:', location);

  // Verify we have complete user data
  if (!user || !user.username || !user.id) {
    console.error('ERROR: Incomplete user data detected:', {
      hasUser: !!user,
      hasUsername: !!user?.username,
      hasId: !!user?.id,
      user: user
    });

    // Try to recover by fetching user data again
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });

    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Session error. Please refresh the page.</p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ All checks passed, rendering AppLayout');
  return <AppLayout />;
}

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fetch custom pages to display in the sidebar
  const { data: customPages, isLoading: customPagesLoading, error: customPagesError } = useQuery({
    queryKey: ['/api/custom-pages'],
    queryFn: async () => {
      const response = await fetch('/api/custom-pages');
      if (!response.ok) {
        throw new Error('Failed to fetch custom pages');
      }
      return response.json();
    },
  });

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleMobileSidebarToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        className={`hidden lg:flex flex-shrink-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        isCollapsed={isSidebarCollapsed}
        onToggle={handleSidebarToggle}
        customPages={customPages || []} // Pass custom pages to sidebar
        customPagesLoading={customPagesLoading}
        customPagesError={customPagesError}
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)}>
          <div className="w-64 h-full bg-background" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              isCollapsed={false}
              onToggle={() => setIsMobileSidebarOpen(false)}
              customPages={customPages || []} // Pass custom pages to sidebar
              customPagesLoading={customPagesLoading}
              customPagesError={customPagesError}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onSidebarToggle={handleMobileSidebarToggle} />

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6">
            <ErrorBoundary>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/dashboard-new" component={DashboardNew} />
              <Route path="/assets" component={Assets} />
              <Route path="/assets/:id" component={AssetDetails} />
              <Route path="/accessories" component={Accessories} />
              <Route path="/licenses" component={Licenses} />
              <Route path="/licenses/:id" component={LicenseDetails} />
              <Route path="/it-equipment" component={ITEquipment} />
              <Route path="/it-equipment/:id" component={ITEquipmentDetails} />
              <Route path="/users" component={Users} />
              <Route path="/users/:id" component={UserDetails} />
              <Route path="/activities" component={Activities} />
              <Route path="/components" component={Components} />
              <Route path="/consumables" component={Consumables} />
              <Route path="/consumables/:id" component={ConsumableDetails} />
              <Route path="/vm-inventory" component={VMInventory} />
              <Route path="/servers-monitoring" component={ServersMonitoring} />
              <Route path="/bitlocker-keys" component={BitlockerKeys} />
              <Route path="/monitor-inventory" component={MonitorInventory} />
              <Route path="/azure-inventory" component={AzureInventory} />
              <Route path="/gcp-inventory" component={GcpInventory} />
              <Route path="/aws-inventory" component={AwsInventory} />
              <Route path="/iam-accounts" component={IAMAccounts} />
              <Route path="/user-manual" component={UserManual} />
              <Route path="/reports" component={Reports} />
              <Route path="/reports-secondary" component={ReportsSecondary} />
              <Route path="/user-management" component={UserManagement} />
              <Route path="/settings" component={Settings} />
              <Route path="/report-issue" component={ReportIssue} />
              <Route path="/profile" component={Profile} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/email-bulk-sender">
                <EmailBulkSenderPage />
              </Route>
              <Route path="/admin/user-permissions">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <UserPermissions />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/mfa-management">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <MfaManagement />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/password-management">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <PasswordManagement />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/account-management">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <AccountManagement />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/system-setup">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <SystemSetup />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/database">
                <ProtectedRoute requireAdmin>
                  <DatabaseManagementPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/data-encryption">
                <ProtectedRoute requireAdmin>
                  <DataEncryptionPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/jira-settings">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <JiraSettings />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/system-logs">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <SystemLogsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/email-notifications">
                <ProtectedRoute
                  requireAdmin={true}
                  requiredPermission={{ resource: 'admin', action: 'view' }}
                >
                  <EmailNotificationsPage />
                </ProtectedRoute>
              </Route>
              {/* Page Builder and Custom Page Routes */}
              <Route path="/admin/page-builder">
                <ProtectedRoute requireAdmin>
                  <PageBuilder />
                </ProtectedRoute>
              </Route>
              {/* Dynamically register custom page routes */}
              {customPages && customPages.map(page => (
                <Route key={page.pageSlug} path={`/custom/${page.pageSlug}`}>
                  <CustomPage pageData={page} />
                </Route>
              ))}
              <Route path="/secret-garden" component={SecretGarden} />
              {/* Approval Monitoring Route */}
              <Route path="/approval-monitoring" component={ApprovalMonitoring} />
              <Route path="/jira-dashboard" component={JiraDashboard} />
              <Route path="/custom/:slug" component={CustomPage} />
              <Route component={NotFound} />
            </Switch>
            </ErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>

      {/* Floating Chatbot */}
      <FloatingChatbot />
    </div>
  );
}

function App() {
  // Apply saved color scheme on app load
  React.useEffect(() => {
    const savedColorScheme = localStorage.getItem('color-scheme');
    if (savedColorScheme) {
      const root = document.documentElement;
      switch(savedColorScheme) {
        case 'default':
          root.style.setProperty('--primary', '221.2 83.2% 53.3%');
          root.style.setProperty('--primary-foreground', '210 40% 98%');
          break;
        case 'green':
          root.style.setProperty('--primary', '142 71% 45%');
          root.style.setProperty('--primary-foreground', '144 100% 99%');
          break;
        case 'red':
          root.style.setProperty('--primary', '0 84% 60%');
          root.style.setProperty('--primary-foreground', '0 100% 99%');
          break;
        case 'purple':
          root.style.setProperty('--primary', '262 83% 58%');
          root.style.setProperty('--primary-foreground', '265 100% 99%');
          break;
        case 'orange':
          root.style.setProperty('--primary', '24 95% 53%');
          root.style.setProperty('--primary-foreground', '25 100% 99%');
          break;
        case 'teal':
          root.style.setProperty('--primary', '173 58% 39%');
          root.style.setProperty('--primary-foreground', '180 100% 99%');
          break;
        case 'indigo':
          root.style.setProperty('--primary', '239 84% 67%');
          root.style.setProperty('--primary-foreground', '239 100% 99%');
          break;
        case 'pink':
          root.style.setProperty('--primary', '322 81% 64%');
          root.style.setProperty('--primary-foreground', '322 100% 99%');
          break;
        case 'cyan':
          root.style.setProperty('--primary', '189 94% 43%');
          root.style.setProperty('--primary-foreground', '189 100% 99%');
          break;
        case 'amber':
          root.style.setProperty('--primary', '43 96% 56%');
          root.style.setProperty('--primary-foreground', '43 100% 99%');
          break;
      }
    }
  }, []);

  return (
    <Router>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground">
              <AppContent />
            </div>
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </Router>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);