import { PrismaClient } from '@prisma/client';
import { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

export class PrismaClientsStore implements OAuthRegisteredClientsStore {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the connection
      await this.prisma.$connect();
      console.log('Prisma Client connected successfully');
    } catch (error) {
      console.error('Error connecting to database:', error);
      throw error;
    }
  }

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    try {
      const client = await this.prisma.oAuthClient.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        return undefined;
      }

      return this.prismaToClientInfo(client);
    } catch (error) {
      console.error('Error getting OAuth client:', error);
      throw error;
    }
  }

  async registerClient(clientMetadata: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    try {
      const data = {
        id: clientMetadata.client_id,
        clientSecret: clientMetadata.client_secret,
        clientName: clientMetadata.client_name,
        clientUri: clientMetadata.client_uri,
        logoUri: clientMetadata.logo_uri,
        scope: clientMetadata.scope,
        redirectUris: clientMetadata.redirect_uris || [],
        grantTypes: clientMetadata.grant_types || [],
        responseTypes: clientMetadata.response_types || [],
        tokenEndpointAuthMethod: clientMetadata.token_endpoint_auth_method,
        jwksUri: clientMetadata.jwks_uri,
        jwks: clientMetadata.jwks || null,
        softwareId: clientMetadata.software_id,
        softwareVersion: clientMetadata.software_version,
      };

      await this.prisma.oAuthClient.upsert({
        where: { id: clientMetadata.client_id },
        update: data,
        create: data,
      });

      return clientMetadata;
    } catch (error) {
      console.error('Error registering OAuth client:', error);
      throw error;
    }
  }

  async deleteClient(clientId: string): Promise<boolean> {
    try {
      const deleted = await this.prisma.oAuthClient.delete({
        where: { id: clientId },
      });
      return !!deleted;
    } catch (error: any) {
      console.error('Error deleting OAuth client:', error);
      throw error;
    }
  }

  async listClients(): Promise<OAuthClientInformationFull[]> {
    try {
      const clients = await this.prisma.oAuthClient.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return clients.map((client: any) => this.prismaToClientInfo(client));
    } catch (error) {
      console.error('Error listing OAuth clients:', error);
      throw error;
    }
  }

  private prismaToClientInfo(client: any): OAuthClientInformationFull {
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

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
