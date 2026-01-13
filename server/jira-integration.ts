
interface JiraSettings {
  enabled: boolean;
  webhookUrl: string;
  automationWebhookUrl?: string;
  enableAutomation?: boolean;
  projectKey: string;
  issueTypeId?: string;
  priorityMapping: {
    Low: string;
    Medium: string;
    High: string;
    Critical: string;
  };
  customFields?: string;
  authentication: {
    type: 'none' | 'basic' | 'token';
    username?: string;
    password?: string;
    token?: string;
  };
}

interface IssueData {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  issueType: string;
  environment?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  userEmail?: string;
  submittedBy: string;
}

export async function createJiraTicket(settings: JiraSettings, issueData: IssueData): Promise<string> {
  if (!settings.enabled || !settings.webhookUrl || !settings.projectKey) {
    throw new Error('JIRA integration is not properly configured');
  }

  try {
    // Normalize the webhook URL to proper JIRA REST API endpoint
    let apiUrl = settings.webhookUrl.trim();
    
    // Handle common URL formats
    if (!apiUrl.includes('/rest/api/')) {
      if (apiUrl.endsWith('/')) {
        apiUrl += 'rest/api/2/issue';
      } else {
        apiUrl += '/rest/api/2/issue';
      }
    }

    // Prepare authentication headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (settings.authentication.type === 'basic' && settings.authentication.username && settings.authentication.password) {
      const credentials = Buffer.from(`${settings.authentication.username}:${settings.authentication.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (settings.authentication.type === 'token' && settings.authentication.username && settings.authentication.token) {
      const credentials = Buffer.from(`${settings.authentication.username}:${settings.authentication.token}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Map priority to JIRA priority IDs
    const priorityId = settings.priorityMapping[issueData.priority] || settings.priorityMapping.Medium || '3';

    // Build comprehensive description
    let description = `*Reported by:* ${issueData.submittedBy}\n\n`;
    description += `*Description:*\n${issueData.description}\n\n`;
    
    if (issueData.environment) {
      description += `*Environment:*\n${issueData.environment}\n\n`;
    }
    
    if (issueData.stepsToReproduce) {
      description += `*Steps to Reproduce:*\n${issueData.stepsToReproduce}\n\n`;
    }
    
    if (issueData.expectedBehavior) {
      description += `*Expected Behavior:*\n${issueData.expectedBehavior}\n\n`;
    }
    
    if (issueData.actualBehavior) {
      description += `*Actual Behavior:*\n${issueData.actualBehavior}\n\n`;
    }
    
    if (issueData.userEmail) {
      description += `*Contact Email:* ${issueData.userEmail}\n\n`;
    }

    description += `*Source:* SRPH-MIS - ${new Date().toISOString()}`;

    // Build issue payload - try modern ADF format first, fallback to text
    const issuePayload: any = {
      fields: {
        project: {
          key: settings.projectKey
        },
        summary: issueData.title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description
                }
              ]
            }
          ]
        },
        issuetype: settings.issueTypeId ? 
          { id: settings.issueTypeId } : 
          { name: issueData.issueType || 'Incident' },
        priority: {
          id: priorityId
        }
      }
    };

    // Add reporter field if available
    if (settings.authentication?.username) {
      try {
        issuePayload.fields.reporter = {
          name: settings.authentication.username
        };
      } catch (reporterError) {
        console.warn('Could not set reporter field:', reporterError);
      }
    }

    // Add custom fields if configured
    if (settings.customFields && settings.customFields.trim()) {
      try {
        const customFields = JSON.parse(settings.customFields);
        Object.assign(issuePayload.fields, customFields);
      } catch (error) {
        console.warn('Failed to parse custom fields:', error);
      }
    }

    console.log('Creating JIRA ticket with payload:', JSON.stringify(issuePayload, null, 2));

    let response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(issuePayload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    // If ADF format fails, try plain text description
    if (!response.ok && response.status === 400) {
      console.warn('ADF format failed, trying plain text description');
      issuePayload.fields.description = description;
      
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(issuePayload),
        signal: AbortSignal.timeout(30000)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JIRA API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      let errorMessage = `JIRA API error (${response.status} ${response.statusText}): `;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          const errorMessages = Object.entries(errorJson.errors)
            .map(([field, error]) => `${field}: ${error}`)
            .join(', ');
          errorMessage += errorMessages;
        } else if (errorJson.errorMessages && Array.isArray(errorJson.errorMessages)) {
          errorMessage += errorJson.errorMessages.join(', ');
        } else if (errorJson.message) {
          errorMessage += errorJson.message;
        } else {
          errorMessage += errorText;
        }
      } catch (parseError) {
        errorMessage += errorText || 'Unknown error';
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const ticketKey = result.key;

    if (!ticketKey) {
      throw new Error('No ticket key returned from JIRA');
    }

    console.log(`JIRA ticket created successfully: ${ticketKey}`);

    // Trigger automation if enabled
    if (settings.enableAutomation && settings.automationWebhookUrl) {
      try {
        await triggerJiraAutomation(settings.automationWebhookUrl, {
          ticketKey,
          issueType: issueData.issueType,
          priority: issueData.priority,
          submittedBy: issueData.submittedBy,
          title: issueData.title,
          description: issueData.description
        });
      } catch (automationError) {
        console.warn('JIRA automation trigger failed:', automationError);
        // Don't fail the main ticket creation for automation failures
      }
    }

    return ticketKey;
  } catch (error) {
    console.error('Error creating JIRA ticket:', error);
    throw new Error(`Failed to create JIRA ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function triggerJiraAutomation(webhookUrl: string, data: any): Promise<void> {
  try {
    console.log('Triggering JIRA automation:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'SRPH-MIS'
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Automation webhook failed (${response.status}): ${errorText}`);
    }

    console.log('JIRA automation triggered successfully');
  } catch (error) {
    console.error('JIRA automation error:', error);
    throw error;
  }
}

export async function testJiraConnection(settings: JiraSettings): Promise<{ message: string; ticketId?: string }> {
  try {
    console.log('Testing JIRA connection...');
    
    if (!settings.webhookUrl || !settings.projectKey) {
      throw new Error('JIRA URL and Project Key are required');
    }

    // Normalize the URL
    let baseUrl = settings.webhookUrl.trim();
    if (baseUrl.includes('/rest/api/')) {
      baseUrl = baseUrl.substring(0, baseUrl.indexOf('/rest/api/'));
    }
    
    // Test API connectivity first
    const serverInfoUrl = `${baseUrl}/rest/api/2/serverInfo`;
    
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add authentication
    if (settings.authentication.type === 'basic' && settings.authentication.username && settings.authentication.password) {
      const auth = Buffer.from(`${settings.authentication.username}:${settings.authentication.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (settings.authentication.type === 'token' && settings.authentication.token && settings.authentication.username) {
      const auth = Buffer.from(`${settings.authentication.username}:${settings.authentication.token}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    // Test server connectivity
    const serverInfoResponse = await fetch(serverInfoUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000)
    });
    
    if (!serverInfoResponse.ok) {
      throw new Error(`JIRA server connectivity failed: HTTP ${serverInfoResponse.status} - ${serverInfoResponse.statusText}`);
    }
    
    const serverInfo = await serverInfoResponse.json();
    const version = serverInfo.version || 'Unknown';
    console.log(`JIRA Server connected: ${serverInfo.serverTitle || 'JIRA'} v${version}`);
    
    // Test project access
    const projectUrl = `${baseUrl}/rest/api/2/project/${settings.projectKey}`;
    const projectResponse = await fetch(projectUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000)
    });
    
    if (!projectResponse.ok) {
      if (projectResponse.status === 404) {
        throw new Error(`Project '${settings.projectKey}' not found or no access`);
      } else if (projectResponse.status === 401) {
        throw new Error('Authentication failed - check username/password or API token');
      } else if (projectResponse.status === 403) {
        throw new Error('Access denied - check user permissions for the project');
      }
      throw new Error(`Project access failed: HTTP ${projectResponse.status}`);
    }
    
    const projectInfo = await projectResponse.json();
    console.log(`Project access verified: ${projectInfo.name}`);
    
    // Create a test issue to verify full functionality
    const testIssueData: IssueData = {
      title: 'Test Issue - SRPH MIS Integration',
      description: 'This is a test issue created to verify JIRA integration is working correctly. This ticket can be safely deleted.',
      priority: 'Low',
      issueType: 'Incident',
      submittedBy: 'SRPH-MIS System Test'
    };
    
    const ticketId = await createJiraTicket(settings, testIssueData);
    
    let message = `JIRA connection test successful!\n• Server: ${serverInfo.serverTitle || 'JIRA'} v${version}\n• Project: ${projectInfo.name}\n• Test ticket created: ${ticketId}`;
    
    // Test automation webhook if enabled
    if (settings.enableAutomation && settings.automationWebhookUrl) {
      try {
        await triggerJiraAutomation(settings.automationWebhookUrl, {
          testMode: true,
          ticketKey: ticketId,
          message: 'JIRA Automation test from SRPH-MIS'
        });
        message += '\n• Automation webhook test: SUCCESS';
      } catch (automationError) {
        message += `\n• Automation webhook test: FAILED (${automationError.message})`;
      }
    }
    
    return {
      message,
      ticketId
    };
  } catch (error) {
    console.error('JIRA connection test failed:', error);
    throw new Error(`JIRA connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchJiraIssues(settings: JiraSettings): Promise<any> {
  if (!settings.enabled || !settings.webhookUrl || !settings.projectKey) {
    throw new Error('JIRA integration is not properly configured');
  }

  try {
    // Normalize the URL
    let baseUrl = settings.webhookUrl.trim();
    if (baseUrl.includes('/rest/api/')) {
      baseUrl = baseUrl.substring(0, baseUrl.indexOf('/rest/api/'));
    }

    // Prepare authentication headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (settings.authentication.type === 'basic' && settings.authentication.username && settings.authentication.password) {
      const credentials = Buffer.from(`${settings.authentication.username}:${settings.authentication.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (settings.authentication.type === 'token' && settings.authentication.username && settings.authentication.token) {
      const credentials = Buffer.from(`${settings.authentication.username}:${settings.authentication.token}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Build JIRA search URL
    const searchUrl = `${baseUrl}/rest/api/2/search`;
    
    // JQL query to get issues from the project, ordered by created date descending
    const jql = `project = "${settings.projectKey}" ORDER BY created DESC`;
    
    const searchPayload = {
      jql: jql,
      startAt: 0,
      maxResults: 100,
      expand: ['schema', 'names'],
      fields: [
        'summary',
        'description', 
        'status',
        'priority',
        'issuetype',
        'assignee',
        'reporter',
        'created',
        'updated',
        'resolutiondate'
      ]
    };

    console.log('Fetching JIRA issues with query:', jql);

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchPayload),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JIRA API Error Response:', errorText);
      throw new Error(`JIRA API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const issues = result.issues || [];

    // Calculate statistics
    const stats = {
      total: issues.length,
      open: 0,
      inProgress: 0,
      done: 0,
      byPriority: {} as { [key: string]: number },
      byType: {} as { [key: string]: number },
      recentlyCreated: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    issues.forEach((issue: any) => {
      const statusCategory = issue.fields.status.statusCategory.name.toLowerCase();
      const priority = issue.fields.priority?.name || 'None';
      const issueType = issue.fields.issuetype.name;
      const createdDate = new Date(issue.fields.created);

      // Count by status category
      if (statusCategory === 'done') {
        stats.done++;
      } else if (statusCategory === 'indeterminate') {
        stats.inProgress++;
      } else {
        stats.open++;
      }

      // Count by priority
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      // Count by type
      stats.byType[issueType] = (stats.byType[issueType] || 0) + 1;

      // Count recent issues
      if (createdDate > oneWeekAgo) {
        stats.recentlyCreated++;
      }
    });

    // Transform issues to a cleaner format
    const transformedIssues = issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status,
      priority: issue.fields.priority,
      issuetype: issue.fields.issuetype,
      assignee: issue.fields.assignee,
      reporter: issue.fields.reporter,
      created: issue.fields.created,
      updated: issue.fields.updated,
      resolutiondate: issue.fields.resolutiondate
    }));

    console.log(`Successfully fetched ${transformedIssues.length} JIRA issues`);

    return {
      issues: transformedIssues,
      stats: stats,
      totalResults: result.total || issues.length
    };

  } catch (error) {
    console.error('Error fetching JIRA issues:', error);
    throw new Error(`Failed to fetch JIRA issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
