import Sidebar from '@/components/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#0d1117' }}>
        {children}
      </main>
    </div>
  );
}
