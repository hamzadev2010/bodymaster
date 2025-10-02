-- CreateTable
CREATE TABLE "ClientHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
