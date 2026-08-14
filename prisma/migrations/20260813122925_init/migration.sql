-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('VOICE', 'CHAT', 'EMAIL');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "Handler" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('CUSTOMER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('NEW', 'ACTIVE', 'RETURNING', 'VIP', 'AT_RISK');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'TRANSFERRED', 'FAILED');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TEXT', 'URL', 'PDF', 'TXT', 'DOCX');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentPersonality" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'CASUAL', 'FORMAL');

-- CreateEnum
CREATE TYPE "ResponseStyle" AS ENUM ('SHORT', 'BALANCED', 'DETAILED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EscalationReason" AS ENUM ('ANGRY_CUSTOMER', 'REFUND_REQUEST', 'LEGAL_ISSUE', 'UNKNOWN_QUESTION', 'HUMAN_REQUESTED', 'SENSITIVE_ISSUE', 'LOW_CONFIDENCE');

-- CreateEnum
CREATE TYPE "IntegrationKind" AS ENUM ('TELEPHONY', 'CALENDAR', 'CRM', 'ECOMMERCE', 'EMAIL', 'PAYMENT');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'BUSINESS', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('CONVERSATIONS', 'VOICE_MINUTES', 'AI_TOKENS', 'KNOWLEDGE_DOCUMENTS', 'TEAM_MEMBERS');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('ESCALATION', 'APPOINTMENT', 'SYSTEM', 'USAGE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "resetToken" TEXT,
    "resetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "publicWidgetId" UUID NOT NULL,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHour" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" TEXT,
    "closesAt" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAgent" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Alex',
    "personality" "AgentPersonality" NOT NULL DEFAULT 'PROFESSIONAL',
    "responseStyle" "ResponseStyle" NOT NULL DEFAULT 'BALANCED',
    "greeting" TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
    "instructions" TEXT NOT NULL DEFAULT '',
    "voiceName" TEXT NOT NULL DEFAULT 'nova',
    "escalationRules" TEXT NOT NULL DEFAULT '',
    "handoffEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'NEW',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID,
    "channel" "Channel" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "handler" "Handler" NOT NULL DEFAULT 'AI',
    "sentiment" "Sentiment",
    "intent" TEXT,
    "summary" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" "EscalationReason",
    "satisfaction" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "citedChunkIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "direction" "CallDirection" NOT NULL DEFAULT 'INBOUND',
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'simulator',
    "providerCallId" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "recordingUrl" TEXT,
    "transferredTo" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "sourceUrl" TEXT,
    "fileName" TEXT,
    "content" TEXT,
    "error" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "askedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "staffName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "bookedByAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "conversationId" UUID,
    "customerId" UUID,
    "assigneeId" UUID,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "reason" "EscalationReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "providerCustomerId" TEXT,
    "providerSubId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Business_publicWidgetId_key" ON "Business"("publicWidgetId");

-- CreateIndex
CREATE INDEX "Business_createdAt_idx" ON "Business"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessHour_businessId_idx" ON "BusinessHour"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHour_businessId_weekday_key" ON "BusinessHour"("businessId", "weekday");

-- CreateIndex
CREATE INDEX "Membership_businessId_idx" ON "Membership"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_businessId_key" ON "Membership"("userId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");

-- CreateIndex
CREATE INDEX "Invite_businessId_idx" ON "Invite"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_businessId_email_key" ON "Invite"("businessId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AIAgent_businessId_key" ON "AIAgent"("businessId");

-- CreateIndex
CREATE INDEX "Customer_businessId_status_idx" ON "Customer"("businessId", "status");

-- CreateIndex
CREATE INDEX "Customer_businessId_createdAt_idx" ON "Customer"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_businessId_email_key" ON "Customer"("businessId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_businessId_phone_key" ON "Customer"("businessId", "phone");

-- CreateIndex
CREATE INDEX "Conversation_businessId_startedAt_idx" ON "Conversation"("businessId", "startedAt");

-- CreateIndex
CREATE INDEX "Conversation_businessId_channel_idx" ON "Conversation"("businessId", "channel");

-- CreateIndex
CREATE INDEX "Conversation_businessId_status_idx" ON "Conversation"("businessId", "status");

-- CreateIndex
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Call_conversationId_key" ON "Call"("conversationId");

-- CreateIndex
CREATE INDEX "Call_businessId_startedAt_idx" ON "Call"("businessId", "startedAt");

-- CreateIndex
CREATE INDEX "Call_businessId_status_idx" ON "Call"("businessId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_businessId_status_idx" ON "KnowledgeDocument"("businessId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_businessId_createdAt_idx" ON "KnowledgeDocument"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_businessId_idx" ON "KnowledgeChunk"("businessId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_position_idx" ON "KnowledgeChunk"("documentId", "position");

-- CreateIndex
CREATE INDEX "FAQ_businessId_approved_idx" ON "FAQ"("businessId", "approved");

-- CreateIndex
CREATE INDEX "Service_businessId_bookable_idx" ON "Service"("businessId", "bookable");

-- CreateIndex
CREATE UNIQUE INDEX "Service_businessId_name_key" ON "Service"("businessId", "name");

-- CreateIndex
CREATE INDEX "Appointment_businessId_startsAt_idx" ON "Appointment"("businessId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_startsAt_idx" ON "Appointment"("serviceId", "startsAt");

-- CreateIndex
CREATE INDEX "SupportTicket_businessId_status_idx" ON "SupportTicket"("businessId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_conversationId_idx" ON "SupportTicket"("conversationId");

-- CreateIndex
CREATE INDEX "Integration_businessId_kind_idx" ON "Integration"("businessId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_businessId_provider_key" ON "Integration"("businessId", "provider");

-- CreateIndex
CREATE INDEX "Notification_businessId_createdAt_idx" ON "Notification"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_businessId_key" ON "Subscription"("businessId");

-- CreateIndex
CREATE INDEX "UsageRecord_businessId_metric_period_idx" ON "UsageRecord"("businessId", "metric", "period");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHour" ADD CONSTRAINT "BusinessHour_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgent" ADD CONSTRAINT "AIAgent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
