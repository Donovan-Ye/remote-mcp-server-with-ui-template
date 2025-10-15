# MCP Tools

This directory contains MCP (Model Context Protocol) tools that can be used by AI assistants to interact with external services and APIs.

## 📁 Directory Structure

```
tools/
├── README.md           # This file
├── index.ts            # Tool registration and configuration
├── types.ts            # TypeScript type definitions
├── ali/                # Ali Cloud SLS integration (example)
├── clickhouse/         # ClickHouse integration (example)
└── userInfo/           # User info tool (example)
```

## 🛠️ Creating Custom Tools

### Step 1: Create Tool Directory

Create a new directory for your tool:

```bash
mkdir -p packages/mcp-server/src/tools/my-tool
```

### Step 2: Define Your Tool

Create `packages/mcp-server/src/tools/my-tool/index.ts`:

```typescript
import z from "zod";
import { ToolType } from "../types";

// Define parameter schema using Zod
const paramsSchema = {
  query: z.string().describe("The search query"),
  limit: z.number().optional().describe("Maximum results (default: 10)"),
};

// Create the tool
const myTool: ToolType<typeof paramsSchema> = {
  name: "my-service: search",
  description: "Search for information in my service",
  paramsSchemaOrAnnotations: paramsSchema,
  callback: async ({ query, limit = 10 }) => {
    try {
      // Your implementation here
      const results = await searchMyService(query, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export default myTool;
```

### Step 3: Register Your Tool

Add your tool to `packages/mcp-server/src/tools/index.ts`:

```typescript
import myTool from "./my-tool";

const enabledTools: any[] = [
  myTool,
  // Other tools...
];
```

### Step 4: Add Documentation

Create `packages/mcp-server/src/tools/my-tool/README.md`:

```markdown
# My Tool

Description of what your tool does.

## Setup

1. Install dependencies
2. Configure environment variables
3. Enable the tool

## Environment Variables

\`\`\`bash
MY_SERVICE_API_KEY=your_api_key
MY_SERVICE_URL=https://api.example.com
\`\`\`

## Usage

Examples of how to use your tool.
```

## 📝 Tool Type Definition

The `ToolType` interface provides a consistent structure:

```typescript
interface ToolType<T = any> {
  name: string; // Unique tool name
  description: string; // What the tool does
  paramsSchemaOrAnnotations: T; // Zod schema for parameters
  callback: (params: any, extra?: any) => Promise<CallToolResult>;
}
```

## 🎨 Best Practices

### 1. Error Handling

Always wrap your tool logic in try-catch:

```typescript
callback: async (params) => {
  try {
    // Your logic
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
};
```

### 2. Parameter Validation

Use Zod for parameter validation:

```typescript
const paramsSchema = {
  email: z.string().email().describe("User email address"),
  age: z.number().min(0).max(150).optional().describe("User age"),
  role: z.enum(["admin", "user"]).describe("User role"),
};
```

### 3. Environment Variables

Store sensitive configuration in environment variables:

```typescript
const apiKey = process.env.MY_SERVICE_API_KEY;
if (!apiKey) {
  throw new Error("MY_SERVICE_API_KEY is not configured");
}
```

### 4. Response Formatting

Return well-formatted responses:

```typescript
return {
  content: [
    {
      type: "text",
      text: `Found ${results.length} results:\n\n${JSON.stringify(results, null, 2)}`,
    },
  ],
};
```

### 5. Multi-step Interactions

Guide users through multi-step processes:

```typescript
callback: async ({ projectId, action }) => {
  if (!projectId) {
    // Step 1: List available projects
    return {
      content: [
        {
          type: "text",
          text: "Available projects:\n" + projects.map((p) => `- ${p.id}: ${p.name}`).join("\n"),
        },
      ],
    };
  }

  if (!action) {
    // Step 2: Show available actions
    return {
      content: [
        {
          type: "text",
          text: "Available actions:\n- analyze\n- export\n- delete",
        },
      ],
    };
  }

  // Step 3: Perform action
  return performAction(projectId, action);
};
```

## 🔌 Optional Tools Pattern

Make tools optional by commenting them out in `index.ts`:

```typescript
// Optional tools - uncomment to enable
// import { aliTools } from "./ali";
// import { clickhouseTools } from "./clickhouse";

const enabledTools: any[] = [
  // ...aliTools,  // Uncomment to enable Ali Cloud SLS
  // ...clickhouseTools,  // Uncomment to enable ClickHouse
];
```

## 🌐 External Service Integration

### Authentication

Store credentials securely:

```typescript
const createClient = () => {
  return new ServiceClient({
    apiKey: process.env.SERVICE_API_KEY,
    endpoint: process.env.SERVICE_ENDPOINT,
  });
};
```

### Rate Limiting

Implement rate limiting for external APIs:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});
```

### Caching

Cache responses to improve performance:

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();

const getCachedOrFetch = async (key: string, fetchFn: () => Promise<any>) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 300000) {
    // 5 minutes
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};
```

## 🔒 Security Considerations

1. **Never commit credentials** - Use environment variables
2. **Validate input** - Use Zod schemas
3. **Sanitize output** - Remove sensitive data from responses
4. **Limit permissions** - Use least-privilege access
5. **Rate limiting** - Prevent abuse
6. **Error messages** - Don't expose internal details

## 📊 Example Tools

### Ali Cloud SLS (`./ali/`)

Query logs from Alibaba Cloud Simple Log Service.

### ClickHouse (`./clickhouse/`)

Execute queries on ClickHouse databases.

### User Info (`./userInfo/`)

Example of accessing user information.

## 🧪 Testing Your Tool

Manual testing checklist:

1. ✅ Tool appears in tool list
2. ✅ Parameters are validated correctly
3. ✅ Success cases return expected results
4. ✅ Error cases are handled gracefully
5. ✅ Environment variables are documented
6. ✅ Documentation is clear and complete

## 📚 Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 💡 Tips

- Keep tools focused on a single responsibility
- Provide clear, descriptive parameter names
- Include examples in your documentation
- Consider edge cases and error scenarios
- Test with real-world data
- Monitor usage and performance

## 🤝 Contributing

See [CONTRIBUTING.md](../../../../CONTRIBUTING.md) for guidelines on contributing new tools.
