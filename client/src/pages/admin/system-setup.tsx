import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings, 
  MailCheck, 
  Globe, 
  Image, 
  FileText, 
  ShieldAlert, 
  Bell, 
  Database, 
  Server,
  Save,
  RefreshCw,
  FileWarning,
  ArrowUpCircle,
  Loader2
} from "lucide-react";

// System settings schema
const systemSettingsSchema = z.object({
  // General Settings
  siteName: z.string().min(2, "Site name must be at least 2 characters"),
  siteUrl: z.string().url("Must be a valid URL"),
  defaultLanguage: z.string(),
  defaultTimezone: z.string(),
  allowPublicRegistration: z.boolean().default(false),

  // Company Information
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyAddress: z.string().optional(),
  companyContact: z.string().optional(),
  companyLogo: z.string().optional(),

  // Email Settings
  emailSender: z.string().email("Must be a valid email"),
  smtpServer: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecurity: z.string().optional(),

  // Asset Settings
  assetTagPrefix: z.string().optional(),
  enableCheckin: z.boolean().default(true),
  enableAssetWarranties: z.boolean().default(true),
  enableDepreciation: z.boolean().default(true),

  // Security Settings
  sessionTimeout: z.string(),
  loginAttempts: z.string(),

  // Notification Settings
  enableEmailNotifications: z.boolean().default(true),
  notifyOnCheckin: z.boolean().default(true),
  notifyOnCheckout: z.boolean().default(true),
  notifyOnExpiration: z.boolean().default(true),
  expirationLeadTime: z.string(),
});

type SystemSettingsFormValues = z.infer<typeof systemSettingsSchema>;

// List of available timezones - simplified for this example
const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

// List of available languages
const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
];

export default function SystemSetupPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();

  // Default values for form - will be replaced with actual settings from API
  const defaultValues: SystemSettingsFormValues = {
    siteName: "SRPH-MIS",
    siteUrl: "",
    defaultLanguage: "en",
    defaultTimezone: "UTC",
    allowPublicRegistration: false,

    companyName: "SRPH - School of Public Health",
    companyAddress: "",
    companyContact: "",
    companyLogo: "",

    emailSender: "",
    smtpServer: "",
    smtpPort: "587",
    smtpUsername: "",
    smtpPassword: "",
    smtpSecurity: "tls",

    assetTagPrefix: "SRPH",
    enableCheckin: true,
    enableAssetWarranties: true,
    enableDepreciation: true,

    sessionTimeout: "120",
    loginAttempts: "5",

    enableEmailNotifications: true,
    notifyOnCheckin: true,
    notifyOnCheckout: true,
    notifyOnExpiration: true,
    expirationLeadTime: "30",
  };

  // Set up the form with react-hook-form and zod validation
  const form = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues,
  });

  // Fetch settings from API
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      return response.json();
    },
    retry: 2,
    retryDelay: 1000
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      const formData = {
        siteName: settings.siteName || defaultValues.siteName,
        siteUrl: settings.siteUrl || defaultValues.siteUrl,
        defaultLanguage: settings.defaultLanguage || defaultValues.defaultLanguage,
        defaultTimezone: settings.defaultTimezone || defaultValues.defaultTimezone,
        allowPublicRegistration: settings.allowPublicRegistration || false,

        companyName: settings.companyName || defaultValues.companyName,
        companyAddress: settings.companyAddress || defaultValues.companyAddress,
        companyContact: settings.companyEmail || defaultValues.companyContact,
        companyLogo: settings.companyLogo || defaultValues.companyLogo,

        emailSender: settings.mailFromAddress || defaultValues.emailSender,
        smtpServer: settings.mailHost || defaultValues.smtpServer,
        smtpPort: settings.mailPort || defaultValues.smtpPort,
        smtpUsername: settings.mailUsername || defaultValues.smtpUsername,
        smtpPassword: settings.mailPassword || defaultValues.smtpPassword,
        smtpSecurity: "tls",

        assetTagPrefix: settings.assetTagPrefix || defaultValues.assetTagPrefix,
        enableCheckin: true,
        enableAssetWarranties: true,
        enableDepreciation: true,

        sessionTimeout: settings.sessionTimeout?.toString() || defaultValues.sessionTimeout,
        loginAttempts: settings.maxLoginAttempts?.toString() || defaultValues.loginAttempts,

        enableEmailNotifications: settings.enableAdminNotifications || defaultValues.enableEmailNotifications,
        notifyOnCheckin: settings.notifyOnCheckin || defaultValues.notifyOnCheckin,
        notifyOnCheckout: settings.notifyOnCheckout || defaultValues.notifyOnCheckout,
        notifyOnExpiration: settings.notifyOnOverdue || defaultValues.notifyOnExpiration,
        expirationLeadTime: "30",
      };

      console.log('Updating form with settings:', formData);
      form.reset(formData);
    }
  }, [settings, form]);

  // System settings update mutation using real API
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettingsFormValues) => {
      // Map form data to API format
      const apiSettings = {
        siteName: data.siteName,
        siteUrl: data.siteUrl,
        defaultLanguage: data.defaultLanguage,
        defaultTimezone: data.defaultTimezone,
        allowPublicRegistration: data.allowPublicRegistration,

        companyName: data.companyName,
        companyAddress: data.companyAddress,
        companyEmail: data.companyContact,
        companyLogo: data.companyLogo,

        mailFromAddress: data.emailSender,
        mailHost: data.smtpServer,
        mailPort: data.smtpPort,
        mailUsername: data.smtpUsername,
        mailPassword: data.smtpPassword,
        mailFromName: data.companyName,

        assetTagPrefix: data.assetTagPrefix,
        assetAutoIncrement: true,

        enableLoginAttempts: true,
        maxLoginAttempts: parseInt(data.loginAttempts),
        sessionTimeout: parseInt(data.sessionTimeout),

        enableAdminNotifications: data.enableEmailNotifications,
        enableUserNotifications: data.enableEmailNotifications,
        notifyOnCheckin: data.notifyOnCheckin,
        notifyOnCheckout: data.notifyOnCheckout,
        notifyOnOverdue: data.notifyOnExpiration,

        automaticBackups: true,
        backupFrequency: "daily",
        maintenanceMode: false
      };

      // Send settings to API
      const response = await apiRequest('POST', '/api/settings', apiSettings);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch settings to update the form
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });

      toast({
        title: "Settings saved",
        description: "Your system settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Settings update error:', error);
      toast({
        title: "Error",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handlers for individual tab saves
  const saveGeneralSettings = () => {
    form.trigger(['siteName', 'siteUrl', 'defaultLanguage', 'defaultTimezone', 'allowPublicRegistration']);
    const generalData = form.getValues();
    updateSettingsMutation.mutate({ ...generalData });
  };

  const saveCompanySettings = () => {
    form.trigger(['companyName', 'companyAddress', 'companyContact', 'companyLogo']);
    const companyData = form.getValues();
    updateSettingsMutation.mutate({ ...companyData });
  };

  const saveEmailSettings = () => {
    form.trigger(['emailSender', 'smtpServer', 'smtpPort', 'smtpUsername', 'smtpPassword', 'smtpSecurity']);
    const emailData = form.getValues();
    updateSettingsMutation.mutate({ ...emailData });
  };

  const saveAssetSettings = () => {
    form.trigger(['assetTagPrefix', 'enableCheckin', 'enableAssetWarranties', 'enableDepreciation']);
    const assetData = form.getValues();
    updateSettingsMutation.mutate({ ...assetData });
  };

  const saveSecuritySettings = () => {
    form.trigger(['sessionTimeout', 'loginAttempts']);
    const securityData = form.getValues();
    updateSettingsMutation.mutate({ ...securityData });
  };

  const saveNotificationSettings = () => {
    form.trigger(['enableEmailNotifications', 'notifyOnCheckin', 'notifyOnCheckout', 'notifyOnExpiration', 'expirationLeadTime']);
    const notificationData = form.getValues();
    updateSettingsMutation.mutate({ ...notificationData });
  };

  // Test email configuration
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-email');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email test successful",
        description: "Test email sent successfully. Check your inbox.",
      });
    },
    onError: (error) => {
      toast({
        title: "Email test failed",
        description: "Could not send test email. Please check your configuration.",
        variant: "destructive",
      });
    }
  });

  // Server restart mutation
  const restartServerMutation = useMutation({
    mutationFn: async () => {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Server restarted",
        description: "The application server has been restarted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error restarting the server. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Server update mutation
  const updateServerMutation = useMutation({
    mutationFn: async () => {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Server updated",
        description: "The application has been updated to the latest version.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error updating the server. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Database backup mutation
  const backupDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/database/backup');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Database backup created",
        description: "Database backup has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Backup failed",
        description: "Could not create database backup. Please try again.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Settings className="mr-3 h-8 w-8" />
          System Setup
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid grid-cols-7 w-full min-w-[700px]">
            <TabsTrigger value="general" className="flex items-center text-xs sm:text-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center text-xs sm:text-sm">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center text-xs sm:text-sm">
              <MailCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center text-xs sm:text-sm">
              <ShieldAlert className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center text-xs sm:text-sm">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center text-xs sm:text-sm">
              <Server className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Maintenance</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <Form {...form}>
          <div className="space-y-6">
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure basic system settings like site name, URL, and default preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of your inventory management system.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="siteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://your-domain.com" />
                        </FormControl>
                        <FormDescription>
                          The URL where your system is accessible.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="defaultLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Language</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languages.map((language) => (
                                <SelectItem key={language.code} value={language.code}>
                                  {language.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default language for the interface.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defaultTimezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Timezone</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezones.map((timezone) => (
                                <SelectItem key={timezone} value={timezone}>
                                  {timezone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default timezone for dates and times.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="allowPublicRegistration"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Allow Public Registration
                          </FormLabel>
                          <FormDescription>
                            Allow users to register themselves for an account.
                          </FormDescription>
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
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={saveGeneralSettings}
                    className="flex items-center"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save General Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Configure information about your organization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Information</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="email@example.com or phone number" />
                        </FormControl>
                        <FormDescription>
                          Email, phone numbers, or website
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/logo.png" />
                        </FormControl>
                        <FormDescription>
                          Link to your company logo (recommended size: 200x50px)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={saveCompanySettings}
                    className="flex items-center"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Company Information
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>
                    Configure email settings for notifications and alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emailSender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sender Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="noreply@example.com" />
                        </FormControl>
                        <FormDescription>
                          The email address that will be used as the sender for all system emails.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpServer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Server</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="smtp.gmail.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Port</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="587" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtpPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="smtpSecurity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select security option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="ssl">SSL</SelectItem>
                            <SelectItem value="tls">TLS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testEmailMutation.mutate()}
                      disabled={testEmailMutation.isPending}
                    >
                      {testEmailMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MailCheck className="h-4 w-4 mr-2" />
                      )}
                      Test Email Configuration
                    </Button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={saveEmailSettings}
                    className="flex items-center"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Email Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="assets">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Settings</CardTitle>
                  <CardDescription>
                    Configure how assets are handled in the system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assetTagPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Tag Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SRPH" />
                        </FormControl>
                        <FormDescription>
                          Prefix used when generating new asset tags.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableCheckin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Checkin/Checkout
                          </FormLabel>
                          <FormDescription>
                            Allow assets to be checked out to users and checked back in.
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="enableAssetWarranties"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Warranties
                          </FormLabel>
                          <FormDescription>
                            Track warranty information for assets.
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="enableDepreciation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Depreciation
                          </FormLabel>
                          <FormDescription>
                            Track asset depreciation over time.
                          </FormDescription>
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
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={saveAssetSettings}
                    className="flex items-center"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Asset Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Configure security-related settings for the application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Timeout (minutes)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" />
                          </FormControl>
                          <FormDescription>
                            Time in minutes before an inactive session expires and user is automatically logged out.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loginAttempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Login Attempts</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" />
                          </FormControl>
                          <FormDescription>
                            Maximum failed login attempts before account is locked.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={saveSecuritySettings}
                    className="flex items-center"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Security Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure email and system notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Send email notifications for important events.
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="notifyOnCheckin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notify on Checkin
                          </FormLabel>
                          <FormDescription>
                            Send notifications when assets are checked in.
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="notifyOnCheckout"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notify on Checkout
                          </FormLabel>
                          <FormDescription>
                            Send notifications when assets are checked out to users.
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="notifyOnExpiration"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notify on Expiration
                          </FormLabel>
                          <FormDescription>
                            Send notifications when licenses, warranties, or other expirables are about to expire.
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="expirationLeadTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Notification Lead Time (days)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormDescription>
                          Number of days before expiration to send notifications.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={saveNotificationSettings}
                    className="flex items-center"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Notification Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Server className="h-5 w-5 mr-2" />
                      Server Maintenance
                    </CardTitle>
                    <CardDescription>
                      Perform server maintenance operations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Server Status</h3>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Running normally</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last restarted: 7 days ago
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center"
                        onClick={() => restartServerMutation.mutate()}
                        disabled={restartServerMutation.isPending}
                      >
                        {restartServerMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Restart Server
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex items-center"
                        onClick={() => updateServerMutation.mutate()}
                        disabled={updateServerMutation.isPending}
                      >
                        {updateServerMutation.isPending ? (
                          <ArrowUpCircle className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                        )}
                        Update System
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Database Operations
                    </CardTitle>
                    <CardDescription>
                      Manage the application database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Database Status</h3>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Connected</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last backup: 1 day ago
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex items-center"
                        onClick={() => backupDatabaseMutation.mutate()}
                        disabled={backupDatabaseMutation.isPending}
                      >
                        {backupDatabaseMutation.isPending ? (
                          <FileWarning className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileWarning className="h-4 w-4 mr-2" />
                        )}
                        Backup Database
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex items-center"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Run Migrations
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Form>
      </Tabs>
    </div>
  );
}