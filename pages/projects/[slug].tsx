import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Download, Clock, Link2, ExternalLink, RefreshCw, Lock, Globe, KeyRound, Copy, CheckCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjectMetadata, setProjectVisibility } from '@/services/api';
import type { ProjectMetadata } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';

export default function VersionHistoryPage() {
  const router = useRouter();
  const { slug, owner: ownerId, editCode: editCodeParam, name: nameParam } = router.query;
  const [editCode, setEditCode] = useState('');
  const [projectName, setProjectName] = useState('');

  // Sync from URL params after router hydrates (query is empty on first SSR render)
  useEffect(() => {
    if (typeof editCodeParam === 'string' && editCodeParam && !editCode) setEditCode(editCodeParam);
    if (typeof nameParam === 'string' && nameParam) setProjectName(nameParam);
  }, [editCodeParam, nameParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [visibility, setVisibilityState] = useState<'personal' | 'public'>('personal');
  const [codeCopied, setCodeCopied] = useState(false);

  const handleToggleVisibility = async () => {
    if (!slug || typeof slug !== 'string') return;
    const prev = visibility;
    const next = visibility === 'personal' ? 'public' : 'personal' as const;
    setVisibilityState(next);
    try {
      const updated = await setProjectVisibility(slug, next);
      const confirmed = updated.visibility ?? next;
      setVisibilityState(confirmed);
      toast.success(confirmed === 'public' ? 'Project set to Public' : 'Project set to Personal');
    } catch (err: unknown) {
      setVisibilityState(prev);
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message;
      toast.error(msg ?? `Could not update visibility (${status ?? 'no response'}).`);
    }
  };

  useEffect(() => {
    if (!slug || !ownerId || typeof slug !== 'string' || typeof ownerId !== 'string') return;
    getProjectMetadata(ownerId, slug)
      .then((data) => {
        setMetadata(data);
        if (data.visibility) setVisibilityState(data.visibility);
        if (data.editCode) setEditCode(data.editCode);
      })
      .catch((err) => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug, ownerId]);

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${ownerId}/${slug}`;

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
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={24} className="text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Project not found</h1>
          <p className="text-gray-400 text-sm mb-6">This project may have been deleted or doesn&apos;t exist.</p>
          <button onClick={() => router.push('/dashboard')} className="li-btn-primary px-6 py-2.5">
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const versions = [...(metadata.versions ?? [])].reverse();

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const versionDownloadUrl = (version: number) =>
    `${baseURL}/projects/${ownerId}/${slug}/download?version=${version}`;

  const isHtml = metadata?.fileType?.toLowerCase() === 'html';

  const handleDownloadHtmlAsPdf = async (version: number) => {
    const url = versionDownloadUrl(version);
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to save as PDF.'); return; }
    try {
      const res = await fetch(url);
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.onload = () => win.print();
      setTimeout(() => { if (!win.closed) win.print(); }, 2000);
    } catch {
      try { win.close(); } catch {}
      toast.error('Could not load file for PDF export.');
    }
  };

  const handleCopyCode = async () => {
    if (!editCode) return;
    try {
      await navigator.clipboard.writeText(editCode);
      setCodeCopied(true);
      toast.success('Edit code copied!');
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error('Could not copy.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        {/* Project header */}
        <div className="li-card mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{projectName || slug}</h1>
              {/* Edit code — shown to owner only when project is public */}
              {editCode && visibility === 'public' && (
                <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
                  <KeyRound size={13} className="text-violet-400 flex-shrink-0" />
                  <span className="text-xs text-violet-600 font-medium">Edit code:</span>
                  <span className="text-xs font-mono tracking-widest text-gray-700 bg-white px-2 py-0.5 rounded border border-violet-100">
                    {editCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    title="Copy edit code"
                    className="text-violet-400 hover:text-primary transition-colors ml-auto"
                  >
                    {codeCopied ? <CheckCircle size={13} className="text-primary" /> : <Copy size={13} />}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={handleToggleVisibility}
                className={`flex items-center gap-1.5 text-sm py-2 px-4 rounded-xl border font-medium transition-all ${
                  visibility === 'public'
                    ? 'border-emerald-300 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                {visibility === 'public' ? 'Public' : 'Personal'}
              </button>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 li-btn-primary text-sm py-2 px-4 rounded-xl"
              >
                <ExternalLink size={14} />
                Open Link
              </a>
              <button
                onClick={() => router.push(`/update?slug=${slug}&owner=${ownerId}`)}
                className="flex items-center gap-1.5 text-sm py-2 px-4 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
              >
                <RefreshCw size={14} />
                Upload Update
              </button>
            </div>
          </div>
        </div>

        {/* Version history */}
        <div className="li-card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2" style={{ backgroundColor: '#fafafa' }}>
            <Clock size={15} className="text-primary" />
            <h2 className="font-bold text-gray-800 text-base">
              Version History
              <span className="ml-2 text-sm font-normal text-gray-400">
                {versions.length} version{versions.length !== 1 ? 's' : ''}
              </span>
            </h2>
          </div>

          {versions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No versions found.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {versions.map((v, i) => (
                <li key={v.version} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      i === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      v{v.version}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        {v.filename}
                        {i === 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                            Latest
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(v.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {v.updatedBy && <span className="ml-1.5 text-gray-300">· by {v.updatedBy}</span>}
                      </p>
                      {v.remarks && (
                        <p className="text-xs text-gray-500 mt-1 italic max-w-xs">&ldquo;{v.remarks}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={versionDownloadUrl(v.version)}
                      download
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                      title={`Download v${v.version}`}
                    >
                      <Download size={12} />
                      Download
                    </a>
                    {isHtml && (
                      <button
                        onClick={() => handleDownloadHtmlAsPdf(v.version)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                        title="Save as PDF"
                      >
                        <FileText size={12} />
                        Save as PDF
                      </button>
                    )}
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
