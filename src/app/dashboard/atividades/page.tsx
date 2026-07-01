import WorksListPage from "@/components/produttivo/works-list-page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardAtividadesPage({ searchParams }: PageProps) {
  return (
    <WorksListPage
      searchParams={searchParams}
      basePath="/dashboard/atividades"
      backHref="/dashboard"
      backLabel="Voltar ao painel"
    />
  );
}
