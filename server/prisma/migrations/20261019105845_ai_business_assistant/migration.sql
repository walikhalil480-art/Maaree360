-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_businessId_idx" ON "ai_conversations"("businessId");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_businessId_userId_idx" ON "ai_conversations"("businessId", "userId");

-- CreateIndex
CREATE INDEX "ai_conversations_businessId_updatedAt_idx" ON "ai_conversations"("businessId", "updatedAt");

-- CreateIndex
CREATE INDEX "ai_chat_messages_conversationId_idx" ON "ai_chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "ai_chat_messages_businessId_idx" ON "ai_chat_messages"("businessId");

-- CreateIndex
CREATE INDEX "ai_chat_messages_createdAt_idx" ON "ai_chat_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
