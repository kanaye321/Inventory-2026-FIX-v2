import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Send, Eye, History, Loader2, FileText, Plus, Trash2, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import JoditEditor from 'jodit-react';
import { useMemo } from 'react';

type Recipient = {
  email: string;
  customData: { [key: string]: string };
};

export default function EmailBulkSender() {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [ccAddresses, setCcAddresses] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("compose");
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Jodit editor configuration
  const joditConfig = useMemo(() => ({
    readonly: false,
    placeholder: 'Compose your email with rich formatting. Use placeholders like {{name}}, {{serialNumber}}, etc. for personalized data.',
    minHeight: 400,
    maxHeight: 600,
    toolbarAdaptive: false,
    toolbarSticky: false,
    buttons: [
      'source', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'superscript', 'subscript', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'image', 'video', 'table', 'link', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', 'copyformat', '|',
      'symbol', 'fullsize', 'print', 'about'
    ],
    uploader: {
      insertImageAsBase64URI: true
    },
    removeButtons: [],
    showCharsCounter: true,
    showWordsCounter: true,
    showXPathInStatusbar: false,
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_clear_html',
  }), []);

  // Manual entry states
  const [manualEmail, setManualEmail] = useState("");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" }
  ]);

  // Fetch email history
  const { data: emailHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/email-bulk-sender/history"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email-bulk-sender/history");
      return response.json();
    },
  });

  // Send bulk emails mutation
  const sendBulkEmailsMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending bulk emails with data:", data);
      const response = await apiRequest("POST", "/api/email-bulk-sender/send", data);
      return response.json();
    },
    onSuccess: (data) => {
      const successCount = data.results?.successful || 0;
      const failedCount = data.results?.failed || 0;
      const errors = data.results?.errors || [];
      
      console.log('📧 Bulk email send completed:', {
        successful: successCount,
        failed: failedCount,
        errors: errors
      });
      
      if (successCount > 0 && failedCount === 0) {
        toast({
          title: "✅ All emails sent successfully!",
          description: `Successfully sent ${successCount} email${successCount !== 1 ? 's' : ''} to all recipients.`,
        });
      } else if (successCount > 0 && failedCount > 0) {
        toast({
          title: "⚠️ Partially successful",
          description: `${successCount} sent, ${failedCount} failed. Check console for details.`,
          variant: "destructive",
        });
        console.error('❌ Failed emails:', errors);
      } else {
        toast({
          title: "❌ All emails failed",
          description: `Failed to send ${failedCount} email${failedCount !== 1 ? 's' : ''}. Check SMTP configuration.`,
          variant: "destructive",
        });
        console.error('❌ All emails failed:', errors);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/email-bulk-sender/history"] });
      // Clear form
      setRecipients([]);
      setSubject("");
      setBodyTemplate("");
      setCcAddresses("");
      setManualEmail("");
      setCustomFields([{ key: "", value: "" }]);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error sending emails",
        description: error.message || "Failed to send bulk emails",
        variant: "destructive",
      });
    },
  });

  // Preview email mutation
  const previewEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/email-bulk-sender/preview", data);
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewHtml(data.preview);
      setShowPreview(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate preview",
        variant: "destructive",
      });
    },
  });

  // Test SMTP configuration mutation
  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/test-email");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ SMTP Connection Success",
        description: data.message || "SMTP is configured correctly. You can send bulk emails.",
      });
      setTestingSmtp(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ SMTP Connection Failed",
        description: error.message || "Please configure SMTP in Email Notifications page.",
        variant: "destructive",
      });
      setTestingSmtp(false);
    },
  });

  const handleAddManualRecipient = () => {
    if (!manualEmail || !manualEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const customData: { [key: string]: string } = {};
    customFields.forEach(field => {
      if (field.key && field.value) {
        customData[field.key] = field.value;
      }
    });

    setRecipients([...recipients, { email: manualEmail, customData }]);
    setManualEmail("");
    setCustomFields([{ key: "", value: "" }]);

    toast({
      title: "Recipient added",
      description: `${manualEmail} has been added to the recipient list`,
    });
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index: number, field: "key" | "value", value: string) => {
    const newFields = [...customFields];
    newFields[index][field] = value;
    setCustomFields(newFields);
  };

  const handleSendBulkEmails = () => {
    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (!subject || !bodyTemplate) {
      toast({
        title: "Missing information",
        description: "Please provide subject and email body",
        variant: "destructive",
      });
      return;
    }

    sendBulkEmailsMutation.mutate({
      recipients,
      subject,
      bodyTemplate,
      ccAddresses,
    });
  };

  const handlePreview = () => {
    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient to preview",
        variant: "destructive",
      });
      return;
    }

    previewEmailMutation.mutate({
      bodyTemplate,
      sampleData: recipients[0].customData,
    });
  };

  const handleTestSmtp = () => {
    setTestingSmtp(true);
    testSmtpMutation.mutate();
  };

  const getAvailablePlaceholders = () => {
    if (recipients.length === 0) return [];
    const allKeys = new Set<string>();
    recipients.forEach(r => {
      Object.keys(r.customData).forEach(key => allKeys.add(key));
    });
    return Array.from(allKeys);
  };

  const handleLoadFromHistory = (activity: any) => {
    try {
      console.log("Loading from history - Full activity:", activity);
      console.log("Metadata type:", typeof activity.metadata);
      console.log("Metadata value:", activity.metadata);

      // Check if metadata exists
      if (!activity.metadata) {
        console.error("No metadata found in activity");
        toast({
          title: "No data available",
          description: "This email entry doesn't contain reusable data",
          variant: "destructive",
        });
        return;
      }

      // Parse metadata
      let metadata;
      try {
        if (typeof activity.metadata === 'string') {
          metadata = JSON.parse(activity.metadata);
        } else if (typeof activity.metadata === 'object') {
          metadata = activity.metadata;
        } else {
          throw new Error('Invalid metadata format');
        }
      } catch (parseError) {
        console.error("Error parsing metadata:", parseError);
        toast({
          title: "Error",
          description: "Failed to parse email data from history",
          variant: "destructive",
        });
        return;
      }

      console.log("Parsed metadata:", metadata);

      // Load subject
      if (metadata.subject) {
        setSubject(metadata.subject);
        console.log("Loaded subject:", metadata.subject);
      }

      // Load body template
      if (metadata.bodyTemplate) {
        setBodyTemplate(metadata.bodyTemplate);
        console.log("Loaded body template");
      }

      // Load CC addresses
      if (metadata.ccAddresses) {
        setCcAddresses(metadata.ccAddresses);
        console.log("Loaded CC addresses:", metadata.ccAddresses);
      }

      // Load recipients
      if (metadata.recipients && Array.isArray(metadata.recipients)) {
        setRecipients(metadata.recipients);
        console.log("Loaded recipients count:", metadata.recipients.length);
      }

      // Switch to compose tab
      setActiveTab("compose");

      toast({
        title: "Email loaded",
        description: `Loaded email with ${metadata.recipientCount || 0} recipients. You can now edit and resend it.`,
      });

    } catch (error) {
      console.error("Error loading email from history:", error);
      toast({
        title: "Error",
        description: "Failed to load email from history",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Bulk Sender"
        description="Send personalized bulk emails with custom data for each recipient"
      >
        <Button
          onClick={handleTestSmtp}
          disabled={testingSmtp}
          variant="outline"
          size="sm"
        >
          {testingSmtp ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Test SMTP
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose Email</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Add Recipients
              </CardTitle>
              <CardDescription>
                Manually add recipients with custom data for personalized emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="manual-email">Recipient Email</Label>
                  <Input
                    id="manual-email"
                    type="email"
                    placeholder="recipient@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Fields (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomField}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Field
                    </Button>
                  </div>

                  {customFields.map((field, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Field name (e.g., name, serialNumber)"
                        value={field.key}
                        onChange={(e) => handleCustomFieldChange(index, "key", e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldChange(index, "value", e.target.value)}
                      />
                      {customFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button onClick={handleAddManualRecipient} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>

              {recipients.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} added
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecipients([])}
                    >
                      Clear All
                    </Button>
                  </div>

                  {getAvailablePlaceholders().length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available placeholders:{" "}
                      {getAvailablePlaceholders().map(key => `{{${key}}}`).join(", ")}
                    </p>
                  )}

                  <ScrollArea className="h-[200px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {recipients.map((recipient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{recipient.email}</p>
                            {Object.keys(recipient.customData).length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {Object.entries(recipient.customData)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRecipient(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Content
              </CardTitle>
              <CardDescription>
                Compose your email with placeholders for personalized data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc">CC (Optional)</Label>
                <Input
                  id="cc"
                  placeholder="admin@example.com, manager@example.com"
                  value={ccAddresses}
                  onChange={(e) => setCcAddresses(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email Body</Label>
                <div className="border rounded-md overflow-hidden jodit-container">
                  <JoditEditor
                    value={bodyTemplate}
                    config={joditConfig}
                    onBlur={newContent => setBodyTemplate(newContent)}
                    onChange={newContent => {}}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Use placeholders like <code className="px-1 py-0.5 bg-gray-100 rounded">{"{{fieldName}}"}</code> to insert custom data for each recipient
                </p>
                <p className="text-xs text-muted-foreground">
                  📝 Full-featured rich text editor with formatting, images, tables, links, and more.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  disabled={recipients.length === 0 || !bodyTemplate}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleSendBulkEmails}
                  disabled={sendBulkEmailsMutation.isPending || recipients.length === 0}
                  className="flex-1"
                >
                  {sendBulkEmailsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to {recipients.length} Recipient{recipients.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Email History
              </CardTitle>
              <CardDescription>
                View recent bulk email sends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : emailHistory && emailHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailHistory.map((activity: any) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            {new Date(activity.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{activity.userId || "System"}</TableCell>
                          <TableCell className="text-sm">
                            {activity.notes}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadFromHistory(activity)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Edit & Reuse
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email history found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>📧 Email Preview (First Recipient)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-120px)] pr-4">
            <div className="space-y-4">
              <div className="rounded-md border p-4 bg-blue-50">
                <div className="mb-2">
                  <strong>Subject:</strong> {subject}
                </div>
                <div className="mb-2">
                  <strong>To:</strong> {recipients[0]?.email}
                </div>
                {ccAddresses && (
                  <div className="mb-2">
                    <strong>CC:</strong> {ccAddresses}
                  </div>
                )}
              </div>
              <div className="rounded-md border p-4 bg-white">
                <div 
                  className="prose prose-sm max-w-none email-preview-content"
                  dangerouslySetInnerHTML={{ __html: previewHtml }} 
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}