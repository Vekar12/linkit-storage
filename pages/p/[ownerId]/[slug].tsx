import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Download, LayoutDashboard, Link2 } from 'lucide-react';
import { getProjectMetadata } from '@/services/api';
import type { ProjectMetadata } from '@/types';

export default function PublicViewPage() {
  const router = useRouter();
  const { ownerId, slug } = router.query;

  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ownerId || !slug || typeof ownerId !== 'string' || typeof slug !== 'string') return;
    getProjectMetadata(ownerId, slug)
      .then(setMetadata)
      .catch((err) => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [ownerId, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Link2 size={28} className="text-primary animate-pulse" />
      </div>
    );
  }

  if (notFound || !metadata) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Not found</h1>
        <p className="text-gray-500 text-sm">This link does not exist or has been removed.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-6 btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { fileType, fileURL } = metadata;
  const isHTML  = fileType === 'text/html' || fileType === 'html';
  const isPDF   = fileType === 'application/pdf' || fileType === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'image/png', 'image/jpeg'].includes(fileType);
  const isZip   = fileType === 'application/zip' || fileType === 'zip';
  const isPPTX  = fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileType === 'pptx';

  const rawURL = metadata.versions?.[metadata.versions.length - 1]?.fileURL ?? fileURL;
  const latestURL = `${rawURL}${rawURL.includes('?') ? '&' : '?'}_cb=${Date.now()}`;

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <div className="flex-1 overflow-hidden">
        {(isHTML || isPDF) && (
          <iframe
            src={latestURL}
            title={slug as string}
            className="w-full h-full border-0"
            sandbox={isHTML ? 'allow-scripts allow-same-origin allow-forms' : undefined}
          />
        )}

        {isImage && (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={latestURL} alt={slug as string} className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {isZip && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-background gap-4">
            <Download size={48} className="text-gray-300" />
            <p className="text-gray-600 font-medium">ZIP Archive — cannot be previewed</p>
            <a href={latestURL} download target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
              <Download size={16} />
              Download ZIP
            </a>
          </div>
        )}

        {isPPTX && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-background gap-4">
            <Download size={48} className="text-gray-300" />
            <p className="text-gray-600 font-medium">PowerPoint Presentation — cannot be previewed in browser</p>
            <a href={latestURL} download target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
              <Download size={16} />
              Download PPTX
            </a>
          </div>
        )}
      </div>

      {/* Minimal footer bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-2 text-xs"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
      >
        <div className="flex items-center gap-2 text-white/80 font-semibold">
          <Link2 size={14} />
          LinkIt
        </div>
        <div className="flex items-center gap-4">
          <a href={rawURL} download target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
            <Download size={13} />
            Download
          </a>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
          >
            <LayoutDashboard size={13} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
