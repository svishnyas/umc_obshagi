-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "dormId" TEXT NOT NULL,
    "room" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_dormId_fkey" FOREIGN KEY ("dormId") REFERENCES "Dorm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "dormId", "id", "lastSeenAt", "nickname", "passwordHash", "room") SELECT "avatarUrl", "createdAt", "dormId", "id", "lastSeenAt", "nickname", "passwordHash", "room" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
UPDATE "User"
SET "isOwner" = true
WHERE "id" = (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
);
CREATE INDEX "User_dormId_idx" ON "User"("dormId");
CREATE UNIQUE INDEX "User_nickname_dormId_key" ON "User"("nickname", "dormId");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "dormId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_dormId_fkey" FOREIGN KEY ("dormId") REFERENCES "Dorm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "createdAt", "dormId", "id", "tag", "text") SELECT "authorId", "createdAt", "dormId", "id", "tag", "text" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_dormId_createdAt_idx" ON "Post"("dormId", "createdAt");
CREATE INDEX "Post_tag_idx" ON "Post"("tag");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
