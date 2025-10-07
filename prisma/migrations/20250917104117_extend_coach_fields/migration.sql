-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Coach" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "specialty" TEXT,
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
INSERT INTO "new_Coach" ("createdAt", "email", "fullName", "id", "notes", "phone", "specialty", "updatedAt") SELECT "createdAt", "email", "fullName", "id", "notes", "phone", "specialty", "updatedAt" FROM "Coach";
DROP TABLE "Coach";
ALTER TABLE "new_Coach" RENAME TO "Coach";
CREATE UNIQUE INDEX "Coach_email_key" ON "Coach"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
