-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "period" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "dateOfBirth" DATETIME,
    "nationalId" TEXT,
    "registrationDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "subscriptionPeriod" TEXT,
    "hasPromotion" BOOLEAN NOT NULL DEFAULT false,
    "promotionPeriod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("createdAt", "email", "fullName", "id", "notes", "phone", "updatedAt") SELECT "createdAt", "email", "fullName", "id", "notes", "phone", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
