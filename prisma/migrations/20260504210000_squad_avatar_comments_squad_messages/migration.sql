-- RoomSquad: avatarUrl, drop bannerEmoji
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoomSquad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dormId" TEXT NOT NULL,
    "roomLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "bannerColor" TEXT NOT NULL DEFAULT '#1ECC8A',
    "bannerImageUrl" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomSquad_dormId_fkey" FOREIGN KEY ("dormId") REFERENCES "Dorm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RoomSquad" ("id", "dormId", "roomLabel", "title", "bannerColor", "bannerImageUrl", "createdAt")
SELECT "id", "dormId", "roomLabel", "title", "bannerColor", "bannerImageUrl", "createdAt" FROM "RoomSquad";
DROP TABLE "RoomSquad";
ALTER TABLE "new_RoomSquad" RENAME TO "RoomSquad";
CREATE INDEX "RoomSquad_dormId_idx" ON "RoomSquad"("dormId");
CREATE UNIQUE INDEX "RoomSquad_dormId_roomLabel_key" ON "RoomSquad"("dormId", "roomLabel");

ALTER TABLE "Comment" RENAME TO "Comment_old";

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "Comment" ("id", "postId", "authorId", "text", "parentId", "createdAt")
SELECT "id", "postId", "authorId", "text", NULL, "createdAt" FROM "Comment_old";
DROP TABLE "Comment_old";
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

CREATE TABLE "SquadRoomMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dormId" TEXT NOT NULL,
    "fromSquadId" TEXT NOT NULL,
    "toSquadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SquadRoomMessage_dormId_fkey" FOREIGN KEY ("dormId") REFERENCES "Dorm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SquadRoomMessage_fromSquadId_fkey" FOREIGN KEY ("fromSquadId") REFERENCES "RoomSquad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SquadRoomMessage_toSquadId_fkey" FOREIGN KEY ("toSquadId") REFERENCES "RoomSquad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SquadRoomMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SquadRoomMessage_dormId_createdAt_idx" ON "SquadRoomMessage"("dormId", "createdAt");
CREATE INDEX "SquadRoomMessage_fromSquadId_createdAt_idx" ON "SquadRoomMessage"("fromSquadId", "createdAt");
CREATE INDEX "SquadRoomMessage_toSquadId_createdAt_idx" ON "SquadRoomMessage"("toSquadId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
