-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Measurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "humidity" REAL,
    "airSpeed" REAL,
    "temperature" REAL,
    "fungiInternal" REAL,
    "fungiExternal" REAL,
    "ieRatio" REAL,
    "bacteriaInternal" REAL,
    "bacteriaExternal" REAL,
    "co2Internal" REAL,
    "co2External" REAL,
    "pm10" REAL,
    "pm25" REAL,
    "status" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Measurement_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Measurement_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Measurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Measurement" ("airSpeed", "bacteriaExternal", "bacteriaInternal", "co2External", "co2Internal", "comments", "createdAt", "date", "fungiExternal", "fungiInternal", "humidity", "id", "ieRatio", "institutionId", "latitude", "longitude", "pm10", "pm25", "sectorId", "status", "temperature", "userId") SELECT "airSpeed", "bacteriaExternal", "bacteriaInternal", "co2External", "co2Internal", "comments", "createdAt", "date", "fungiExternal", "fungiInternal", "humidity", "id", "ieRatio", "institutionId", "latitude", "longitude", "pm10", "pm25", "sectorId", "status", "temperature", "userId" FROM "Measurement";
DROP TABLE "Measurement";
ALTER TABLE "new_Measurement" RENAME TO "Measurement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
