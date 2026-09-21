-- PostPeer stores OAuth tokens externally; this table stores only the user's
-- profile/integration identifiers and connection state.
CREATE TYPE "PostPeerConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISCONNECTED', 'ERROR');

CREATE TABLE "PostPeerConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT,
    "status" "PostPeerConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "connectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostPeerConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostPeerConnection_userId_key" ON "PostPeerConnection"("userId");
CREATE UNIQUE INDEX "PostPeerConnection_profileId_key" ON "PostPeerConnection"("profileId");
CREATE UNIQUE INDEX "PostPeerConnection_accountId_key" ON "PostPeerConnection"("accountId");

ALTER TABLE "PostPeerConnection" ADD CONSTRAINT "PostPeerConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostPeerConnection" ENABLE ROW LEVEL SECURITY;
