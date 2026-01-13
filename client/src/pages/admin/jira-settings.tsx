import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, TestTube, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const jiraSettingsSchema = z.object({
  enabled: z.boolean(),
  webhookUrl: z.string().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty when disabled
    try {
      // Basic check for URL structure - server might append path
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Please enter a valid JIRA base URL (e.g., https://your-domain.atlassian.net or https://your-jira-server.com/jira)').optional().or(z.literal('')),
  automationWebhookUrl: z.string().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Please enter a valid automation webhook URL').optional().or(z.literal('')),
  enableAutomation: z.boolean().optional(),
  projectKey: z.string().optional().or(z.literal('')),
  issueTypeId: z.string().optional().or(z.literal('')),
  priorityMapping: z.object({
    Low: z.string().optional().or(z.literal('')),
    Medium: z.string().optional().or(z.literal('')),
    High: z.string().optional().or(z.literal('')),
    Critical: z.string().optional().or(z.literal('')),
  }),
  customFields: z.string().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Custom fields must be valid JSON or empty').optional().or(z.literal('')),
  authentication: z.object({
    type: z.enum(['none', 'basic', 'token']),
    username: z.string().optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
    token: z.string().optional().or(z.literal('')),
  }),
}).refine((data) => {
  // Only require fields when JIRA is enabled
  if (data.enabled) {
    return data.webhookUrl && data.webhookUrl.trim() !== '' &&
           data.projectKey && data.projectKey.trim() !== '';
  }
  return true;
}, {
  message: "JIRA Base URL and Project Key are required when JIRA integration is enabled",
  path: ["webhookUrl"] // Associate error message with webhookUrl field
});

type JiraSettingsFormValues = z.infer<typeof jiraSettingsSchema>;

export default function JiraSettings() {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<JiraSettingsFormValues>({
    resolver: zodResolver(jiraSettingsSchema),
    defaultValues: {
      enabled: false,
      webhookUrl: '',
      automationWebhookUrl: '',
      enableAutomation: false,
      projectKey: '',
      issueTypeId: '',
      priorityMapping: {
        Low: '4',
        Medium: '3',
        High: '2',
        Critical: '1',
      },
      customFields: '',
      authentication: {
        type: 'none',
        username: '',
        password: '',
        token: '',
      },
    },
  });

  const isEnabled = form.watch('enabled');
  const isAutomationEnabled = form.watch('enableAutomation');
  const automationWebhookUrl = form.watch('automationWebhookUrl');

  // Fetch current JIRA settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/jira-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/jira-settings', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No settings found, use defaults
        }
        throw new Error('Failed to fetch JIRA settings');
      }
      const data = await response.json();
      // Ensure defaults are applied if certain fields are missing from response
      return {
        ...form.getValues(), // Start with defaults
        ...data, // Override with fetched data
        priorityMapping: { // Ensure priorityMapping is always an object
          Low: data?.priorityMapping?.Low ?? '4',
          Medium: data?.priorityMapping?.Medium ?? '3',
          High: data?.priorityMapping?.High ?? '2',
          Critical: data?.priorityMapping?.Critical ?? '1',
        },
        authentication: { // Ensure authentication is always an object
          type: data?.authentication?.type ?? 'none',
          username: data?.authentication?.username ?? '',
          password: data?.authentication?.password ?? '',
          token: data?.authentication?.token ?? '',
        }
      };
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  // Save JIRA settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: JiraSettingsFormValues) => {
      // Construct the full API URL based on the base URL and type
      let apiUrl = data.webhookUrl;
      if (apiUrl && !apiUrl.endsWith('/rest/api/2/issue')) {
        if (apiUrl.endsWith('/')) {
          apiUrl += 'rest/api/2/issue';
        } else {
          apiUrl += '/rest/api/2/issue';
        }
      }

      const payload = {
        ...data,
        webhookUrl: apiUrl, // Use the constructed URL
      };

      const response = await fetch('/api/admin/jira-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save JIRA settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "JIRA webhook settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test automation webhook
  const testAutomationMutation = useMutation({
    mutationFn: async () => {
      const formData = form.getValues();
      const response = await fetch('/api/admin/jira-settings/test-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          automationWebhookUrl: formData.automationWebhookUrl
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Automation test failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Automation Test Successful",
        description: "JIRA automation webhook is working correctly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Automation Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestAutomation = () => {
    testAutomationMutation.mutate();
  };

  // Test JIRA connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const formData = form.getValues();
      // Construct the full API URL based on the base URL and type
      let apiUrl = formData.webhookUrl;
      if (apiUrl && !apiUrl.endsWith('/rest/api/2/issue')) {
        if (apiUrl.endsWith('/')) {
          apiUrl += 'rest/api/2/issue';
        } else {
          apiUrl += '/rest/api/2/issue';
        }
      }

      const payload = {
        ...formData,
        webhookUrl: apiUrl, // Use the constructed URL
      };

      const response = await fetch('/api/admin/jira-settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Test failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message });
      toast({
        title: "Connection Test Successful",
        description: "JIRA webhook is working correctly.",
      });
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JiraSettingsFormValues) => {
    saveSettingsMutation.mutate(data);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">JIRA Integration Settings</h1>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading JIRA settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">JIRA Integration Settings</h1>
        <p className="text-muted-foreground">
          Configure JIRA webhook integration to automatically create tickets from reported issues.
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="mr-2 h-4 w-4" />
            Test & Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Configuration</CardTitle>
                  <CardDescription>
                    Enable JIRA integration and configure the webhook endpoint.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable JIRA Integration</FormLabel>
                          <FormDescription>
                            Automatically create JIRA tickets when users report issues.
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
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JIRA API URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-domain.atlassian.net OR https://your-jira-server.com/jira"
                            {...field}
                            disabled={!isEnabled}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your JIRA base URL. For Atlassian Cloud: https://your-domain.atlassian.net<br/>
                          For Server/Data Center: https://your-server.com/jira (the system will add /rest/api/2/issue automatically)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="automationWebhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JIRA Automation Webhook URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://automation.atlassian.com/pro/hooks/..."
                            {...field}
                            disabled={!isEnabled}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: JIRA Automation webhook URL for triggering automation rules. Get this from JIRA Automation → Create Rule → Webhook trigger.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableAutomation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable JIRA Automation</FormLabel>
                          <FormDescription>
                            Use JIRA Automation webhooks for advanced workflow automation.
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Key*</FormLabel>
                          <FormControl>
                            <Input placeholder="SUPPORT" {...field} disabled={!isEnabled} />
                          </FormControl>
                          <FormDescription>
                            The JIRA project key where issues will be created.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="issueTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Type ID</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} disabled={!isEnabled}/>
                          </FormControl>
                          <FormDescription>
                            JIRA issue type ID (leave empty for default).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    Configure authentication for JIRA API access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="authentication.type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication Type</FormLabel>
                        <select
                          className="w-full p-2 border rounded-md"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!isEnabled}
                        >
                          <option value="none">None</option>
                          <option value="basic">Basic Auth</option>
                          <option value="token">API Token</option>
                        </select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('authentication.type') === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="authentication.username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your-username" {...field} disabled={!isEnabled}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="authentication.password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} disabled={!isEnabled}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch('authentication.type') === 'token' && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="authentication.username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="your-email@company.com" {...field} disabled={!isEnabled}/>
                            </FormControl>
                            <FormDescription>
                              Your JIRA account email address.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="authentication.token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Token</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your JIRA API token" {...field} disabled={!isEnabled}/>
                            </FormControl>
                            <FormDescription>
                              Generate an API token from your JIRA profile settings.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Mapping</CardTitle>
                  <CardDescription>
                    Map application priority levels to JIRA priority IDs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="priorityMapping.Low"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="4" {...field} disabled={!isEnabled}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityMapping.Medium"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medium Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="3" {...field} disabled={!isEnabled}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityMapping.High"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>High Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="2" {...field} disabled={!isEnabled}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityMapping.Critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Critical Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="1" {...field} disabled={!isEnabled}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Configuration</CardTitle>
                  <CardDescription>
                    Optional custom fields and additional settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="customFields"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Fields (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"customfield_10001": "value", "customfield_10002": "another value"}'
                            className="font-mono text-sm"
                            {...field}
                            disabled={!isEnabled}
                          />
                        </FormControl>
                        <FormDescription>
                          Additional JIRA custom fields to include when creating tickets (JSON format).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending || !isEnabled}
                  className="flex-1"
                >
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test JIRA Connection</CardTitle>
              <CardDescription>
                Test your JIRA webhook configuration to ensure it's working correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending || !isEnabled}
                  className="w-full"
                >
                  {testConnectionMutation.isPending ? 'Testing...' : 'Test JIRA Connection'}
                </Button>

                {isAutomationEnabled && automationWebhookUrl && (
                  <Button
                    onClick={handleTestAutomation}
                    disabled={testAutomationMutation.isPending || !isEnabled}
                    variant="outline"
                    className="w-full"
                  >
                    {testAutomationMutation.isPending ? 'Testing...' : 'Test Automation Webhook'}
                  </Button>
                )}
              </div>

              {testResult && (
                <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to configure JIRA integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">1</Badge>
                  <div>
                    <p className="font-medium">Enable JIRA Integration</p>
                    <p className="text-sm text-muted-foreground">
                      Toggle the integration on to start configuring
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">2</Badge>
                  <div>
                    <p className="font-medium">Configure JIRA API URL</p>
                    <p className="text-sm text-muted-foreground">
                      For Atlassian Cloud: https://your-domain.atlassian.net<br/>
                      For Server/Data Center: https://your-server.com/jira<br/>
                      (REST API path will be added automatically)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">3</Badge>
                  <div>
                    <p className="font-medium">Set Project Key</p>
                    <p className="text-sm text-muted-foreground">
                      Find this in JIRA Project Settings → Details (e.g., "SUPPORT", "BUG")
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">4</Badge>
                  <div>
                    <p className="font-medium">Configure Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Cloud:</strong> Use API Token (Account Settings → Security → API tokens)<br/>
                      <strong>Server:</strong> Use Basic Auth with username/password
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">5</Badge>
                  <div>
                    <p className="font-medium">Map Priorities</p>
                    <p className="text-sm text-muted-foreground">
                      Find Priority IDs in JIRA Admin → Issues → Priorities<br/>
                      Common values: 1=Highest, 2=High, 3=Medium, 4=Low, 5=Lowest
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">6</Badge>
                  <div>
                    <p className="font-medium">Test Connection</p>
                    <p className="text-sm text-muted-foreground">
                      This will create a real test ticket to verify everything works<br/>
                      Make sure your user has "Create Issues" permission in the project
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Make sure your JIRA user has permission to create issues in the specified project.
                  <br />
                  <strong>Integration Status:</strong> When properly configured, the "Report Issue" page will automatically create JIRA tickets for user submissions.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Integration Status</CardTitle>
                  <CardDescription>
                    Current status of JIRA integration for issue reporting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {isEnabled ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        JIRA Integration
                      </span>
                    </div>

                    {isEnabled && (
                      <>
                        <div className="flex items-center gap-2">
                          {form.watch('webhookUrl') && form.watch('projectKey') ? (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            Basic Configuration
                          </span>
                        </div>

                        {isAutomationEnabled && (
                          <div className="flex items-center gap-2">
                            {automationWebhookUrl ? (
                              <Badge variant="default" className="bg-purple-100 text-purple-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                URL Required
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              Automation Webhook
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <p className="text-xs text-muted-foreground mt-3">
                      When users submit issues through the "Report Issue" page, tickets will be {isEnabled ? 'automatically created in JIRA' : 'saved locally only'}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}