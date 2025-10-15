export interface LogQueryParams {
  from?: number;
  to?: number;
  query?: string;
  topic?: string;
  line?: number;
  offset?: number;
  reverse?: boolean;
  powerSql?: boolean;
}

export interface LogResponse {
  body?: any[];
  headers?: any;
  [key: string]: any;
}

export interface AliyunProject {
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

interface AliResponse<T> {
  headers: {
    [key: string]: string;
  };
  statusCode: number;
  body: {
    count: number;
    total: number;
    [key: string]: any;
  } & T;
}

export type ProjectsResponse = AliResponse<{
  projects: AliyunProject[];
}>

export type LogStoresResponse = AliResponse<{
  logstores: string[];
}>
