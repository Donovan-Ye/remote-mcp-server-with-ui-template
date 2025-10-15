import { ToolType } from "../../types";
import { clickhouseGlobalTryCatch } from "../utils";

const listTablesTool: ToolType = {
  name: "clickhouse: list tables",
  description: "List available ClickHouse tables in a database, including schema, comment, row count, and column count.",
  paramsSchemaOrAnnotations: {},
  callback: async () => {
    return clickhouseGlobalTryCatch(async (client) => {
      // Query to get table information including schema, comments, row count, and column count
      const query = `
        SELECT 
          database,
          name as table_name,
          engine,
          comment,
          total_rows
        FROM system.tables 
        WHERE database = currentDatabase()
        ORDER BY name
      `;

      const result = await client.query({ query, format: 'JSON' });
      const tables = await result.json();

      if (!tables?.data || tables?.data?.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No tables found in the database."
          }]
        };
      }

      let output = "Available ClickHouse Tables:\n\n";

      tables.data.forEach((table: any) => {
        output += `Database: ${table.database}\n`;
        output += `Table: ${table.table_name}\n`;
        output += `Engine: ${table.engine}\n`;
        output += `Comment: ${table.comment || 'No comment'}\n`;
        output += `Row Count: ${table.total_rows || 0}\n`;
        output += `Column Count: ${table.total_columns || 0}\n`;
        output += "---\n";
      });

      return {
        content: [{
          type: "text",
          text: output
        }]
      };
    })
  },
};

export default listTablesTool;
