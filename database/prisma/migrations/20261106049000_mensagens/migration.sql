CREATE TABLE "Message" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "recipientId" UUID,
  "text" TEXT NOT NULL,
  "mentions" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Message_organizationId_createdAt_idx" ON "Message"("organizationId", "createdAt");
CREATE INDEX "Message_organizationId_recipientId_createdAt_idx" ON "Message"("organizationId", "recipientId", "createdAt");
CREATE TABLE "MessageRead" (
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "conversation" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("organizationId", "userId", "conversation"),
  CONSTRAINT "MessageRead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
