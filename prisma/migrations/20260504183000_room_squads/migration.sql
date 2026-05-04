-- Если таблицы сквадов уже есть после `prisma db push`, не применяй SQL повторно:
--   npx prisma migrate resolve --applied 20260504183000_room_squads

-- CreateTable
CREATE TABLE "RoomSquad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dormId" TEXT NOT NULL,
    "roomLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "bannerColor" TEXT NOT NULL DEFAULT '#1ECC8A',
    "bannerImageUrl" TEXT,
    "bannerEmoji" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomSquad_dormId_fkey" FOREIGN KEY ("dormId") REFERENCES "Dorm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomSquadMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomSquadMember_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "RoomSquad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomSquadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "dormId" TEXT NOT NULL,
    "squadId" TEXT,
    "tag" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_dormId_fkey" FOREIGN KEY ("dormId") REFERENCES "Dorm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "RoomSquad" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "createdAt", "dormId", "id", "isAnonymous", "moderationStatus", "tag", "text") SELECT "authorId", "createdAt", "dormId", "id", "isAnonymous", "moderationStatus", "tag", "text" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_dormId_createdAt_idx" ON "Post"("dormId", "createdAt");
CREATE INDEX "Post_tag_idx" ON "Post"("tag");
CREATE INDEX "Post_squadId_createdAt_idx" ON "Post"("squadId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RoomSquad_dormId_idx" ON "RoomSquad"("dormId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSquad_dormId_roomLabel_key" ON "RoomSquad"("dormId", "roomLabel");

-- CreateIndex
CREATE INDEX "RoomSquadMember_userId_idx" ON "RoomSquadMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSquadMember_squadId_userId_key" ON "RoomSquadMember"("squadId", "userId");
