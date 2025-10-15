import request from '../request';
import {
  LogQueryParams,
  LogResponse,
  ProjectsResponse,
  LogStoresResponse,
} from './types';

const API_PATH = 'ali';

/**
 * Get all projects
 */
export const getProjects = async () => {
  return await request<ProjectsResponse>({
    method: 'GET',
    url: `/${API_PATH}/projects`
  });
};

/**
 * Get logstores by project name
 */
export const getLogstores = async (projectName: string) => {
  return await request<LogStoresResponse>({
    method: 'GET',
    url: `/${API_PATH}/projects/${projectName}/logstores`
  });
};

/**
 * Get logs by project name, logstore name, and query parameters
 */
export const getLogs = async (
  projectName: string,
  logstoreName: string,
  params: LogQueryParams = {}
) => {
  return await request<LogResponse>({
    method: 'GET',
    url: `/${API_PATH}/projects/${projectName}/logstores/${logstoreName}/logs`,
    params
  });
};
