import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";

export interface TokenVerifier {
  verifyAccessToken: (token: string) => Promise<AuthInfo>;
}
