import dotenv from 'dotenv';

import express, { Request, RequestHandler, Response as ExpressResponse } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import cors from 'cors';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { mcpAuthMetadataRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { checkResourceAllowed } from '@modelcontextprotocol/sdk/shared/auth-utils.js';
import { OAuthMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { CallToolResult, GetPromptResult, ReadResourceResult, ResourceLink, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import toolsList from './tools';
import { setupAuthServer } from './provider/oAuth2Provider';
import { requestResponseLogger, winstonLogger } from './utils/logger';
import { setupUiRouter } from './routers/ui';
import { TokenVerifier } from './types';
import { resolve } from 'path';
import { setupApisRouter } from './routers/apis';

const rootDir = resolve(process.cwd());
dotenv.config({
	path: resolve(rootDir, '.env'),
	override: true,
});

console.log('POSTGRES_URL:', process.env.POSTGRES_URL);

// Check for OAuth flag
const useOAuth = true; // Temporarily disabled for testing
// const useOAuth = process.argv.includes('--oauth');
const strictOAuth = process.argv.includes('--oauth-strict');

// Create an MCP server with implementation details
const getServer = () => {
	const server = new McpServer({
		name: 'remote-mcp-server-with-ui-template',
		version: '1.0.0'
	}, { capabilities: { logging: {} } });

	server.registerTool(
		'greet',
		{
			title: 'Greeting Tool',  // Display name for UI
			description: 'A simple greeting tool',
			inputSchema: {
				name: z.string().describe('Name to greet'),
			},
		},
		async ({ name }): Promise<CallToolResult> => {
			return {
				content: [
					{
						type: 'text',
						text: `Hello, ${name}!`,
					},
				],
			};
		}
	);

	toolsList.forEach(tool => {
		server.tool(tool.name, tool.description, tool.paramsSchemaOrAnnotations, tool.callback);
	});

	// Register a simple prompt with title
	server.registerPrompt(
		'greeting-template',
		{
			title: 'Greeting Template',  // Display name for UI
			description: 'A simple greeting prompt template',
			argsSchema: {
				name: z.string().describe('Name to include in greeting'),
			},
		},
		async ({ name }): Promise<GetPromptResult> => {
			return {
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: `Please greet ${name} in a friendly manner.`,
						},
					},
				],
			};
		}
	);

	// Create a simple resource at a fixed URI
	server.registerResource(
		'greeting-resource',
		'https://example.com/greetings/default',
		{
			title: 'Default Greeting',  // Display name for UI
			description: 'A simple greeting resource',
			mimeType: 'text/plain'
		},
		async (): Promise<ReadResourceResult> => {
			return {
				contents: [
					{
						uri: 'https://example.com/greetings/default',
						text: 'Hello, world!',
					},
				],
			};
		}
	);

	// Create additional resources for ResourceLink demonstration
	server.registerResource(
		'example-file-1',
		'file:///example/file1.txt',
		{
			title: 'Example File 1',
			description: 'First example file for ResourceLink demonstration',
			mimeType: 'text/plain'
		},
		async (): Promise<ReadResourceResult> => {
			return {
				contents: [
					{
						uri: 'file:///example/file1.txt',
						text: 'This is the content of file 1',
					},
				],
			};
		}
	);


	return server;
};

/**
 * Check if running on Vercel
 * Vercel sets VERCEL environment variable to "1" when running on their platform
 */
function isVercelEnvironment(): boolean {
	return process.env.VERCEL === '1' || Boolean(process.env.VERCEL);
}

/**
 * Get the server URL based on the environment
 * - On Vercel: Uses VERCEL_URL with HTTPS protocol
 * - Otherwise: Uses SERVER_URL env variable or falls back to localhost
 * 
 * Vercel provides:
 * - VERCEL: "1" if running on Vercel
 * - VERCEL_URL: The deployment URL (e.g., "my-app-abc123.vercel.app") without protocol
 * - VERCEL_ENV: The environment (production, preview, development)
 */
function getServerUrl(): string {
	const isVercel = isVercelEnvironment();
	const vercelUrl = process.env.VERCEL_URL;

	if (isVercel && vercelUrl) {
		// Vercel URLs should use HTTPS (except in development)
		// VERCEL_URL doesn't include protocol, so we add it
		const protocol = process.env.VERCEL_ENV === 'development' ? 'http' : 'https';
		return `${protocol}://${vercelUrl}`;
	}

	// Fallback to SERVER_URL env variable or localhost
	return process.env.SERVER_URL || 'http://localhost';
}

const MCP_PORT = process.env.MCP_PORT && process.env.NODE_ENV !== 'production' ? parseInt(process.env.MCP_PORT, 10) : undefined;
const SERVER_URL = getServerUrl();
const isVercel = isVercelEnvironment();

// Log environment detection
if (isVercel) {
	winstonLogger.info('Detected Vercel environment', {
		vercelUrl: process.env.VERCEL_URL,
		vercelEnv: process.env.VERCEL_ENV,
		serverUrl: SERVER_URL
	});
} else {
	winstonLogger.info('Running in local/self-hosted environment', {
		serverUrl: SERVER_URL,
		port: MCP_PORT
	});
}

// On Vercel, don't append port (uses default 80/443)
// Only append port for local development
const rootUrl = new URL(`${SERVER_URL}${MCP_PORT && !isVercel ? `:${MCP_PORT}` : ''}`);
export const mcpServerUrl = new URL(`${rootUrl}/mcp`);
export const authServerUrl = new URL(`${rootUrl}`);
export const uiServerUrl = new URL(`${rootUrl}/ui`);

const app = express();
app.use(express.json());

// Allow CORS all domains, expose the Mcp-Session-Id header
app.use(cors({
	origin: '*', // Allow all origins
	exposedHeaders: ["Mcp-Session-Id"]
}));

// Use winston logger middleware to log all requests and responses
app.use(requestResponseLogger);

// Health check endpoint for K8s and testing
app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		version: '1.0.0'
	});
});

app.get('/ready', (req, res) => {
	res.status(200).json({
		status: 'ready',
		timestamp: new Date().toISOString()
	});
});

// Set up OAuth if enabled
let authMiddleware: RequestHandler | null = null;

// Function to initialize OAuth
async function initializeOAuth() {
	if (useOAuth) {
		const oauthMetadata: OAuthMetadata = await setupAuthServer({
			app,
			authServerUrl,
			mcpServerUrl,
			strictResource: strictOAuth
		});
		console.log('oauthMetadata', oauthMetadata)

		const tokenVerifier: TokenVerifier = {
			verifyAccessToken: async (token: string) => {
				const endpoint = oauthMetadata.introspection_endpoint;

				if (!endpoint) {
					throw new Error('No token verification endpoint available in metadata');
				}

				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams({
						token: token
					}).toString()
				});

				if (!response.ok) {
					throw new InvalidTokenError(`Invalid or expired token: ${await response.text()}`);
				}

				const data: any = await response.json();

				if (strictOAuth) {
					if (!data.aud) {
						throw new Error(`Resource Indicator (RFC8707) missing`);
					}
					if (!checkResourceAllowed({ requestedResource: data.aud, configuredResource: mcpServerUrl })) {
						throw new Error(`Expected resource indicator ${mcpServerUrl}, got: ${data.aud}`);
					}
				}

				// Convert the response to AuthInfo format
				return {
					token,
					clientId: data.client_id,
					scopes: data.scope ? data.scope.split(' ') : [],
					expiresAt: data.exp,
				};
			}
		}

		// Set up UI router
		setupUiRouter(app, tokenVerifier);

		authMiddleware = requireBearerAuth({
			verifier: tokenVerifier,
			requiredScopes: [],
			resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl),
		});

		// Set up APIs router
		setupApisRouter(app, authMiddleware);
	}
}

// Initialize OAuth asynchronously
initializeOAuth().then(() => {
	// Map to store transports by session ID
	const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

	// MCP POST endpoint with optional auth
	const mcpPostHandler = async (req: Request, res: ExpressResponse) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;
		if (sessionId) {
			console.log(`Received MCP request for session: ${sessionId}`);
		} else {
			console.log('Request body:', req.body);
		}

		if (useOAuth && req.auth) {
			console.log('Authenticated user:', req.auth);
		}
		try {
			let transport: StreamableHTTPServerTransport;
			if (sessionId && transports[sessionId]) {
				// Reuse existing transport
				transport = transports[sessionId];
			} else if (!sessionId && isInitializeRequest(req.body)) {
				// New initialization request
				const eventStore = new InMemoryEventStore();
				transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => randomUUID(),
					eventStore, // Enable resumability
					onsessioninitialized: (sessionId) => {
						// Store the transport by session ID when session is initialized
						// This avoids race conditions where requests might come in before the session is stored
						console.log(`Session initialized with ID: ${sessionId}`);
						transports[sessionId] = transport;
					}
				});

				// Set up onclose handler to clean up transport when closed
				transport.onclose = () => {
					const sid = transport.sessionId;
					if (sid && transports[sid]) {
						console.log(`Transport closed for session ${sid}, removing from transports map`);
						delete transports[sid];
					}
				};

				// Connect the transport to the MCP server BEFORE handling the request
				// so responses can flow back through the same transport
				const server = getServer();
				await server.connect(transport);

				await transport.handleRequest(req, res, req.body);
				return; // Already handled
			} else {
				// Invalid request - no session ID or not initialization request
				res.status(400).json({
					jsonrpc: '2.0',
					error: {
						code: -32000,
						message: 'Bad Request: No valid session ID provided',
					},
					id: null,
				});
				return;
			}

			// Handle the request with existing transport - no need to reconnect
			// The existing transport is already connected to the server
			await transport.handleRequest(req, res, req.body);
		} catch (error) {
			console.error('Error handling MCP request:', error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: {
						code: -32603,
						message: 'Internal server error',
					},
					id: null,
				});
			}
		}
	};

	// Set up routes with conditional auth middleware
	if (useOAuth && authMiddleware) {
		app.post('/mcp', authMiddleware, mcpPostHandler);
	} else {
		app.post('/mcp', mcpPostHandler);
	}

	// Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
	const mcpGetHandler = async (req: Request, res: ExpressResponse) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;
		console.log('sessionId get', sessionId)
		if (!sessionId || !transports[sessionId]) {
			res.status(400).send('Invalid or missing session ID');
			return;
		}

		if (useOAuth && req.auth) {
			console.log('Authenticated SSE connection from user:', req.auth);
		}

		// Check for Last-Event-ID header for resumability
		const lastEventId = req.headers['last-event-id'] as string | undefined;
		if (lastEventId) {
			console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
		} else {
			console.log(`Establishing new SSE stream for session ${sessionId}`);
		}

		const transport = transports[sessionId];
		await transport.handleRequest(req, res);
	};

	// Set up GET route with conditional auth middleware
	if (useOAuth && authMiddleware) {
		app.get('/mcp', authMiddleware, mcpGetHandler);
	} else {
		app.get('/mcp', mcpGetHandler);
	}

	// Handle DELETE requests for session termination (according to MCP spec)
	const mcpDeleteHandler = async (req: Request, res: ExpressResponse) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;
		if (!sessionId || !transports[sessionId]) {
			res.status(400).send('Invalid or missing session ID');
			return;
		}

		console.log(`Received session termination request for session ${sessionId}`);

		try {
			const transport = transports[sessionId];
			await transport.handleRequest(req, res);
		} catch (error) {
			console.error('Error handling session termination:', error);
			if (!res.headersSent) {
				res.status(500).send('Error processing session termination');
			}
		}
	};

	// Set up DELETE route with conditional auth middleware
	if (useOAuth && authMiddleware) {
		app.delete('/mcp', authMiddleware, mcpDeleteHandler);
	} else {
		app.delete('/mcp', mcpDeleteHandler);
	}

	app.listen(MCP_PORT ?? 80, (error) => {
		if (error) {
			winstonLogger.error('Failed to start server', { error: error.message, stack: error.stack });
			process.exit(1);
		}
		winstonLogger.info(`MCP Streamable HTTP Server listening on port ${MCP_PORT ?? (isVercel ? 'default (Vercel)' : 80)}`, {
			port: MCP_PORT,
			isVercel,
			serverUrl: SERVER_URL,
			mcpUrl: mcpServerUrl.toString(),
			authUrl: authServerUrl.toString(),
			uiUrl: uiServerUrl.toString(),
			oauthEnabled: useOAuth
		});
	});

	// Handle server shutdown
	process.on('SIGINT', async () => {
		winstonLogger.info('Shutting down server...');

		// Close all active transports to properly clean up resources
		for (const sessionId in transports) {
			try {
				winstonLogger.info(`Closing transport for session ${sessionId}`);
				await transports[sessionId].close();
				delete transports[sessionId];
			} catch (error) {
				winstonLogger.error(`Error closing transport for session ${sessionId}`, {
					error: error instanceof Error ? error.message : error,
					sessionId
				});
			}
		}
		winstonLogger.info('Server shutdown complete');
		process.exit(0);
	});
}).catch(error => {
	winstonLogger.error('Failed to initialize OAuth', error);
	process.exit(1);
});
