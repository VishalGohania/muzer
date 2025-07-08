/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `CurrentStream` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CurrentStream_userId_key" ON "CurrentStream"("userId");
