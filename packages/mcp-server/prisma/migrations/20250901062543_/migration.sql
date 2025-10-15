-- CreateTable
CREATE TABLE "public"."oauth_clients" (
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT,
    "client_name" TEXT,
    "client_uri" TEXT,
    "logo_uri" TEXT,
    "scope" TEXT,
    "redirect_uris" TEXT[],
    "grant_types" TEXT[],
    "response_types" TEXT[],
    "token_endpoint_auth_method" TEXT,
    "jwks_uri" TEXT,
    "jwks" JSONB,
    "software_id" TEXT,
    "software_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("client_id")
);

-- CreateIndex
CREATE INDEX "oauth_clients_client_id_idx" ON "public"."oauth_clients"("client_id");

-- CreateIndex
CREATE INDEX "oauth_clients_created_at_idx" ON "public"."oauth_clients"("created_at");
