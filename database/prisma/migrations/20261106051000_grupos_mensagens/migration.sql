CREATE TABLE "Chat" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "private" BOOLEAN NOT NULL DEFAULT true,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Chat_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Chat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Chat_organizationId_idx" ON "Chat"("organizationId");
CREATE TABLE "ChatMember" (
  "chatId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("chatId", "userId"),
  CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "Message" ADD COLUMN "chatId" UUID, ADD COLUMN "forwardedFrom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
