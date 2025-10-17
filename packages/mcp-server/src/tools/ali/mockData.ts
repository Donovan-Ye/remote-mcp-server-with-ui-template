/**
 * Mock data generators for Ali Cloud SLS
 */

export interface MockProject {
  createTime: string;
  dataRedundancyType: string;
  description: string;
  lastModifyTime: string;
  owner: string;
  projectName: string;
  region: string;
  resourceGroupId: string;
  status: string;
}

export interface MockLogStore {
  name: string;
  ttl: number;
  shardCount: number;
  createTime: number;
  lastModifyTime: number;
}

export interface MockLog {
  __time__: number;
  __source__: string;
  level: string;
  message: string;
  service: string;
  traceId?: string;
  userId?: string;
  ip?: string;
  duration?: number;
  status?: number;
  [key: string]: any;
}

// Mock projects data
const MOCK_PROJECTS: MockProject[] = [
  {
    createTime: '2024-01-15T08:00:00Z',
    dataRedundancyType: 'LRS',
    description: 'Production environment logs',
    lastModifyTime: '2024-10-15T10:30:00Z',
    owner: 'mock-owner',
    projectName: 'prod-logs',
    region: 'cn-hangzhou',
    resourceGroupId: 'rg-mock-001',
    status: 'Normal',
  },
  {
    createTime: '2024-02-20T09:00:00Z',
    dataRedundancyType: 'LRS',
    description: 'Staging environment logs',
    lastModifyTime: '2024-10-15T09:00:00Z',
    owner: 'mock-owner',
    projectName: 'staging-logs',
    region: 'cn-hangzhou',
    resourceGroupId: 'rg-mock-002',
    status: 'Normal',
  },
  {
    createTime: '2024-03-10T10:00:00Z',
    dataRedundancyType: 'LRS',
    description: 'Development environment logs',
    lastModifyTime: '2024-10-14T15:00:00Z',
    owner: 'mock-owner',
    projectName: 'dev-logs',
    region: 'cn-hangzhou',
    resourceGroupId: 'rg-mock-003',
    status: 'Normal',
  },
];

// Mock logstores per project
const MOCK_LOGSTORES: Record<string, string[]> = {
  'prod-logs': ['app-logs', 'nginx-access', 'nginx-error', 'database-logs', 'audit-logs'],
  'staging-logs': ['app-logs', 'nginx-access', 'nginx-error', 'test-logs'],
  'dev-logs': ['app-logs', 'debug-logs', 'test-logs'],
};

// Generate random log messages
const LOG_MESSAGES = [
  'User login successful',
  'Database query executed',
  'API request processed',
  'Cache hit',
  'Cache miss',
  'Payment processed successfully',
  'Email sent',
  'File uploaded',
  'Background job completed',
  'Authentication failed',
  'Validation error',
  'Connection timeout',
  'Resource not found',
  'Permission denied',
  'Internal server error',
];

const SERVICES = ['auth-service', 'payment-service', 'user-service', 'notification-service', 'file-service'];
const LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const SOURCES = ['server-001', 'server-002', 'server-003', 'server-004', 'server-005'];

/**
 * Generate a random trace ID
 */
function generateTraceId(): string {
  return `trace-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a random IP address
 */
function generateIp(): string {
  return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Generate mock logs
 */
export function generateMockLogs(params: {
  projectName: string;
  logstoreName: string;
  from: number;
  to: number;
  query?: string;
  line?: number;
  offset?: number;
  reverse?: boolean;
}): MockLog[] {
  const { from, to, line = 100, offset = 0, reverse = false } = params;

  const logs: MockLog[] = [];
  const count = Math.min(line, 100); // Cap at 100 logs

  for (let i = 0; i < count; i++) {
    const timestamp = from + Math.floor(Math.random() * (to - from));
    const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
    const message = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];

    const log: MockLog = {
      __time__: timestamp,
      __source__: source,
      level,
      message,
      service,
      traceId: generateTraceId(),
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      ip: generateIp(),
      duration: Math.floor(Math.random() * 1000),
      status: [200, 201, 400, 404, 500][Math.floor(Math.random() * 5)],
    };

    logs.push(log);
  }

  // Sort by timestamp
  logs.sort((a, b) => reverse ? b.__time__ - a.__time__ : a.__time__ - b.__time__);

  // Apply offset
  return logs.slice(offset);
}

/**
 * Mock client that mimics Ali Cloud SLS SDK structure
 */
export class MockAliClient {
  async listProject(request: any) {
    return {
      headers: {
        'x-log-requestid': `mock-request-${Date.now()}`,
        'content-type': 'application/json',
      },
      statusCode: 200,
      body: {
        count: MOCK_PROJECTS.length,
        total: MOCK_PROJECTS.length,
        projects: MOCK_PROJECTS,
      },
    };
  }

  async listLogStores(projectName: string, request: any) {
    const logstores = MOCK_LOGSTORES[projectName] || [];

    return {
      headers: {
        'x-log-requestid': `mock-request-${Date.now()}`,
        'content-type': 'application/json',
      },
      statusCode: 200,
      body: {
        count: logstores.length,
        total: logstores.length,
        logstores,
      },
    };
  }

  async getLogs(projectName: string, logstoreName: string, request: any) {
    const logs = generateMockLogs({
      projectName,
      logstoreName,
      from: request.from,
      to: request.to,
      query: request.query,
      line: request.line,
      offset: request.offset,
      reverse: request.reverse,
    });

    return {
      headers: {
        'x-log-requestid': `mock-request-${Date.now()}`,
        'content-type': 'application/json',
        'x-log-count': logs.length.toString(),
        'x-log-progress': 'Complete',
      },
      statusCode: 200,
      body: logs,
    };
  }
}

/**
 * Mock request classes
 */
export class MockListProjectRequest {
  constructor(params: any) { }
}

export class MockListLogStoresRequest {
  project: string;

  constructor(params: { project: string }) {
    this.project = params.project;
  }
}

export class MockGetLogsRequest {
  project: string;
  logstore: string;
  from: number;
  to: number;
  query: string;
  topic: string;
  line: number;
  offset: number;
  reverse: boolean;
  powerSql: boolean;

  constructor(params: {
    project: string;
    logstore: string;
    from: number;
    to: number;
    query?: string;
    topic?: string;
    line?: number;
    offset?: number;
    reverse?: boolean;
    powerSql?: boolean;
  }) {
    this.project = params.project;
    this.logstore = params.logstore;
    this.from = params.from;
    this.to = params.to;
    this.query = params.query || '*';
    this.topic = params.topic || '';
    this.line = params.line || 100;
    this.offset = params.offset || 0;
    this.reverse = params.reverse || false;
    this.powerSql = params.powerSql || false;
  }
}

/**
 * Mock SDK module
 */
export const MockSls = {
  ListProjectRequest: MockListProjectRequest,
  ListLogStoresRequest: MockListLogStoresRequest,
  GetLogsRequest: MockGetLogsRequest,
};

