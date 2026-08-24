import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { DepotMenuButton } from './DepotMenuButton';

export function DepotTasksPage() {
  return (
    <div>
      <PageHeader title="Yapacaklarım" subtitle="Depo görev ve takip listesi" action={<DepotMenuButton />} />
      <div className="page-content">
        <EmptyState
          title="Henüz görev yok"
          description="Depo birimi için tanımlanacak görevler burada görünecek."
        />
      </div>
    </div>
  );
}
