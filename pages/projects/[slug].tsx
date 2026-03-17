import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Download, Clock, Link2, ExternalLink, RefreshCw, FileText, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjectMetadata, setProjectVisibility } from '@/services/api';
import type { ProjectMetadata } from '@/types';
import { getVisibility, setVisibility, type Visibility } from '@/lib/visibility';
import DashboardLayout from '@/components/DashboardLayout';

export default function VersionHistoryPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [visibility, setVisibilityState] = useState<Visibility>('personal');

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      setVisibilityState(getVisibility(slug));
    }
  }, [slug]);

  const handleToggleVisibility = async () => {
    if (!slug || typeof slug !== 'string') return;
    const next: Visibility = visibility === 'personal' ? 'public' : 'personal';
    setVisibilityState(next);
    setVisibility(slug, next);
    try {
      await setProjectVisibility(slug, next);
    } catch {
      // Backend may not support yet — localStorage updated
    }
    toast.success(next === 'public' ? 'Project set to Public' : 'Project set to Personal');
  };

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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Link2 size={28} className="text-primary animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !metadata) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h1 className="text-xl font-bold text-dark-text mb-2">Project not found</h1>
          <button onClick={() => router.push('/dashboard')} className="mt-4 dark-btn-primary px-6 py-2.5">
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const versions = [...(metadata.versions ?? [])].reverse();

  const handleDownloadPDF = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const win = window.open('', '_blank');
      if (!win) { alert('Please allow popups to download as PDF.'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 800);
    } catch {
      // Fallback: open file URL directly and let user print manually
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
        alert('Press Ctrl+P (or Cmd+P) and choose "Save as PDF".');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-dark-muted hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        {/* Project header */}
        <div className="dark-card mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-dark-text">{slug}</h1>
              <p className="text-dark-muted text-sm mt-0.5 font-mono">{slug}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {/* Visibility toggle */}
              <button
                onClick={handleToggleVisibility}
                className={`flex items-center gap-1.5 text-sm py-2 px-4 rounded-xl border font-medium transition-all ${
                  visibility === 'public'
                    ? 'border-green-500/50 text-green-400 bg-green-900/20 hover:bg-green-900/30'
                    : 'border-dark-border text-dark-muted hover:text-dark-text hover:border-dark-borderhover'
                }`}
              >
                {visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                {visibility === 'public' ? 'Public' : 'Personal'}
              </button>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 dark-btn-primary text-sm py-2 px-4"
              >
                <ExternalLink size={14} />
                Open Link
              </a>
              <button
                onClick={() => router.push(`/update?slug=${slug}`)}
                className="flex items-center gap-1.5 dark-btn-ghost text-sm py-2 px-4 border border-dark-border rounded-xl"
              >
                <RefreshCw size={14} />
                Upload Update
              </button>
            </div>
          </div>
        </div>

        {/* Version history */}
        <div
          className="rounded-2xl border border-dark-border overflow-hidden"
          style={{ backgroundColor: '#161b22' }}
        >
          <div
            className="px-6 py-4 border-b border-dark-border flex items-center gap-2"
            style={{ backgroundColor: '#1c2333' }}
          >
            <Clock size={15} className="text-primary" />
            <h2 className="font-bold text-dark-text text-base">
              Version History
              <span className="ml-2 text-sm font-normal text-dark-muted">
                {versions.length} version{versions.length !== 1 ? 's' : ''}
              </span>
            </h2>
          </div>

          {versions.length === 0 ? (
            <p className="text-dark-muted text-sm text-center py-10">No versions found.</p>
          ) : (
            <ul className="divide-y divide-dark-border">
              {versions.map((v, i) => (
                <li key={v.version} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-dark-raised transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Version badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-primary text-white' : 'bg-dark-raised text-primary border border-dark-border'
                    }`}>
                      v{v.version}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-text flex items-center gap-2">
                        {v.filename}
                        {i === 0 && (
                          <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full font-medium">
                            Latest
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-dark-muted mt-0.5">
                        {new Date(v.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Download buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={v.fileURL}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dark-border text-dark-muted hover:border-dark-borderhover hover:text-dark-text transition-colors"
                      title="Download HTML file"
                    >
                      <Download size={12} />
                      HTML
                    </a>
                    <button
                      onClick={() => handleDownloadPDF(v.fileURL, v.filename)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dark-border text-dark-muted hover:border-dark-borderhover hover:text-dark-text transition-colors"
                      title="Download as PDF"
                    >
                      <FileText size={12} />
                      PDF
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
