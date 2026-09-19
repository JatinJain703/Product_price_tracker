-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "stock" TEXT,
    "hasError" BOOLEAN NOT NULL DEFAULT false,
    "errorText" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);
