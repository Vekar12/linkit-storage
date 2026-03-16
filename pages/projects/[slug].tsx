import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Download, Clock, Link2, ExternalLink, RefreshCw } from 'lucide-react';
import { getProjectMetadata } from '@/services/api';
import type { ProjectMetadata } from '@/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function VersionHistoryPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;
    getProjectMetadata(slug)
      .then(setMetadata)
      .catch((err) => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${slug}`;

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
        <h1 className="text-xl font-bold text-gray-900 mb-2">Project not found</h1>
        <button onClick={() => router.push('/dashboard')} className="mt-4 btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const versions = [...(metadata.versions ?? [])].reverse();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        {/* Project header */}
        <div className="card shadow-purple mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{slug}</h1>
              <p className="text-gray-400 text-sm mt-0.5 font-mono">{slug}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 btn-primary text-sm py-2"
              >
                <ExternalLink size={14} />
                Open Link
              </a>
              <button
                onClick={() => router.push(`/update?slug=${slug}`)}
                className="flex items-center gap-1.5 btn-outline text-sm py-2"
              >
                <RefreshCw size={14} />
                Upload Update
              </button>
            </div>
          </div>
        </div>

        {/* Version history */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50 flex items-center gap-2">
            <Clock size={15} className="text-primary" />
            <h2 className="font-bold text-gray-900 text-base">
              Version History
              <span className="ml-2 text-sm font-normal text-gray-400">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
            </h2>
          </div>

          {versions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No versions found.</p>
          ) : (
            <ul className="divide-y divide-purple-50">
              {versions.map((v, i) => (
                <li key={v.version} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Version badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-primary text-white' : 'bg-secondary text-primary'
                    }`}>
                      v{v.version}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {v.filename}
                        {i === 0 && (
                          <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                            Latest
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(v.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <a
                    href={v.fileURL}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
                  >
                    <Download size={13} />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
