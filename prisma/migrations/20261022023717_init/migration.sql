-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "robloxId" TEXT,
    "name" TEXT NOT NULL,
    "hue" INTEGER NOT NULL DEFAULT 18,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "wagered" REAL NOT NULL DEFAULT 0,
    "profit" REAL NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "games" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "fly" BOOLEAN NOT NULL DEFAULT false,
    "ride" BOOLEAN NOT NULL DEFAULT false,
    "neon" BOOLEAN NOT NULL DEFAULT false,
    "mega" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GameEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "side" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "won" BOOLEAN NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_robloxId_key" ON "User"("robloxId");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_locked_idx" ON "InventoryItem"("userId", "locked");

-- CreateIndex
CREATE INDEX "Game_mode_status_idx" ON "Game"("mode", "status");

-- CreateIndex
CREATE INDEX "GameEntry_gameId_idx" ON "GameEntry"("gameId");

-- CreateIndex
CREATE INDEX "GameEntry_userId_idx" ON "GameEntry"("userId");
