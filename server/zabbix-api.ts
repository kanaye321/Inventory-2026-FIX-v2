import type { Express, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ZabbixSettings {
  zabbixUrl: string;
  zabbixApiToken: string;
  refreshInterval: number;
}

// Zabbix API request helper
async function zabbixApiRequest(settings: ZabbixSettings, method: string, params: any = {}) {
  const response = await fetch(`${settings.zabbixUrl}/api_jsonrpc.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json-rpc',
      'Authorization': `Bearer ${settings.zabbixApiToken}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1
    })
  });

  if (!response.ok) {
    throw new Error(`Zabbix API request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Zabbix API error: ${data.error.data || data.error.message}`);
  }

  return data.result;
}

// Format uptime to human readable
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Parse item value safely
function parseItemValue(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Ping host to check actual availability
async function pingHost(ipAddress: string): Promise<boolean> {
  try {
    // Use system ping command (works on both Linux and Windows)
    const isWindows = process.platform === 'win32';
    const pingCommand = isWindows 
      ? `ping -n 1 -w 1000 ${ipAddress}` 
      : `ping -c 1 -W 1 ${ipAddress}`;

    const { stdout } = await execAsync(pingCommand);

    // Check if ping was successful
    if (isWindows) {
      return stdout.includes('Reply from') || stdout.includes('bytes=');
    } else {
      return stdout.includes('1 received') || stdout.includes('1 packets received');
    }
  } catch (error) {
    // Ping failed - host is unreachable
    return false;
  }
}

export function registerZabbixRoutes(app: Express, requireAuth: any) {

  // Get Zabbix settings
  app.get("/api/zabbix/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const result = await db.execute(sql`
        SELECT * FROM zabbix_settings LIMIT 1
      `);

      const settings = result.rows[0] || {
        zabbixUrl: "",
        zabbixApiToken: "",
        refreshInterval: 60
      };

      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching Zabbix settings:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Save Zabbix settings
  app.post("/api/zabbix/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settingsData = req.body;
      console.log('Received Zabbix settings:', settingsData);

      // Validate required fields
      if (!settingsData.zabbixUrl && !settingsData.url) {
        return res.status(400).json({ message: 'Zabbix URL is required' });
      }
      if (!settingsData.zabbixApiToken && !settingsData.apiToken) {
        return res.status(400).json({ message: 'Zabbix API Token is required' });
      }

      const settings = await storage.saveZabbixSettings({
        url: settingsData.zabbixUrl || settingsData.url,
        apiToken: settingsData.zabbixApiToken || settingsData.apiToken,
        refreshInterval: settingsData.refreshInterval || 60
      });

      console.log('Zabbix settings saved successfully:', settings);

      // Return settings in the same format the frontend expects
      const response = {
        zabbixUrl: settings.url,
        zabbixApiToken: settings.apiToken,
        refreshInterval: settings.refreshInterval
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error saving Zabbix settings:', error);
      res.status(500).json({ 
        message: 'Failed to save Zabbix settings',
        error: error.message 
      });
    }
  });

  // Test Zabbix connection
  app.post("/api/zabbix/test-connection", requireAuth, async (req: Request, res: Response) => {
    try {
      const { zabbixUrl, zabbixApiToken } = req.body;

      if (!zabbixUrl || !zabbixApiToken) {
        return res.json({ 
          success: false, 
          message: 'Zabbix URL and API Token are required' 
        });
      }

      // Ensure URL ends with /api_jsonrpc.php
      const apiUrl = zabbixUrl.endsWith('/api_jsonrpc.php') 
        ? zabbixUrl 
        : `${zabbixUrl.replace(/\/$/, '')}/api_jsonrpc.php`;

      console.log('Testing Zabbix connection to:', apiUrl);

      // Test API version endpoint (no auth required)
      const versionResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json-rpc',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'apiinfo.version',
          params: {},
          id: 1
        })
      });

      if (!versionResponse.ok) {
        return res.json({ 
          success: false, 
          message: `HTTP Error: ${versionResponse.status} ${versionResponse.statusText}` 
        });
      }

      const versionData = await versionResponse.json();
      console.log('Zabbix API version response:', versionData);

      if (versionData.error) {
        return res.json({ 
          success: false, 
          message: `API Error: ${versionData.error.data || versionData.error.message}` 
        });
      }

      // Test authentication with the API token
      const authResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json-rpc',
          'Authorization': `Bearer ${zabbixApiToken}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'host.get',
          params: {
            output: ['hostid', 'host'],
            limit: 1
          },
          id: 2
        })
      });

      const authData = await authResponse.json();
      console.log('Zabbix auth test response:', authData);

      if (authData.error) {
        return res.json({ 
          success: false, 
          message: `Authentication failed: ${authData.error.data || authData.error.message}. Please check your API token.` 
        });
      }

      res.json({ 
        success: true, 
        message: `Successfully connected to Zabbix ${versionData.result}` 
      });
    } catch (error: any) {
      console.error('Error testing Zabbix connection:', error);
      res.json({ 
        success: false, 
        message: `Connection failed: ${error.message}` 
      });
    }
  });

  // Get all hosts with ICMP ping and agent check integration
  app.get("/api/zabbix/hosts", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const settingsResult = await db.execute(sql`
        SELECT * FROM zabbix_settings LIMIT 1
      `);
      const settingsRow = settingsResult.rows[0];
      if (!settingsRow) {
        return res.status(400).json({ message: "Zabbix not configured" });
      }

      const zabbixUrl = settingsRow.zabbix_url || settingsRow.zabbixUrl;
      const zabbixApiToken = settingsRow.zabbix_api_token || settingsRow.zabbixApiToken;
      if (!zabbixUrl || !zabbixApiToken) {
        return res.status(400).json({ message: "Zabbix URL or API token missing" });
      }

      let apiUrl = zabbixUrl;
      if (!apiUrl.endsWith("/api_jsonrpc.php")) {
        apiUrl = `${apiUrl.replace(/\/$/, "")}/api_jsonrpc.php`;
      }
      const baseUrl = apiUrl.replace("/api_jsonrpc.php", "");

      // Fetch hosts with detailed information
      const hosts: any[] = await zabbixApiRequest(
        {
          zabbixUrl: baseUrl,
          zabbixApiToken,
          refreshInterval: settingsRow.refresh_interval || settingsRow.refreshInterval || 60
        },
        "host.get",
        {
          output: ["hostid", "host", "name", "status", "available", "error", "disable_until"],
          selectInterfaces: ["interfaceid", "ip", "type", "main", "available", "error", "details"],
          selectGroups: ["groupid", "name"],
          limitSelects: 5
        }
      );

      // Enrich hosts with ICMP ping and agent check status
      const enriched = await Promise.all(hosts.map(async (host: any) => {
        let availabilityStatus = "unknown";
        let icmpStatus = "unknown";
        let agentStatus = "unknown";
        let directPingStatus = "unknown";

        // Get IP address for direct ping
        const ipAddress = host.interfaces?.[0]?.ip;
        
        // Perform direct ping check if IP is available
        if (ipAddress && ipAddress !== "N/A") {
          try {
            const pingResult = await pingHost(ipAddress);
            directPingStatus = pingResult ? "responding" : "no response";
            console.log(`Direct ping to ${host.name} (${ipAddress}): ${directPingStatus}`);
          } catch (err) {
            console.error(`Error pinging ${host.name} (${ipAddress}):`, err);
            directPingStatus = "error";
          }
        } else {
          directPingStatus = "no ip";
        }

        // Check interface availability
        let hasAvailableInterface = false;
        let hasUnavailableInterface = false;
        if (Array.isArray(host.interfaces)) {
          for (const iface of host.interfaces) {
            const val = parseInt(iface.available || "0");
            if (val === 1) hasAvailableInterface = true;
            else if (val === 2) hasUnavailableInterface = true;
          }
        }

        // Fetch items for ICMP ping and agent checks - get all items to ensure we don't miss any
        let items: any[] = [];
        try {
          items = await zabbixApiRequest(
            {
              zabbixUrl: baseUrl,
              zabbixApiToken,
              refreshInterval: settingsRow.refresh_interval || settingsRow.refreshInterval || 60
            },
            "item.get",
            {
              hostids: [host.hostid],
              output: ["itemid", "key_", "lastvalue", "name", "state", "status", "lastclock"],
              sortfield: "name"
            }
          );
          console.log(`Fetched ${items.length} total items for host ${host.name} (${host.hostid})`);
        } catch (err) {
          console.warn(`Unable to fetch items for host ${host.hostid}:`, err);
        }

        console.log(`\n=== Analyzing ${host.name} (${host.hostid}) ===`);
        console.log(`Total items fetched: ${items.length}`);
        console.log(`Active items: ${items.filter(i => i.status === '0' || i.status === 0).length}`);

        // ICMP ping detection - comprehensive search with better logging
        const icmpItem = items.find(i => {
          const key = (i.key_ || '').toLowerCase();
          const name = (i.name || '').toLowerCase();
          const isEnabled = i.status === '0' || i.status === 0; // Only active items
          return isEnabled && (
            key === 'icmpping' ||
            key === 'icmpping[]' ||
            key.startsWith('icmpping[') ||
            key.includes('icmp') ||
            name.includes('icmp ping') ||
            name.includes('ping response') ||
            name.includes('icmp response')
          );
        });

        if (icmpItem) {
          console.log(`✓ Found ICMP item for ${host.name}:`, { 
            key: icmpItem.key_, 
            name: icmpItem.name, 
            lastvalue: icmpItem.lastvalue,
            status: icmpItem.status,
            state: icmpItem.state,
            lastclock: icmpItem.lastclock,
            lastclockTime: new Date(parseInt(icmpItem.lastclock) * 1000).toISOString()
          });

          // Check if data is recent (within last 10 minutes - increased threshold)
          const currentTime = Math.floor(Date.now() / 1000);
          const lastUpdate = parseInt(icmpItem.lastclock || '0');
          const ageSeconds = currentTime - lastUpdate;
          const isRecent = ageSeconds < 600; // 10 minutes instead of 5

          console.log(`  Data age: ${ageSeconds} seconds (${isRecent ? 'RECENT' : 'STALE'})`);

          // Parse ICMP value - handle both string and number values, accept stale data if recent data unavailable
          if (icmpItem.lastvalue !== undefined && icmpItem.lastvalue !== null && icmpItem.lastvalue !== '') {
            const strValue = String(icmpItem.lastvalue).trim();
            const numValue = parseFloat(strValue);

            console.log(`  Raw value: "${icmpItem.lastvalue}" (type: ${typeof icmpItem.lastvalue})`);
            console.log(`  String value: "${strValue}"`);
            console.log(`  Numeric value: ${numValue} (isNaN: ${isNaN(numValue)})`);

            if (!isNaN(numValue)) {
              icmpStatus = numValue > 0 ? "responding" : "no response";
            } else if (strValue === '1' || strValue.toLowerCase() === 'up') {
              icmpStatus = "responding";
            } else if (strValue === '0' || strValue.toLowerCase() === 'down') {
              icmpStatus = "no response";
            } else {
              icmpStatus = "unknown";
            }
            console.log(`  → ICMP Status: ${icmpStatus}`);
          } else {
            icmpStatus = isRecent ? "no data" : "stale data";
            console.log(`  → ICMP Status: ${icmpStatus} (no valid value or stale)`);
          }
        } else {
          const activeItems = items.filter(i => i.status === '0' || i.status === 0);
          console.log(`✗ No ICMP item found for ${host.name}`);
          console.log(`  Available active items (${activeItems.length}):`, activeItems.slice(0, 10).map(i => ({ key: i.key_, name: i.name, lastvalue: i.lastvalue })));
          icmpStatus = "not configured";
        }

        // Agent ping detection - comprehensive search with better logging
        const agentItem = items.find(i => {
          const key = (i.key_ || '').toLowerCase();
          const name = (i.name || '').toLowerCase();
          const isEnabled = i.status === '0' || i.status === 0; // Only active items
          return isEnabled && (
            key === 'agent.ping' ||
            key === 'agent.ping[]' ||
            key.startsWith('agent.ping[') ||
            key.includes('agent.ping') ||
            name.includes('agent ping') ||
            name.includes('zabbix agent ping') ||
            name.includes('agent availability')
          );
        });

        if (agentItem) {
          console.log(`✓ Found Agent item for ${host.name}:`, { 
            key: agentItem.key_, 
            name: agentItem.name, 
            lastvalue: agentItem.lastvalue,
            status: agentItem.status,
            state: agentItem.state,
            lastclock: agentItem.lastclock,
            lastclockTime: new Date(parseInt(agentItem.lastclock) * 1000).toISOString()
          });

          // Check if data is recent (within last 10 minutes - increased threshold)
          const currentTime = Math.floor(Date.now() / 1000);
          const lastUpdate = parseInt(agentItem.lastclock || '0');
          const ageSeconds = currentTime - lastUpdate;
          const isRecent = ageSeconds < 600; // 10 minutes instead of 5

          console.log(`  Data age: ${ageSeconds} seconds (${isRecent ? 'RECENT' : 'STALE'})`);

          // Parse Agent value - handle both string and number values, accept stale data if recent data unavailable
          if (agentItem.lastvalue !== undefined && agentItem.lastvalue !== null && agentItem.lastvalue !== '') {
            const strValue = String(agentItem.lastvalue).trim();
            const agentValue = parseFloat(strValue);

            console.log(`  Raw value: "${agentItem.lastvalue}" (type: ${typeof agentItem.lastvalue})`);
            console.log(`  String value: "${strValue}"`);
            console.log(`  Numeric value: ${agentValue} (isNaN: ${isNaN(agentValue)})`);

            if (!isNaN(agentValue)) {
              agentStatus = agentValue > 0 ? "available" : "unavailable";
            } else if (strValue === '1' || strValue.toLowerCase() === 'up') {
              agentStatus = "available";
            } else if (strValue === '0' || strValue.toLowerCase() === 'down') {
              agentStatus = "unavailable";
            } else {
              agentStatus = "unknown";
            }
            console.log(`  → Agent Status: ${agentStatus}`);
          } else {
            agentStatus = isRecent ? "no data" : "stale data";
            console.log(`  → Agent Status: ${agentStatus} (no valid value or stale)`);
          }
        } else {
          const activeItems = items.filter(i => i.status === '0' || i.status === 0);
          console.log(`✗ No Agent item found for ${host.name}`);
          console.log(`  Available active items (${activeItems.length}):`, activeItems.slice(0, 10).map(i => ({ key: i.key_, name: i.name, lastvalue: i.lastvalue })));
          agentStatus = "not configured";
        }

        // Determine final availability status with improved logic
        // Use a scoring system to determine the most accurate status
        let availabilityScore = 0; // Positive = available, Negative = unavailable
        
        // Direct Ping has highest weight (3 points)
        if (directPingStatus === "responding") {
          availabilityScore += 3;
        } else if (directPingStatus === "no response") {
          availabilityScore -= 3;
        }
        
        // ICMP check has medium weight (2 points)
        if (icmpStatus === "responding") {
          availabilityScore += 2;
        } else if (icmpStatus === "no response") {
          availabilityScore -= 2;
        }
        
        // Agent check has medium weight (2 points)
        if (agentStatus === "available") {
          availabilityScore += 2;
        } else if (agentStatus === "unavailable") {
          availabilityScore -= 2;
        }
        
        // Interface availability has low weight (1 point)
        if (hasAvailableInterface) {
          availabilityScore += 1;
        } else if (hasUnavailableInterface) {
          availabilityScore -= 1;
        }
        
        // Determine final status based on score
        if (availabilityScore > 0) {
          availabilityStatus = "available";
        } else if (availabilityScore < 0) {
          availabilityStatus = "unavailable";
        } else {
          // Score is 0 - all checks are inconclusive
          availabilityStatus = "unknown";
        }
        
        console.log(`Final status for ${host.name}: ${availabilityStatus} (score: ${availabilityScore})`)

        console.log(`Host ${host.name} (${host.hostid}): availability=${availabilityStatus}, directPing=${directPingStatus}, icmp=${icmpStatus}, agent=${agentStatus}, interfaces=${hasAvailableInterface}/${hasUnavailableInterface}`);

        return {
          ...host,
          ipAddress: host.interfaces?.[0]?.ip ?? "N/A",
          groups: host.groups?.map((g: any) => g.name).join(", ") || "None",
          availabilityStatus,
          icmpStatus,
          agentStatus,
          directPingStatus,
          monitoringEnabled: parseInt(host.status) === 0
        };
      }));

      res.json(enriched);
    } catch (err: any) {
      console.error("Error /api/zabbix/hosts:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Get metrics for selected hosts
  app.post("/api/zabbix/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { hostIds } = req.body;

      const settingsResult = await db.execute(sql`
        SELECT * FROM zabbix_settings LIMIT 1
      `);

      if (!settingsResult.rows[0]) {
        return res.status(400).json({ message: "Zabbix not configured" });
      }

      const settings = settingsResult.rows[0];

      // Ensure URL is properly formatted
      let apiUrl = settings.zabbix_url;
      if (!apiUrl.endsWith('/api_jsonrpc.php')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api_jsonrpc.php`;
      }
      const baseUrl = apiUrl.replace('/api_jsonrpc.php', '');

      const metrics = [];

      for (const hostId of hostIds) {
        // Get host info with interfaces including availability
        const hostInfo = await zabbixApiRequest(
          {
            zabbixUrl: baseUrl,
            zabbixApiToken: settings.zabbix_api_token,
            refreshInterval: settings.refresh_interval
          },
          'host.get',
          {
            hostids: [hostId],
            output: [
              'hostid', 'host', 'name', 'available', 'status', 'error',
              'snmp_available', 'ipmi_available', 'jmx_available'
            ],
            selectInterfaces: ['ip', 'available', 'main', 'type', 'error']
          }
        );

        if (!hostInfo || hostInfo.length === 0) continue;

        const host = hostInfo[0];

        // Get all items for this host
        const allItems = await zabbixApiRequest(
          {
            zabbixUrl: baseUrl,
            zabbixApiToken: settings.zabbix_api_token,
            refreshInterval: settings.refresh_interval
          },
          'item.get',
          {
            hostids: [hostId],
            output: ['itemid', 'key_', 'lastvalue', 'name', 'units'],
            monitored: true,
            sortfield: 'name'
          }
        );

        // Find relevant metrics with fallbacks
        const cpuItem = allItems.find((item: any) => 
          item.key_.includes('cpu.util') || 
          item.key_.includes('system.cpu') ||
          item.name.toLowerCase().includes('cpu')
        );

        const memItem = allItems.find((item: any) => 
          item.key_.includes('memory.util') || 
          item.key_.includes('vm.memory') ||
          item.name.toLowerCase().includes('memory utilization')
        );

        const diskItem = allItems.find((item: any) => 
          item.key_.includes('fs.pused') || 
          item.key_.includes('disk') ||
          item.name.toLowerCase().includes('disk space')
        );

        const uptimeItem = allItems.find((item: any) => 
          item.key_.includes('system.uptime') || 
          item.key_.includes('uptime') ||
          item.name.toLowerCase().includes('uptime')
        );

        // Get network traffic
        const netInItem = allItems.find((item: any) => 
          item.key_.includes('net.if.in') || 
          item.name.toLowerCase().includes('incoming')
        );

        const netOutItem = allItems.find((item: any) => 
          item.key_.includes('net.if.out') || 
          item.name.toLowerCase().includes('outgoing')
        );

        // Calculate uptime
        let uptimeValue = "N/A";
        if (uptimeItem && uptimeItem.lastvalue) {
          const uptimeSeconds = parseFloat(uptimeItem.lastvalue);
          if (!isNaN(uptimeSeconds)) {


  // Debug endpoint - Get all items for a specific host
  app.get("/api/zabbix/debug/host/:hostId/items", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { hostId } = req.params;

      const settingsResult = await db.execute(sql`
        SELECT * FROM zabbix_settings LIMIT 1
      `);

      if (!settingsResult.rows[0]) {
        return res.status(400).json({ message: "Zabbix not configured" });
      }

      const settings = settingsResult.rows[0];
      let apiUrl = settings.zabbix_url;
      if (!apiUrl.endsWith('/api_jsonrpc.php')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api_jsonrpc.php`;
      }
      const baseUrl = apiUrl.replace('/api_jsonrpc.php', '');

      const items = await zabbixApiRequest(
        {
          zabbixUrl: baseUrl,
          zabbixApiToken: settings.zabbix_api_token,
          refreshInterval: settings.refresh_interval
        },
        'item.get',
        {
          hostids: [hostId],
          output: ['itemid', 'key_', 'lastvalue', 'name', 'state', 'status', 'lastclock'],
          sortfield: 'name'
        }
      );

      res.json({
        hostId,
        totalItems: items.length,
        items: items.map((item: any) => ({
          key: item.key_,
          name: item.name,
          lastvalue: item.lastvalue,
          state: item.state,
          status: item.status,
          lastclock: item.lastclock
        }))
      });
    } catch (error: any) {
      console.error('Error fetching debug items:', error);
      res.status(500).json({ message: error.message });
    }
  });

            uptimeValue = formatUptime(uptimeSeconds);
          }
        }

        // Check ICMP ping and agent status from items
        let metricStatus = 'unknown';
        let icmpStatus = 'unknown';
        let agentCheckStatus = 'unknown';
        let directPingStatus = 'unknown';

        // Perform direct ping check
        const ipAddress = host.interfaces?.[0]?.ip;
        if (ipAddress && ipAddress !== "N/A") {
          try {
            const pingResult = await pingHost(ipAddress);
            directPingStatus = pingResult ? "responding" : "no response";
          } catch (err) {
            directPingStatus = "error";
          }
        } else {
          directPingStatus = "no ip";
        }

        // Find ICMP ping item - try multiple possible keys with better value parsing
        const icmpPingItem = allItems.find((item: any) =>
          (item.key_ && (
            item.key_.toLowerCase() === 'icmpping' ||
            item.key_.toLowerCase() === 'icmpping[]' ||
            item.key_.toLowerCase().startsWith('icmpping[') ||
            item.key_.toLowerCase().includes('icmp')
          )) ||
          (item.name && (
            item.name.toLowerCase().includes('icmp ping') ||
            item.name.toLowerCase().includes('ping response')
          ))
        );

        if (icmpPingItem && icmpPingItem.lastvalue !== undefined && icmpPingItem.lastvalue !== null && icmpPingItem.lastvalue !== '') {
          const strValue = String(icmpPingItem.lastvalue).trim();
          const pingValue = parseFloat(strValue);

          if (!isNaN(pingValue)) {
            icmpStatus = pingValue > 0 ? 'responding' : 'no response';
          } else if (strValue === '1' || strValue.toLowerCase() === 'up') {
            icmpStatus = 'responding';
          } else if (strValue === '0' || strValue.toLowerCase() === 'down') {
            icmpStatus = 'no response';
          } else {
            icmpStatus = 'unknown';
          }
        } else {
          icmpStatus = 'not configured';
        }

        // Find agent.ping item - try multiple possible keys with better value parsing
        const agentPingItem = allItems.find((item: any) => 
          item.key_ === 'agent.ping' || 
          item.key_ === 'agent.ping[]' ||
          (item.key_ && item.key_.toLowerCase().startsWith('agent.ping[')) ||
          (item.name && item.name.toLowerCase().includes('agent ping'))
        );

        if (agentPingItem && agentPingItem.lastvalue !== undefined && agentPingItem.lastvalue !== null && agentPingItem.lastvalue !== '') {
          const strValue = String(agentPingItem.lastvalue).trim();
          const agentValue = parseFloat(strValue);

          if (!isNaN(agentValue)) {
            agentCheckStatus = agentValue > 0 ? 'available' : 'unavailable';
          } else if (strValue === '1' || strValue.toLowerCase() === 'up') {
            agentCheckStatus = 'available';
          } else if (strValue === '0' || strValue.toLowerCase() === 'down') {
            agentCheckStatus = 'unavailable';
          } else {
            agentCheckStatus = 'unknown';
          }
        } else {
          agentCheckStatus = 'not configured';
        }

        // Check interface availability
        let hasAvailableInterface = false;
        let hasUnavailableInterface = false;
        if (host.interfaces && host.interfaces.length > 0) {
          for (const iface of host.interfaces) {
            const ifaceAvailable = parseInt(iface.available || '0');
            if (ifaceAvailable === 1) {
              hasAvailableInterface = true;
              break;
            } else if (ifaceAvailable === 2) {
              hasUnavailableInterface = true;
            }
          }
        }

        // Use scoring system to determine most accurate status
        let metricScore = 0;
        
        // Direct Ping (3 points)
        if (directPingStatus === 'responding') metricScore += 3;
        else if (directPingStatus === 'no response') metricScore -= 3;
        
        // ICMP check (2 points)
        if (icmpStatus === 'responding') metricScore += 2;
        else if (icmpStatus === 'no response') metricScore -= 2;
        
        // Agent check (2 points)
        if (agentCheckStatus === 'available') metricScore += 2;
        else if (agentCheckStatus === 'unavailable') metricScore -= 2;
        
        // Interface availability (1 point)
        if (hasAvailableInterface) metricScore += 1;
        else if (hasUnavailableInterface) metricScore -= 1;
        
        // Determine final status
        if (metricScore > 0) {
          metricStatus = 'available';
        } else if (metricScore < 0) {
          metricStatus = 'unavailable';
        } else {
          metricStatus = 'unknown';
        }
        
        console.log(`Metrics status for ${host.name}: ${metricStatus} (score: ${metricScore}, directPing: ${directPingStatus}, icmp: ${icmpStatus}, agent: ${agentCheckStatus})`)

        metrics.push({
          hostid: hostId,
          hostname: host.name,
          host: host.host,
          ipAddress: host.interfaces?.[0]?.ip || 'N/A',
          cpuUtilization: parseItemValue(cpuItem?.lastvalue),
          memoryUtilization: parseItemValue(memItem?.lastvalue),
          diskUsage: parseItemValue(diskItem?.lastvalue),
          uptime: uptimeValue,
          networkIn: parseItemValue(netInItem?.lastvalue),
          networkOut: parseItemValue(netOutItem?.lastvalue),
          status: metricStatus,
          monitoringStatus: host.status === "0" ? "monitored" : "not monitored",
          icmpStatus,
          agentCheckStatus,
          directPingStatus
        });
      }

      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current problems
  app.get("/api/zabbix/problems", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const settingsResult = await db.execute(sql`
        SELECT * FROM zabbix_settings LIMIT 1
      `);

      if (!settingsResult.rows[0]) {
        return res.status(400).json({ message: "Zabbix not configured" });
      }

      const settings = settingsResult.rows[0];

      // Ensure URL is properly formatted
      let apiUrl = settings.zabbix_url;
      if (!apiUrl.endsWith('/api_jsonrpc.php')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api_jsonrpc.php`;
      }
      const baseUrl = apiUrl.replace('/api_jsonrpc.php', '');

      // Get problems without selectHosts (compatibility with Zabbix 7.4)
      const problems = await zabbixApiRequest(
        {
          zabbixUrl: baseUrl,
          zabbixApiToken: settings.zabbix_api_token,
          refreshInterval: settings.refresh_interval
        },
        'problem.get',
        {
          output: ['eventid', 'objectid', 'name', 'severity', 'acknowledged', 'clock', 'r_eventid'],
          recent: true,
          sortfield: 'eventid',
          sortorder: 'DESC'
        }
      );

      // Get trigger IDs for batch processing
      const triggerIds = problems.map((p: any) => p.objectid);

      // Fetch all triggers in one request to reduce connections
      let triggerHostMap: { [key: string]: { hostname: string; host: string } } = {};

      if (triggerIds.length > 0) {
        try {
          const triggers = await zabbixApiRequest(
            {
              zabbixUrl: baseUrl,
              zabbixApiToken: settings.zabbix_api_token,
              refreshInterval: settings.refresh_interval
            },
            'trigger.get',
            {
              triggerids: triggerIds,
              output: ['triggerid'],
              selectHosts: ['host', 'name']
            }
          );

          // Build trigger to host mapping
          triggers.forEach((trigger: any) => {
            if (trigger.hosts && trigger.hosts.length > 0) {
              triggerHostMap[trigger.triggerid] = {
                hostname: trigger.hosts[0].name || 'Unknown',
                host: trigger.hosts[0].host || 'Unknown'
              };
            }
          });
        } catch (err) {
          console.error('Error fetching hosts for problems:', err);
        }
      }

      // Map problems with host information
      const formattedProblems = problems.map((problem: any) => {
        const hostInfo = triggerHostMap[problem.objectid] || { hostname: 'Unknown', host: 'Unknown' };

        return {
          eventid: problem.eventid,
          name: problem.name,
          severity: parseInt(problem.severity),
          hostname: hostInfo.hostname,
          host: hostInfo.host,
          acknowledged: problem.acknowledged,
          clock: problem.clock,
          tags: [],
          resolved: problem.r_eventid ? true : false
        };
      });

      res.json(formattedProblems);
    } catch (error: any) {
      console.error('Error fetching problems:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get historical data for charts
  app.post("/api/zabbix/history", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { hostId, itemKey, timeFrom } = req.body;

      const settingsResult = await db.execute(sql`
        SELECT * FROM zabbix_settings LIMIT 1
      `);

      if (!settingsResult.rows[0]) {
        return res.status(400).json({ message: "Zabbix not configured" });
      }

      const settings = settingsResult.rows[0];
      let apiUrl = settings.zabbix_url;
      if (!apiUrl.endsWith('/api_jsonrpc.php')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api_jsonrpc.php`;
      }
      const baseUrl = apiUrl.replace('/api_jsonrpc.php', '');

      // Get item ID
      const items = await zabbixApiRequest(
        {
          zabbixUrl: baseUrl,
          zabbixApiToken: settings.zabbix_api_token,
          refreshInterval: settings.refresh_interval
        },
        'item.get',
        {
          hostids: [hostId],
          search: { key_: itemKey },
          output: ['itemid', 'value_type']
        }
      );

      if (!items || items.length === 0) {
        return res.json([]);
      }

      const item = items[0];
      const history = await zabbixApiRequest(
        {
          zabbixUrl: baseUrl,
          zabbixApiToken: settings.zabbix_api_token,
          refreshInterval: settings.refresh_interval
        },
        'history.get',
        {
          itemids: [item.itemid],
          time_from: timeFrom || Math.floor(Date.now() / 1000) - 3600,
          output: 'extend',
          sortfield: 'clock',
          sortorder: 'ASC',
          limit: 100
        }
      );

      res.json(history);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      res.status(500).json({ message: error.message });
    }
  });
}