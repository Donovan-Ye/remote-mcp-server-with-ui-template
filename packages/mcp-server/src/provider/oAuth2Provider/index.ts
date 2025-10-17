import { randomUUID } from 'node:crypto';
import express, { NextFunction, Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { mcpAuthRouter, createOAuthMetadata } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { resourceUrlFromServerUrl } from '@modelcontextprotocol/sdk/shared/auth-utils.js';
import { OAuthClientInformationFull, OAuthTokens, OAuthMetadata, OAuthTokenRevocationRequest } from '@modelcontextprotocol/sdk/shared/auth.js';
import { PrismaClientsStore } from '../../stores/postgresClientStore';
import { PrismaTokenStore } from '../../stores/prismaTokenStore';
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl } from './util';
import console from 'node:console';
import { authServerUrl } from '../..';

const REQUIRED_UPSTREAM_OAUTH_INFO_LIST = [
  'UPSTREAM_OAUTH_CLIENT_ID',
  'UPSTREAM_OAUTH_CLIENT_SECRET',
  "UPSTREAM_OAUTH_BASE_URL",
  "UPSTREAM_OAUTH_AUTHORIZE_ENDPOINT",
  "UPSTREAM_OAUTH_TOKEN_ENDPOINT",
]

interface UpstreamOauthInfo {
  client_id: string;
  client_secret: string;
  base_url: string;
  authorize_endpoint: string;
  token_endpoint: string;
}

/**
 *  Validate and get the upstream OAuth info
 */
function validateAndGetUpstreamOauthInfo(): UpstreamOauthInfo {
  for (const info of REQUIRED_UPSTREAM_OAUTH_INFO_LIST) {
    if (!process.env[info]) {
      throw new Error(`${info} is not set`);
    }
  }

  return {
    client_id: process.env.UPSTREAM_OAUTH_CLIENT_ID!,
    client_secret: process.env.UPSTREAM_OAUTH_CLIENT_SECRET!,
    base_url: process.env.UPSTREAM_OAUTH_BASE_URL!,
    authorize_endpoint: process.env.UPSTREAM_OAUTH_AUTHORIZE_ENDPOINT!,
    token_endpoint: process.env.UPSTREAM_OAUTH_TOKEN_ENDPOINT!,
  }
}

/**
 * OAuth provider with PostgreSQL-based storage
 *
 * Features:
 * - Persistent client storage in PostgreSQL
 * - Persistent token and authorization code storage in PostgreSQL
 * - Automatic cleanup of expired tokens and codes
 * - Production-ready token management
 */
export class PrismaAuthProvider implements OAuthServerProvider {
  clientsStore: PrismaClientsStore;
  tokenStore: PrismaTokenStore;
  private prisma: PrismaClient;
  upstreamOauthInfo: UpstreamOauthInfo;

  constructor(
    private validateResource?: (resource?: URL) => boolean,
  ) {
    // Validate and get the upstream OAuth info
    this.upstreamOauthInfo = validateAndGetUpstreamOauthInfo();
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    this.clientsStore = new PrismaClientsStore();
    this.tokenStore = new PrismaTokenStore(this.prisma);
  }

  async initialize(): Promise<void> {

    // Initialize the clients store
    await this.clientsStore.initialize();

    // Set up periodic cleanup of expired tokens and codes
    this.startCleanupTimer();

    console.log('Prisma OAuth Provider initialized successfully');
  }

  private startCleanupTimer(): void {
    // Clean up expired tokens every 30 minutes
    setInterval(async () => {
      try {
        await this.tokenStore.cleanupExpired();
      } catch (error) {
        console.error('Error during token cleanup:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    // Redirect to the upstream OAuth authorize endpoint
    const targetUrl = getUpstreamAuthorizeUrl({
      upstream_url: `${this.upstreamOauthInfo.base_url}${this.upstreamOauthInfo.authorize_endpoint}`,
      client_id: this.upstreamOauthInfo.client_id,
      scope: 'all',
      redirect_uri: new URL("/callback", authServerUrl).href,
      state: btoa(JSON.stringify({
        client,
        params,
      })),
    });
    res.redirect(targetUrl);
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const codeData = await this.tokenStore.getAuthorizationCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }

    if (codeData.client.client_id !== client.client_id) {
      throw new Error(`Authorization code was not issued to this client`);
    }

    return codeData.params.codeChallenge || '';
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    // Note: code verifier is checked in token.ts by default
    // it's unused here for that reason.
    _codeVerifier?: string
  ): Promise<OAuthTokens> {
    const codeData = await this.tokenStore.getAuthorizationCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }

    if (codeData.client.client_id !== client.client_id) {
      throw new Error(`Authorization code was not issued to this client, ${codeData.client.client_id} != ${client.client_id}`);
    }

    if (this.validateResource && !this.validateResource(codeData.params.resource)) {
      throw new Error(`Invalid resource: ${codeData.params.resource}`);
    }

    // Delete the authorization code (single use)
    await this.tokenStore.deleteAuthorizationCode(authorizationCode);

    // Generate access token
    const accessToken = randomUUID();
    const expiresIn = 3600; // 1 hour

    // Store access token in PostgreSQL
    await this.tokenStore.storeAccessToken(
      accessToken,
      client.client_id,
      codeData.params.scopes || [],
      expiresIn,
      codeData.params.resource
    );

    // Generate refresh token (optional - for future use)
    const refreshToken = randomUUID();
    const refreshExpiresIn = 7 * 24 * 3600; // 7 days

    await this.tokenStore.storeRefreshToken(
      refreshToken,
      client.client_id,
      codeData.params.scopes || [],
      refreshExpiresIn,
      codeData.params.resource
    );

    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: (codeData.params.scopes || []).join(' '),
    };
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL
  ): Promise<OAuthTokens> {
    const tokenData = await this.tokenStore.getToken(refreshToken);
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    if (tokenData.clientId !== client.client_id) {
      throw new Error('Refresh token was not issued to this client');
    }

    // Validate requested scopes are subset of original scopes
    const requestedScopes = scopes || tokenData.scopes;
    const hasValidScopes = requestedScopes.every(scope => tokenData.scopes.includes(scope));
    if (!hasValidScopes) {
      throw new Error('Requested scopes exceed granted scopes');
    }

    // Validate resource
    if (resource && tokenData.resource && resource.toString() !== tokenData.resource.toString()) {
      throw new Error('Resource mismatch');
    }

    // Generate new access token
    const accessToken = randomUUID();
    const expiresIn = 3600; // 1 hour

    await this.tokenStore.storeAccessToken(
      accessToken,
      client.client_id,
      requestedScopes,
      expiresIn,
      resource || tokenData.resource
    );

    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      scope: requestedScopes.join(' '),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const tokenData = await this.tokenStore.getToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }

    return tokenData;
  }

  async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    await this.tokenStore.deleteToken(request.token);
  }

  // Additional utility methods for token management
  async revokeAllTokensForClient(clientId: string): Promise<number> {
    return await this.tokenStore.revokeTokensForClient(clientId);
  }

  async getTokenStats() {
    return await this.tokenStore.getTokenStats();
  }

  async cleanup(): Promise<void> {
    await this.tokenStore.cleanupExpired();
    await this.prisma.$disconnect();
  }

  async completeAuthorization({
    client, params, code
  }: {
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    code: string,
  }): Promise<{ redirectTo: string }> {
    await this.tokenStore.storeAuthorizationCode(code, client, params);

    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (params.state) {
      redirectUrl.searchParams.set('state', params.state);
    }

    return {
      redirectTo: redirectUrl.toString(),
    };
  }
}


export const setupAuthServer = async ({
  app,
  authServerUrl,
  mcpServerUrl,
  strictResource
}: {
  app: express.Application,
  authServerUrl: URL,
  mcpServerUrl: URL,
  strictResource: boolean
}): Promise<OAuthMetadata> => {
  const validateResource = strictResource ? (resource?: URL) => {
    if (!resource) return false;
    const expectedResource = resourceUrlFromServerUrl(mcpServerUrl);
    return resource.toString() === expectedResource.toString();
  } : undefined;

  const provider = new PrismaAuthProvider(validateResource);

  // Initialize the PostgreSQL connection and create tables
  await provider.initialize();
  const authApp = app;

  authApp.use(express.json());
  // For introspection requests
  authApp.use(express.urlencoded());

  // Add OAuth routes to the auth server
  // NOTE: this will also add a protected resource metadata route,
  // but it won't be used, so leave it.
  authApp.use(mcpAuthRouter({
    provider,
    issuerUrl: authServerUrl,
    scopesSupported: ['mcp:tools'],
  }));

  authApp.post('/introspect', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      const tokenInfo = await provider.verifyAccessToken(token);
      res.json({
        active: true,
        client_id: tokenInfo.clientId,
        scope: tokenInfo.scopes.join(' '),
        exp: tokenInfo.expiresAt,
        aud: tokenInfo.resource,
      });
      next();
    } catch (error) {
      res.status(401).json({
        active: false,
        error: 'Unauthorized',
        error_description: `Invalid token: ${error}`
      });
    }
  });

  /**
  * OAuth Callback Endpoint
  */
  authApp.get("/callback", async (req: Request, res: Response) => {
    const { client, params } = JSON.parse(atob(req.query.state as string));
    if (!client.client_id) {
      return res.status(400).send("Invalid state");
    }

    const code = req.query.code as string;
    // Exchange the code for an access token
    const [accessToken, errResponse] = await fetchUpstreamAuthToken({
      client_id: provider.upstreamOauthInfo.client_id,
      client_secret: provider.upstreamOauthInfo.client_secret,
      code,
      redirect_uri: new URL("/callback", authServerUrl).href,
      upstream_url: `${provider.upstreamOauthInfo.base_url}${provider.upstreamOauthInfo.token_endpoint}`,
    });
    if (errResponse) {
      return res.status(errResponse.status).send(await errResponse.text());
    }

    // Return back to the MCP client a new token
    const { redirectTo } = await provider.completeAuthorization({
      client,
      params,
      code,
    });

    res.redirect(redirectTo);
    return;
  });

  // Note: we could fetch this from the server, but then we end up
  // with some top level async which gets annoying.
  const oauthMetadata: OAuthMetadata = createOAuthMetadata({
    provider,
    issuerUrl: authServerUrl,
    scopesSupported: ['mcp:tools'],
  })

  oauthMetadata.introspection_endpoint = new URL("/introspect", authServerUrl).href;

  // Set up graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down OAuth provider...');
    try {
      await provider.cleanup();
      console.log('OAuth provider shutdown complete');
    } catch (error) {
      console.error('Error during OAuth provider shutdown:', error);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down OAuth provider...');
    try {
      await provider.cleanup();
      console.log('OAuth provider shutdown complete');
    } catch (error) {
      console.error('Error during OAuth provider shutdown:', error);
    }
  });

  return oauthMetadata;
}
