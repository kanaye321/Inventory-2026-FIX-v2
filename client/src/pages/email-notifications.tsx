
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Send, Settings, CheckCircle, AlertCircle, Loader2, RefreshCw, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EmailNotificationsPage() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      const data = await response.json();
      console.log('Loaded email settings:', data);
      return data;
    }
  });

  const { data: emailLogs, refetch: refetchLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['/api/email-logs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/email-logs');
      if (!response.ok) {
        console.error('Failed to fetch email logs:', response.statusText);
        return [];
      }
      const data = await response.json();
      console.log('Email logs received:', data);
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/settings', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings saved",
        description: "Email notification settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-email');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test email sent",
        description: data.message || "Check your inbox for the test email.",
      });
      setIsTesting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Test email failed",
        description: error.message || "Could not send test email. Please check your configuration.",
        variant: "destructive",
      });
      setIsTesting(false);
    }
  });

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get the value or preserve existing - only update if field exists in form
    const getFieldValue = (fieldName: string, defaultValue: any = '') => {
      const formValue = formData.get(fieldName);
      if (formValue !== null) {
        return formValue.toString();
      }
      return settings?.[fieldName] !== undefined ? settings[fieldName] : defaultValue;
    };

    // Get checkbox value - preserve existing if not in form
    const getCheckboxValue = (fieldName: string, defaultValue: boolean = true) => {
      // Check if the field exists in the form
      const formHasField = formData.has(fieldName);
      if (formHasField) {
        return formData.get(fieldName) === 'on';
      }
      // Preserve existing value if field not in form
      return settings?.[fieldName] !== undefined ? settings[fieldName] : defaultValue;
    };
    
    const settingsData = {
      // SMTP Configuration - preserve existing values
      mailHost: getFieldValue('mailHost', settings?.mailHost || ''),
      mailPort: getFieldValue('mailPort', settings?.mailPort || '587'),
      mailUsername: getFieldValue('mailUsername', settings?.mailUsername || ''),
      mailPassword: getFieldValue('mailPassword', settings?.mailPassword || ''),
      mailFromAddress: getFieldValue('mailFromAddress', settings?.mailFromAddress || ''),
      mailFromName: getFieldValue('mailFromName', settings?.mailFromName || settings?.siteName || 'SRPH-MIS'),
      companyEmail: getFieldValue('companyEmail', settings?.companyEmail || ''),
      
      // Notification Preferences - preserve existing values
      enableAdminNotifications: getCheckboxValue('enableAdminNotifications', settings?.enableAdminNotifications ?? true),
      notifyOnCheckin: getCheckboxValue('notifyOnCheckin', settings?.notifyOnCheckin ?? true),
      notifyOnCheckout: getCheckboxValue('notifyOnCheckout', settings?.notifyOnCheckout ?? true),
      notifyOnIamExpiration: getCheckboxValue('notifyOnIamExpiration', settings?.notifyOnIamExpiration ?? true),
      notifyOnVmExpiration: getCheckboxValue('notifyOnVmExpiration', settings?.notifyOnVmExpiration ?? true),
      notifyOnItEquipmentChanges: getCheckboxValue('notifyOnItEquipmentChanges', settings?.notifyOnItEquipmentChanges ?? true),
      notifyOnUserChanges: getCheckboxValue('notifyOnUserChanges', settings?.notifyOnUserChanges ?? true),
      notifyOnVmInventoryChanges: getCheckboxValue('notifyOnVmInventoryChanges', settings?.notifyOnVmInventoryChanges ?? true),
      notifyOnIamAccountChanges: getCheckboxValue('notifyOnIamAccountChanges', settings?.notifyOnIamAccountChanges ?? true),
      notifyOnGcpChanges: getCheckboxValue('notifyOnGcpChanges', settings?.notifyOnGcpChanges ?? true),
      notifyOnAzureChanges: getCheckboxValue('notifyOnAzureChanges', settings?.notifyOnAzureChanges ?? true),
      
      // Email Templates - preserve existing values
      iamExpirationEmailSubject: getFieldValue('iamExpirationEmailSubject', settings?.iamExpirationEmailSubject || ''),
      iamExpirationEmailBody: getFieldValue('iamExpirationEmailBody', settings?.iamExpirationEmailBody || ''),
    };

    console.log('Saving email settings:', settingsData);
    console.log('Current settings before save:', settings);
    updateSettingsMutation.mutate(settingsData);
  };

  const handleTestEmail = () => {
    setIsTesting(true);
    testEmailMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Email Notifications" 
        description="Configure email notifications for system modifications and events"
      >
        <Button onClick={handleTestEmail} disabled={isTesting} variant="outline">
          {isTesting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Test Email
        </Button>
      </PageHeader>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <Tabs defaultValue="smtp" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="smtp">SMTP Configuration</TabsTrigger>
            <TabsTrigger value="preferences">Notification Preferences</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
            <TabsTrigger value="logs">Email Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="smtp" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  SMTP Server Settings
                </CardTitle>
                <CardDescription>
                  Configure your email server to enable notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mailHost">SMTP Server</Label>
                    <Input
                      id="mailHost"
                      name="mailHost"
                      placeholder="smtp.gmail.com"
                      defaultValue={settings?.mailHost || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailPort">Port</Label>
                    <Input
                      id="mailPort"
                      name="mailPort"
                      type="number"
                      placeholder="587"
                      defaultValue={settings?.mailPort || '587'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mailUsername">Username</Label>
                    <Input
                      id="mailUsername"
                      name="mailUsername"
                      placeholder="your-email@example.com"
                      defaultValue={settings?.mailUsername || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailPassword">Password</Label>
                    <Input
                      id="mailPassword"
                      name="mailPassword"
                      type="password"
                      placeholder="••••••••"
                      defaultValue={settings?.mailPassword || ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mailFromAddress">From Email</Label>
                    <Input
                      id="mailFromAddress"
                      name="mailFromAddress"
                      type="email"
                      placeholder="noreply@example.com"
                      defaultValue={settings?.mailFromAddress || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailFromName">From Name</Label>
                    <Input
                      id="mailFromName"
                      name="mailFromName"
                      placeholder="SRPH-MIS"
                      defaultValue={settings?.mailFromName || settings?.siteName || 'SRPH-MIS'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Admin Email (Receives All Notifications)</Label>
                  <Input
                    id="companyEmail"
                    name="companyEmail"
                    type="email"
                    placeholder="admin@example.com"
                    defaultValue={settings?.companyEmail || ''}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  All email notifications are enabled by default
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <Label className="font-medium text-base">All Notifications Enabled</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Email notifications are automatically sent for all system events
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">ACTIVE</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Check-out</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Check-in</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">IAM Expiration</p>
                        <p className="text-xs text-muted-foreground">Daily check - Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">VM Expiration</p>
                        <p className="text-xs text-muted-foreground">Daily check - Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">IT Equipment</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">User Changes</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">VM Inventory</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">IAM Accounts</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">GCP Changes</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Azure Changes</p>
                        <p className="text-xs text-muted-foreground">Always enabled</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Approval Expiration</p>
                        <p className="text-xs text-muted-foreground">1 week warning - Always enabled</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automatic Notification Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Asset creation/updates/deletions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>User account modifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>License assignments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Inventory updates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>IT Equipment modifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>VM Inventory changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>IAM Account changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>GCP resource changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Azure resource changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>IAM expirations (owner + admin)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>System alerts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  IAM Expiration Email Template
                </CardTitle>
                <CardDescription>
                  Customize emails sent to IAM account owners and admin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="iamExpirationEmailSubject">Email Subject</Label>
                  <Input
                    id="iamExpirationEmailSubject"
                    name="iamExpirationEmailSubject"
                    placeholder="IAM Account Access Expiration Notice"
                    defaultValue={settings?.iamExpirationEmailSubject || 'IAM Account Access Expiration Notice'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iamExpirationEmailBody">Email Body Template</Label>
                  <textarea
                    id="iamExpirationEmailBody"
                    name="iamExpirationEmailBody"
                    className="w-full min-h-[250px] p-3 border rounded-md font-mono text-sm"
                    defaultValue={settings?.iamExpirationEmailBody || `Hi,

Please be advised that your requested access is now expired and will be removed on {removalDate}.

Kindly let us know if you still require access or if we can now proceed with the removal.

https://confluence.sec.samsung.net/pages/viewpage.action?pageId=454565479&spaceKey=SRPHCOMMONC&title=AWS%2BApproval%2BGuide

Account Details:
- Requestor: {requestor}
- Knox ID: {knoxId}
- Permission/IAM/SCOP: {permission}
- Cloud Platform: {cloudPlatform}
- Expiration Date: {endDate}
- Approval ID: {approvalId}

If you need to extend your access, please submit a new request through the proper channels.`}
                  />
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <h4 className="font-medium text-sm mb-2">Available Placeholders:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}removalDate{'}'}</code> - Removal date (7 days)</div>
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}requestor{'}'}</code> - Requestor name</div>
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}knoxId{'}'}</code> - Knox ID</div>
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}permission{'}'}</code> - Permission details</div>
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}cloudPlatform{'}'}</code> - Cloud platform</div>
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}endDate{'}'}</code> - Expiration date</div>
                    <div><code className="bg-background px-1 py-0.5 rounded text-xs">{'{'}approvalId{'}'}</code> - Approval ID</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Notification Logs
                    </CardTitle>
                    <CardDescription>
                      View all email notifications sent by the system
                    </CardDescription>
                  </div>
                  <Button onClick={() => refetchLogs()} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {isLoadingLogs ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                      <p>Loading email logs...</p>
                    </div>
                  ) : !emailLogs || emailLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No email logs found</p>
                      <p className="text-sm">Email notifications will appear here once sent</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {emailLogs.map((log: any, index: number) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            log.status === 'success'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {log.status === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                {log.status === 'success' ? 'Sent' : 'Failed'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium min-w-[60px]">To:</span>
                              <span className="text-sm">{log.to}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium min-w-[60px]">Subject:</span>
                              <span className="text-sm">{log.subject}</span>
                            </div>
                            {log.messageId && (
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium min-w-[60px]">ID:</span>
                                <span className="text-sm font-mono text-xs">{log.messageId}</span>
                              </div>
                            )}
                            {log.error && (
                              <div className="flex items-start gap-2 mt-2">
                                <span className="text-sm font-medium min-w-[60px] text-red-600">Error:</span>
                                <span className="text-sm text-red-600">{log.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
