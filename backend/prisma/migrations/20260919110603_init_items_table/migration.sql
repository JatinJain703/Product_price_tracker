-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);
