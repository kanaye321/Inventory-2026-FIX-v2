import { promises as fs } from 'fs';
import { join } from 'path';

const LOGS_DIR = join(process.cwd(), 'LOGS');

// Ensure logs directory exists
async function ensureLogsDirectory() {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }
}

// Format log entry
function formatLogEntry(type: string, data: any): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${type}] ${JSON.stringify(data, null, 2)}\n`;
}

// Write to log file
async function writeToLogFile(filename: string, content: string) {
  await ensureLogsDirectory();
  const filepath = join(LOGS_DIR, filename);
  await fs.appendFile(filepath, content);
}

// Log user activity
export async function logUserActivity(activity: {
  userId?: number;
  username?: string;
  action: string;
  itemType?: string;
  itemId?: number;
  details?: string;
  ipAddress?: string;
}) {
  const logEntry = formatLogEntry('USER_ACTIVITY', {
    ...activity,
    timestamp: new Date().toISOString()
  });

  const dateStr = new Date().toISOString().split('T')[0];
  await writeToLogFile(`user_activity_${dateStr}.log`, logEntry);
}

// Log user login/logout
export async function logUserAuth(data: {
  userId?: number;
  username: string;
  action: 'login' | 'logout' | 'failed_login';
  ipAddress?: string;
  userAgent?: string;
}) {
  const logEntry = formatLogEntry('AUTH', {
    ...data,
    timestamp: new Date().toISOString()
  });

  const dateStr = new Date().toISOString().split('T')[0];
  await writeToLogFile(`auth_${dateStr}.log`, logEntry);
}

// Log system alerts
export async function logSystemAlert(alert: {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
}) {
  const logEntry = formatLogEntry('ALERT', {
    ...alert,
    timestamp: new Date().toISOString()
  });

  const dateStr = new Date().toISOString().split('T')[0];
  await writeToLogFile(`system_alerts_${dateStr}.log`, logEntry);
}

// Log database operations
export async function logDatabaseOperation(operation: {
  type: 'backup' | 'restore' | 'optimize' | 'migration';
  status: 'started' | 'completed' | 'failed';
  details?: string;
  error?: string;
}) {
  const logEntry = formatLogEntry('DATABASE', {
    ...operation,
    timestamp: new Date().toISOString()
  });

  const dateStr = new Date().toISOString().split('T')[0];
  await writeToLogFile(`database_ops_${dateStr}.log`, logEntry);
}

// Log API requests
export async function logApiRequest(request: {
  method: string;
  path: string;
  userId?: number;
  statusCode?: number;
  duration?: number;
  error?: string;
}) {
  const logEntry = formatLogEntry('API', {
    ...request,
    timestamp: new Date().toISOString()
  });

  const dateStr = new Date().toISOString().split('T')[0];
  await writeToLogFile(`api_requests_${dateStr}.log`, logEntry);
}

// Get log files list
export async function getLogFiles(): Promise<string[]> {
  await ensureLogsDirectory();
  const files = await fs.readdir(LOGS_DIR);
  return files.filter(f => f.endsWith('.log'));
}

// Read log file
export async function readLogFile(filename: string): Promise<string> {
  const filepath = join(LOGS_DIR, filename);
  return await fs.readFile(filepath, 'utf-8');
}