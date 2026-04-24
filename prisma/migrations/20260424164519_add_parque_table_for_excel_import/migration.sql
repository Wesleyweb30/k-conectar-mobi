-- CreateTable
CREATE TABLE "parque" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER NOT NULL,
    "status" TEXT,
    "gestao" TEXT,
    "classe" TEXT,
    "municipio" TEXT,
    "bairro" TEXT,
    "logradouro" TEXT,
    "referencia" TEXT,
    "sentido" TEXT,
    "tipologiaAtual" TEXT,
    "quantidadeAbrigosTotens" INTEGER,
    "novaTipologia" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parque_codigo_key" ON "parque"("codigo");
