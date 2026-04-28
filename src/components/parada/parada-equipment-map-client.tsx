"use client";

import dynamic from "next/dynamic";

const ParadaEquipmentMap = dynamic(
  () => import("@/components/parada/parada-equipment-map"),
  { ssr: false },
);

export default ParadaEquipmentMap;
