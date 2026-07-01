import WorksListPage from "@/components/produttivo/works-list-page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAtividadesPage({ searchParams }: PageProps) {
  return (
    <WorksListPage
      searchParams={searchParams}
      basePath="/admin/atividades"
      backHref="/admin"
      backLabel="Voltar ao admin"
    />
  );
}
