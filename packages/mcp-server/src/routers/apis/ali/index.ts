import { Router } from 'express';
import { MockSls, MockAliClient } from '../../../tools/ali/mockData';

const aliRouter = Router();

// Get all projects
aliRouter.get('/projects', async (req, res) => {
  try {
    const client = new MockAliClient();
    let listProjectRequest = new MockSls.ListProjectRequest({});
    const listProjectResponse = await client.listProject(listProjectRequest);
    res.json(listProjectResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get logstores by project name
aliRouter.get('/projects/:projectName/logstores', async (req, res) => {
  try {
    const { projectName } = req.params;

    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const client = new MockAliClient();
    let listLogstoresRequest = new MockSls.ListLogStoresRequest({
      project: projectName,
    });
    let listLogStoresResponse = await client.listLogStores(projectName, listLogstoresRequest);
    res.json(listLogStoresResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs by project name and logstore name with query parameters
aliRouter.get('/projects/:projectName/logstores/:logstoreName/logs', async (req, res) => {
  try {
    const { projectName, logstoreName } = req.params;
    const { from, to, query, topic, line, offset, reverse, powerSql } = req.query;

    if (!projectName || !logstoreName) {
      return res.status(400).json({ error: 'Project name and logstore name are required' });
    }

    const client = new MockAliClient();
    const defaultFrom = Math.floor((Date.now() - 3600000) / 1000); // 1 hour ago
    const defaultTo = Math.floor(Date.now() / 1000); // now

    let getLogsRequest = new MockSls.GetLogsRequest({
      project: projectName,
      logstore: logstoreName,
      from: from ? Number(from) : defaultFrom,
      to: to ? Number(to) : defaultTo,
      query: query ? String(query) : "*", // Default query to get all logs
      topic: topic ? String(topic) : "", // Default to empty string
      line: line ? Number(line) : 100, // Default to 100
      offset: offset ? Number(offset) : 0, // Default to 0
      reverse: reverse === 'true', // Default to false
      powerSql: powerSql === 'true', // Default to false
    });

    const getLogsResponse = await client.getLogs(projectName, logstoreName, getLogsRequest);
    res.json(getLogsResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default aliRouter;
