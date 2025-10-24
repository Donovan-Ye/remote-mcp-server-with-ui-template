# Remote MCP Server Template with OAuth & UI

A production-ready template for building remote Model Context Protocol (MCP) servers with OAuth2 authentication, PostgreSQL storage, and a React UI. Perfect for creating custom MCP integrations with enterprise-grade security and user experience.

https://github.com/user-attachments/assets/29b25d51-f7b2-4d67-ada0-e42fab95fbfd

## What's MCP?

MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems.

Learn more at [Model Context Protocol Documentation](https://modelcontextprotocol.io).

## What's Remote MCP Servers?

Remote MCP servers extend AI applications’ capabilities beyond your local environment, providing access to internet-hosted tools, services, and data sources. By connecting to remote MCP servers, you transform AI assistants from helpful tools into informed teammates capable of handling complex, multi-step projects with real-time access to external resources.

For example, in Cursor, you can connect to a remote MCP server by adding the following to your Cursor config:

```json
{
  "remote-mcp-server": {
    "url": "http://localhost:8788/mcp"
  }
}
```

Learn more at [Remote MCP Server Documentation](https://modelcontextprotocol.io/docs/develop/connect-remote-servers).

## What's UI capability?

For current MCP protocol, there is no UI capability. But in some usecases, we need to create a UI to interact with the MCP server, that can reduce the chat turns with LLM. So I add a UI capability to the MCP server by using [mcp-ui](https://github.com/idosal/mcp-ui). So the server can return raw html, iframe url, etc. to the client.

## ✨ Features

- 🔐 **OAuth2 Authentication** with PostgreSQL-backed token storage
- 🌐 **React UI** for interactive tool management
- 🔌 **Pluggable Tool System** - easily add/remove integrations
- 🐳 **Docker Ready** with docker-compose setup
- 📊 **Example Integrations** (Ali Cloud SLS, ClickHouse)
- 🔄 **Session Management** with resumability support
- 🏗️ **Monorepo Structure** using pnpm workspaces
- 📝 **TypeScript** throughout with full type safety

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 17+ (or use Docker)
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd remote-mcp-server-with-ui-template

# Install dependencies
pnpm install

# Set up environment variables
cd packages/mcp-server
cp .env.example .env
# Edit .env with your configuration
cp .env.example .env.production
# Edit .env.production with your configuration, this file will be used when NODE_ENV=production.

# Start PostgreSQL (if not using external database)
pnpm docker:pg

# Run database migrations
pnpm db:migrate:dev

# Back to the root directory
cd ../../
# Start the mcp development server
pnpm dev

# In another terminal, start the UI
pnpm dev:ui

# Or start both by running:
pnpm dev:all
```

The server will be available at:

- **MCP Server**: http://localhost:8788/mcp
- **React UI**: http://localhost:3001/ui
- **Health Check**: http://localhost:8788/health

## 📁 Project Structure

```
remote-mcp-server-with-ui-template/
├── packages/
│   ├── mcp-server/          # MCP server implementation
│   │   ├── src/
│   │   │   ├── index.ts     # Main server entry point
│   │   │   ├── provider/    # OAuth provider implementation
│   │   │   ├── tools/       # MCP tools (pluggable)
│   │   │   ├── stores/      # Database storage
│   │   │   └── routers/     # Express routers
│   │   └── prisma/          # Database schema and migrations
│   └── ui/                  # React UI application
│       └── src/
│           ├── pages/       # UI pages
│           └── components/  # Reusable components
├── docker/                  # Docker configuration
├── .env.example            # Environment variables template
└── README.md
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and edit the variables.

### OAuth 2.0 Authentication

Configure `UPSTREAM_OAUTH_*` variables to integrate with an external OAuth provider. The server will:

1. Redirect users to your OAuth provider
2. Handle the callback
3. Issue its own access tokens
4. Store tokens in PostgreSQL

#### Example: GitHub OAuth2

Here's how to set up GitHub as your OAuth provider:

**1. Create a GitHub OAuth App**

Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App

- **Application name**: Your MCP Server
- **Homepage URL**: `http://localhost:8788` (or your production URL)
- **Authorization callback URL**: `http://localhost:8788/callback`

After creating, you'll get a **Client ID** and can generate a **Client Secret**.

**2. Configure Environment Variables**

Edit your `.env` file:

```bash
# OAuth Configuration
UPSTREAM_OAUTH_CLIENT_ID=your_github_client_id
UPSTREAM_OAUTH_CLIENT_SECRET=your_github_client_secret
UPSTREAM_OAUTH_BASE_URL=https://github.com
UPSTREAM_OAUTH_AUTHORIZE_ENDPOINT=/login/oauth/authorize
UPSTREAM_OAUTH_TOKEN_ENDPOINT=/login/oauth/access_token
```

**3. How it Works**

The OAuth flow:

1. User initiates authentication through your MCP client
2. Server redirects to `https://github.com/login/oauth/authorize`
3. User authorizes on GitHub
4. GitHub redirects back to your `/callback` endpoint with a code
5. Server exchanges code for GitHub access token at `https://github.com/login/oauth/access_token`
6. Server issues its own access token
7. Token stored in PostgreSQL for future requests

**4. Other OAuth Providers**

You can use any OAuth2-compliant provider by adjusting the environment variables:

- **Google**: `https://accounts.google.com`
- **GitLab**: `https://gitlab.com`
- **Custom**: Your organization's OAuth server

## 🛠️ Adding Custom Tools

### 1. Create a Tool

Create a new file in `packages/mcp-server/src/tools/your-tool/`:

```typescript
import z from "zod";
import { ToolType } from "../types";

const myTool: ToolType<typeof paramsSchema> = {
  name: "my-tool",
  description: "Description of what this tool does",
  paramsSchemaOrAnnotations: {
    param1: z.string().describe("Parameter description"),
  },
  callback: async ({ param1 }) => {
    // Your tool logic here
    return {
      content: [
        {
          type: "text",
          text: `Result: ${param1}`,
        },
      ],
    };
  },
};

export default myTool;
```

### 2. Register the Tool

Add to `packages/mcp-server/src/tools/index.ts`:

```typescript
import myTool from "./your-tool";

const toolsList = [...otherTools, myTool];
```

## 📦 Example Integrations

### Ali Cloud SLS

Query logs from Alibaba Cloud Simple Log Service.

- See `packages/mcp-server/src/tools/ali/index.ts`

### ClickHouse

Execute queries on ClickHouse databases.

- See `packages/mcp-server/src/tools/clickhouse/index.ts`

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down
```

### Production Build

Run database migrations as a separate step (from CI/host), then build and run the app container.

```bash
# 1) Run database migrations (prod)
pnpm dlx dotenv-cli -e packages/mcp-server/.env.production -- pnpm --filter mcp-server db:migrate:deploy

# 2) Build Docker image
docker build -f docker/Dockerfile -t mcp-server .

# 3) Run container
docker run -p 8788:8788 mcp-server
```

## 📚 Available Scripts

### Root Level

- `pnpm dev` - Start MCP server in development mode
- `pnpm dev:ui` - Start UI development server
- `pnpm dev:all` - Start both server and UI concurrently
- `pnpm build` - Build all packages for production
- `pnpm type-check` - Run TypeScript type checking

### Database

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate:dev` - Run migrations in development
- `pnpm db:migrate:deploy` - Run migrations in production
- `pnpm db:studio` - Open Prisma Studio

### Docker

- `pnpm docker:pg` - Start PostgreSQL in Docker
- `pnpm docker:up` - Start all services with docker-compose
- `pnpm docker:down` - Stop all services

## 🧪 Development

### Database Schema Changes

```bash
# Edit prisma/schema.prisma
# Create migration
pnpm db:migrate:dev --name your_migration_name
```

### UI Development

The UI is built with:

- React 18
- React Router
- Tailwind CSS
- shadcn/ui components

UI runs on port 3001 in development and is bundled with the server in production.

## 📖 MCP Protocol

This server implements the Model Context Protocol (MCP), allowing AI assistants to:

- Discover available tools
- Execute tools with parameters
- Access resources
- Use prompts

Learn more at [Model Context Protocol Documentation](https://modelcontextprotocol.io).

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙋 Support

- Open an issue for bug reports
- Start a discussion for feature requests
- Check existing issues before creating new ones
