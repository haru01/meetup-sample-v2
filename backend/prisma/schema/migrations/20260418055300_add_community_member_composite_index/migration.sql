-- CreateIndex
CREATE INDEX "CommunityMember_communityId_status_createdAt_idx" ON "CommunityMember"("communityId", "status", "createdAt");
