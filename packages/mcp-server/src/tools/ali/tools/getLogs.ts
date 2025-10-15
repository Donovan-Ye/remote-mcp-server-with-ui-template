import { createRequire } from 'module';
import z from "zod";
import { ToolType } from "../../types";
import { aliGlobalTryCatch } from "../utils";

const requireCJS = createRequire(import.meta.url);

const paramsSchema = {
  projectName: z.string().optional().describe("Project name. If not provided, will list available projects for selection."),
  logstoreName: z.string().optional().describe("The name of the logstore to get logs from. Required if projectName is provided."),
  from: z.number().optional().describe("Start time (Unix timestamp). The time when log data was written."),
  to: z.number().optional().describe("End time (Unix timestamp). The time when log data was written."),
  query: z.string().optional().describe("Query statement or analysis statement. For more information, see query overview and analysis overview."),
  topic: z.string().optional().describe("Log topic. Default is empty string. For more information, see Log Topic."),
  line: z.number().optional().describe("Maximum number of log entries to return (only valid when query is a query statement). Min: 0, Max: 100, Default: 100."),
  offset: z.number().optional().describe("Query start line (only valid when query is a query statement). Default: 0."),
  reverse: z.boolean().optional().describe("Whether to return results in descending order by log timestamp, accurate to the minute level."),
  powerSql: z.boolean().optional().describe("Whether to use SQL exclusive version. For more information, see Enable SQL exclusive version."),
};

const getLogsTool: ToolType<typeof paramsSchema> = {
  name: "ali: get logs",
  description: "Get logs from Ali Cloud SLS. Call without parameters first to see available projects and logstores.",
  paramsSchemaOrAnnotations: paramsSchema,
  callback: async ({ projectName, logstoreName, from, to, query, topic, line, offset, reverse, powerSql }) => {
    return aliGlobalTryCatch(async (client) => {
      const $Sls = requireCJS('@alicloud/sls20201230');

      // If no project specified, list available projects for user to choose
      if (!projectName) {
        let listProjectRequest = new $Sls.ListProjectRequest({});

        const listProjectResponse = await client.listProject(listProjectRequest);

        return {
          content: [{
            type: "text",
            text: `Available projects to choose from:\n\n${JSON.stringify(listProjectResponse, null, 2)}\n\nPlease call this tool again with a specific projectName to see logstores, or with both projectName and logstoreName to get logs.`
          }],
        };
      }

      // If project specified but no logstore, list logstores
      if (projectName && !logstoreName) {
        let listLogstoresRequest = new $Sls.ListLogStoresRequest({
          project: projectName,
        });

        let listLogStoresResponse = await client.listLogStores(projectName, listLogstoresRequest);

        return {
          content: [{
            type: "text",
            text: `Available logstores in project "${projectName}":\n\n${JSON.stringify(listLogStoresResponse, null, 2)}\n\nPlease call this tool again with both projectName and logstoreName to get logs.`
          }],
        };
      }

      // If both project and logstore specified, get logs
      if (projectName && logstoreName) {
        const defaultFrom = Math.floor((Date.now() - 3600000) / 1000); // 1 hour ago
        const defaultTo = Math.floor(Date.now() / 1000); // now

        let getLogsRequest = new $Sls.GetLogsRequest({
          project: projectName,
          logstore: logstoreName,
          from: from || defaultFrom,
          to: to || defaultTo,
          query: query || "*", // Default query to get all logs
          topic: topic || "", // Default to empty string
          line: line || 100, // Default to 100
          offset: offset || 0, // Default to 0
          reverse: reverse || false, // Default to false
          powerSql: powerSql || false, // Default to false
        });

        const getLogsResponse = await client.getLogs(projectName, logstoreName, getLogsRequest);

        return {
          content: [{
            type: "text",
            text: `Logs from project "${projectName}", logstore "${logstoreName}", total logs length: ${getLogsResponse.body?.length}\n\n${JSON.stringify(getLogsResponse, null, 2)}`
          }],
        };
      }

      return {
        content: [{ type: "text", text: "Please provide projectName and logstoreName parameters." }],
      };
    });
  },
};

export default getLogsTool;
