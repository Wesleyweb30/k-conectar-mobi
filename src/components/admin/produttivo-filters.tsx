"use client";

import type { ProduttivoAccountMember } from "@/types/produttivo";
import ProduttivoListFilters from "@/components/admin/produttivo-list-filters";

type Props = {
  members: ProduttivoAccountMember[];
};

export default function ProduttivoFilters({ members }: Props) {
  return <ProduttivoListFilters basePath="/admin/produttivo" members={members} />;
}
