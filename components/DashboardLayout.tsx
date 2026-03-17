import TopNav from '@/components/TopNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6fb' }}>
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, #fda4af 0%, #fca5a5 60%, transparent 100%)', opacity: 0.28, filter: 'blur(60px)' }}
        />
        <div
          className="absolute -bottom-24 -right-28 w-[440px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, #818cf8 60%, transparent 100%)', opacity: 0.22, filter: 'blur(60px)' }}
        />
        <div
          className="absolute -top-20 right-10 w-[360px] h-[360px] rounded-full"
          style={{ background: 'radial-gradient(circle, #fde68a 0%, #fb923c 60%, transparent 100%)', opacity: 0.12, filter: 'blur(60px)' }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <TopNav />
        <main>{children}</main>
      </div>
    </div>
  );
}
