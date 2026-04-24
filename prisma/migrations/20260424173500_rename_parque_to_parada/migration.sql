ALTER TABLE "parque" RENAME TO "parada";

ALTER TABLE "parada" RENAME CONSTRAINT "parque_pkey" TO "parada_pkey";

ALTER INDEX "parque_codigo_key" RENAME TO "parada_codigo_key";
