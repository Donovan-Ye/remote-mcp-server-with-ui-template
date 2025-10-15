import { PrismaClient } from '@prisma/client';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

export interface StoredAuthorizationCode {
  code: string;
  params: AuthorizationParams;
  client: OAuthClientInformationFull;
  expiresAt: Date;
}

export class PrismaTokenStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Authorization Code Methods
  async storeAuthorizationCode(
    code: string,
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    expiresInSeconds: number = 600 // 10 minutes default
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    try {
      await this.prisma.oAuthAuthorizationCode.create({
        data: {
          code,
          clientId: client.client_id,
          scopes: params.scopes || [],
          resource: params.resource?.toString(),
          codeChallenge: params.codeChallenge,
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Error storing authorization code:', error);
      throw error;
    }
  }

  async getAuthorizationCode(code: string): Promise<StoredAuthorizationCode | undefined> {
    try {
      const storedCode = await this.prisma.oAuthAuthorizationCode.findUnique({
        where: { code },
        include: { client: true },
      });

      if (!storedCode) {
        return undefined;
      }

      // Check if code is expired
      if (storedCode.expiresAt < new Date()) {
        // Clean up expired code
        await this.deleteAuthorizationCode(code);
        return undefined;
      }

      return {
        code: storedCode.code,
        params: {
          scopes: storedCode.scopes,
          resource: storedCode.resource ? new URL(storedCode.resource) : undefined,
          codeChallenge: storedCode.codeChallenge || '',
          redirectUri: storedCode.client.redirectUris[0],
        },
        client: this.prismaClientToOAuth(storedCode.client),
        expiresAt: storedCode.expiresAt,
      };
    } catch (error) {
      console.error('Error getting authorization code:', error);
      throw error;
    }
  }

  async deleteAuthorizationCode(code: string): Promise<boolean> {
    try {
      const deleted = await this.prisma.oAuthAuthorizationCode.delete({
        where: { code },
      });
      return !!deleted;
    } catch (error: any) {
      console.error('Error deleting authorization code:', error);
      throw error;
    }
  }

  // Token Methods
  async storeAccessToken(
    token: string,
    clientId: string,
    scopes: string[],
    expiresInSeconds: number,
    resource?: URL
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    try {
      await this.prisma.oAuthToken.create({
        data: {
          token,
          clientId,
          scopes,
          resource: resource?.toString(),
          tokenType: 'access',
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Error storing access token:', error);
      throw error;
    }
  }

  async storeRefreshToken(
    token: string,
    clientId: string,
    scopes: string[],
    expiresInSeconds: number,
    resource?: URL
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    try {
      await this.prisma.oAuthToken.create({
        data: {
          token,
          clientId,
          scopes,
          resource: resource?.toString(),
          tokenType: 'refresh',
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw error;
    }
  }

  async getToken(token: string): Promise<AuthInfo | undefined> {
    try {
      const storedToken = await this.prisma.oAuthToken.findUnique({
        where: { token },
      });

      if (!storedToken) {
        return undefined;
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await this.deleteToken(token);
        return undefined;
      }

      return {
        token: storedToken.token,
        clientId: storedToken.clientId,
        scopes: storedToken.scopes,
        expiresAt: Math.floor(storedToken.expiresAt.getTime() / 1000),
        resource: storedToken.resource ? new URL(storedToken.resource) : undefined,
      };
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }

  async deleteToken(token: string): Promise<boolean> {
    try {
      const deleted = await this.prisma.oAuthToken.delete({
        where: { token },
      });
      return !!deleted;
    } catch (error) {
      console.error('Error deleting token:', error);
      throw error;
    }
  }

  async revokeTokensForClient(clientId: string): Promise<number> {
    try {
      const result = await this.prisma.oAuthToken.deleteMany({
        where: { clientId },
      });
      return result.count;
    } catch (error) {
      console.error('Error revoking tokens for client:', error);
      throw error;
    }
  }

  // Cleanup Methods
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.oAuthToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  async cleanupExpiredAuthorizationCodes(): Promise<number> {
    try {
      const result = await this.prisma.oAuthAuthorizationCode.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired authorization codes:', error);
      throw error;
    }
  }

  async cleanupExpired(): Promise<{ tokens: number; codes: number }> {
    const [tokens, codes] = await Promise.all([
      this.cleanupExpiredTokens(),
      this.cleanupExpiredAuthorizationCodes(),
    ]);

    if (tokens > 0 || codes > 0) {
      console.log(`Cleaned up ${tokens} expired tokens and ${codes} expired authorization codes`);
    }

    return { tokens, codes };
  }

  // Utility Methods
  private prismaClientToOAuth(client: any): OAuthClientInformationFull {
    return {
      client_id: client.id,
      client_secret: client.clientSecret,
      client_name: client.clientName,
      client_uri: client.clientUri,
      logo_uri: client.logoUri,
      scope: client.scope,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      jwks_uri: client.jwksUri,
      jwks: client.jwks,
      software_id: client.softwareId,
      software_version: client.softwareVersion,
    };
  }

  // Statistics and Monitoring
  async getTokenStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    totalCodes: number;
    activeCodes: number;
    expiredCodes: number;
  }> {
    const now = new Date();

    const [
      totalTokens,
      activeTokens,
      expiredTokens,
      totalCodes,
      activeCodes,
      expiredCodes,
    ] = await Promise.all([
      this.prisma.oAuthToken.count(),
      this.prisma.oAuthToken.count({ where: { expiresAt: { gt: now } } }),
      this.prisma.oAuthToken.count({ where: { expiresAt: { lte: now } } }),
      this.prisma.oAuthAuthorizationCode.count(),
      this.prisma.oAuthAuthorizationCode.count({ where: { expiresAt: { gt: now } } }),
      this.prisma.oAuthAuthorizationCode.count({ where: { expiresAt: { lte: now } } }),
    ]);

    return {
      totalTokens,
      activeTokens,
      expiredTokens,
      totalCodes,
      activeCodes,
      expiredCodes,
    };
  }
}
