import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Palette, 
  Settings as SettingsIcon, 
  Monitor, 
  Bell, 
  Shield, 
  Save,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/theme-provider";

const colorThemes = [
  { name: "Default", value: "default", primary: "230 60% 55%", primaryHex: "#3b82f6", secondary: "210 40% 98%" },
  { name: "Blue", value: "blue", primary: "221 83% 53%", primaryHex: "#2563eb", secondary: "210 40% 98%" },
  { name: "Green", value: "green", primary: "142 71% 45%", primaryHex: "#059669", secondary: "138 76% 97%" },
  { name: "Purple", value: "purple", primary: "262 83% 58%", primaryHex: "#7c3aed", secondary: "270 20% 98%" },
  { name: "Red", value: "red", primary: "0 84% 60%", primaryHex: "#dc2626", secondary: "355 100% 97%" },
  { name: "Orange", value: "orange", primary: "24 95% 53%", primaryHex: "#ea580c", secondary: "33 100% 97%" },
  { name: "Yellow", value: "yellow", primary: "43 96% 56%", primaryHex: "#ca8a04", secondary: "48 100% 97%" },
  { name: "Pink", value: "pink", primary: "322 81% 64%", primaryHex: "#db2777", secondary: "322 100% 97%" },
  { name: "Teal", value: "teal", primary: "173 58% 39%", primaryHex: "#0d9488", secondary: "180 100% 97%" },
  { name: "Indigo", value: "indigo", primary: "239 84% 67%", primaryHex: "#4f46e5", secondary: "239 100% 97%" },
  { name: "Cyan", value: "cyan", primary: "189 94% 43%", primaryHex: "#0891b2", secondary: "189 100% 97%" },
  { name: "Amber", value: "amber", primary: "43 96% 56%", primaryHex: "#d97706", secondary: "43 100% 97%" },
];

export default function Settings() {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  
  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    siteName: "",
    siteUrl: "",
    organizationName: "",
    adminEmail: "",
  });



  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    enableTwoFactor: false,
    autoLogout: true,
    sessionTimeout: "30",
    passwordMinLength: "8",
    requirePasswordComplexity: true,
    maxLoginAttempts: "5",
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    assetCheckoutAlerts: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      return await response.json();
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/settings', data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update settings' }));
        throw new Error(errorData.message || 'Failed to update settings');
      }
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Settings update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const applyColorTheme = (themeName: string) => {
    setColorTheme(themeName);

    const selectedTheme = colorThemes.find(t => t.value === themeName);
    toast({
      title: "Theme Applied",
      description: `${selectedTheme?.name} theme has been applied.`,
    });
  };

  const saveSystemSettings = () => {
    const settingsData = {
      siteName: systemSettings.siteName,
      siteUrl: systemSettings.siteUrl,
      companyName: systemSettings.organizationName,
      companyEmail: systemSettings.adminEmail,
    };
    console.log('Saving system settings:', settingsData);
    updateSettingsMutation.mutate(settingsData);
  };

  const saveSecuritySettings = () => {
    const settingsData = {
      enableTwoFactor: securitySettings.enableTwoFactor,
      autoLogout: securitySettings.autoLogout,
      lockoutDuration: parseInt(securitySettings.sessionTimeout) || 30,
      passwordMinLength: parseInt(securitySettings.passwordMinLength) || 8,
      requireSpecialChar: securitySettings.requirePasswordComplexity,
      maxLoginAttempts: parseInt(securitySettings.maxLoginAttempts) || 5,
    };
    console.log('Saving security settings:', settingsData);
    updateSettingsMutation.mutate(settingsData);
  };

  const saveNotificationSettings = () => {
    const settingsData = {
      enableAdminNotifications: notificationSettings.emailNotifications,
      lowStockAlerts: notificationSettings.lowStockAlerts,
      notifyOnCheckout: notificationSettings.assetCheckoutAlerts,
      notifyOnCheckin: notificationSettings.assetCheckoutAlerts,
    };
    console.log('Saving notification settings:', settingsData);
    updateSettingsMutation.mutate(settingsData);
  };

  // Update states when settings are loaded
  useEffect(() => {
    if (settings) {
      setSystemSettings({
        siteName: settings.siteName || "",
        siteUrl: settings.siteUrl || "",
        organizationName: settings.companyName || "",
        adminEmail: settings.companyEmail || "",
      });

      setSecuritySettings({
        enableTwoFactor: settings.enableTwoFactor || false,
        autoLogout: settings.autoLogout !== undefined ? settings.autoLogout : true,
        sessionTimeout: String(settings.lockoutDuration || 30),
        passwordMinLength: String(settings.passwordMinLength || 8),
        requirePasswordComplexity: settings.requireSpecialChar !== undefined ? settings.requireSpecialChar : true,
        maxLoginAttempts: String(settings.maxLoginAttempts || 5),
      });

      setNotificationSettings({
        emailNotifications: settings.enableAdminNotifications !== undefined ? settings.enableAdminNotifications : true,
        lowStockAlerts: settings.lowStockAlerts !== undefined ? settings.lowStockAlerts : true,
        assetCheckoutAlerts: settings.notifyOnCheckout !== undefined ? settings.notifyOnCheckout : true,
      });
    }
  }, [settings]);

  useEffect(() => {
    // Apply saved color theme on load
    const savedColorTheme = localStorage.getItem("colorTheme");
    if (savedColorTheme) {
      const selectedTheme = colorThemes.find(t => t.value === savedColorTheme);
      if (selectedTheme) {
        document.documentElement.style.setProperty("--primary", selectedTheme.primary);
        document.documentElement.style.setProperty("--secondary", selectedTheme.secondary);
        document.documentElement.style.setProperty("--ring", selectedTheme.primary);
        document.documentElement.style.setProperty("--chart-1", selectedTheme.primary);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Badge variant="secondary">
          <SettingsIcon className="h-3 w-3 mr-1" />
          System Configuration
        </Badge>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the appearance of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme Mode</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </div>
                  </div>
                  <Switch 
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => {
                      const newTheme = checked ? "dark" : "light";
                      setTheme(newTheme);
                      toast({
                        title: "Theme Updated",
                        description: `Switched to ${newTheme} mode`,
                      });
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Color Theme Selection */}
              <div className="space-y-4">
                <Label className="text-base">Color Theme</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {colorThemes.map((themeOption) => (
                    <Button
                      key={themeOption.value}
                      variant={colorTheme === themeOption.value ? "default" : "outline"}
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => applyColorTheme(themeOption.value)}
                    >
                      <div
                        className="w-6 h-6 rounded-full mb-2"
                        style={{ backgroundColor: themeOption.primaryHex }}
                      />
                      <span className="text-xs">{themeOption.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="h-5 w-5 mr-2" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={systemSettings.siteName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={systemSettings.siteUrl}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    value={systemSettings.organizationName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, organizationName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={systemSettings.adminEmail}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                  />
                </div>
              </div>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  saveSystemSettings();
                }} 
                disabled={updateSettingsMutation.isPending}
                type="button"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {updateSettingsMutation.isPending ? "Saving..." : "Save System Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive email notifications for system events
                  </div>
                </div>
                <Switch 
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Low Stock Alerts</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified when inventory is running low
                  </div>
                </div>
                <Switch 
                  checked={notificationSettings.lowStockAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, lowStockAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Asset Checkout Alerts</Label>
                  <div className="text-sm text-muted-foreground">
                    Notifications for asset checkouts and returns
                  </div>
                </div>
                <Switch 
                  checked={notificationSettings.assetCheckoutAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, assetCheckoutAlerts: checked }))
                  }
                />
              </div>

              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  saveNotificationSettings();
                }} 
                disabled={updateSettingsMutation.isPending}
                type="button"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {updateSettingsMutation.isPending ? "Saving..." : "Save Notification Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <div className="text-sm text-muted-foreground">
                    Add an extra layer of security using SingleID Authenticator app by Samsung SDS
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    window.location.href = '/mfa-setup';
                  }}
                >
                  Setup MFA
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-logout</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically logout after period of inactivity
                  </div>
                </div>
                <Switch 
                  checked={securitySettings.autoLogout}
                  onCheckedChange={(checked) => 
                    setSecuritySettings(prev => ({ ...prev, autoLogout: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Select 
                    value={securitySettings.sessionTimeout} 
                    onValueChange={(value) => 
                      setSecuritySettings(prev => ({ ...prev, sessionTimeout: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Minimum Password Length</Label>
                  <Input
                    type="number"
                    min="6"
                    max="20"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => 
                      setSecuritySettings(prev => ({ ...prev, passwordMinLength: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label>Maximum Login Attempts</Label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => 
                      setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Password Complexity</Label>
                  <div className="text-sm text-muted-foreground">
                    Require uppercase, lowercase, numbers, and special characters
                  </div>
                </div>
                <Switch 
                  checked={securitySettings.requirePasswordComplexity}
                  onCheckedChange={(checked) => 
                    setSecuritySettings(prev => ({ ...prev, requirePasswordComplexity: checked }))
                  }
                />
              </div>

              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  saveSecuritySettings();
                }} 
                disabled={updateSettingsMutation.isPending}
                type="button"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {updateSettingsMutation.isPending ? "Saving..." : "Save Security Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}