-- CreateTable
CREATE TABLE "public"."oauth_authorization_codes" (
    "code_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "resource" TEXT,
    "code_challenge" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorization_codes_pkey" PRIMARY KEY ("code_id")
);

-- CreateTable
CREATE TABLE "public"."oauth_tokens" (
    "token_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "resource" TEXT,
    "token_type" TEXT NOT NULL DEFAULT 'access',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorization_codes_code_key" ON "public"."oauth_authorization_codes"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_codes_code_idx" ON "public"."oauth_authorization_codes"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_codes_client_id_idx" ON "public"."oauth_authorization_codes"("client_id");

-- CreateIndex
CREATE INDEX "oauth_authorization_codes_expires_at_idx" ON "public"."oauth_authorization_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_token_key" ON "public"."oauth_tokens"("token");

-- CreateIndex
CREATE INDEX "oauth_tokens_token_idx" ON "public"."oauth_tokens"("token");

-- CreateIndex
CREATE INDEX "oauth_tokens_client_id_idx" ON "public"."oauth_tokens"("client_id");

-- CreateIndex
CREATE INDEX "oauth_tokens_expires_at_idx" ON "public"."oauth_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "oauth_tokens_token_type_idx" ON "public"."oauth_tokens"("token_type");

-- AddForeignKey
ALTER TABLE "public"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oauth_tokens" ADD CONSTRAINT "oauth_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
