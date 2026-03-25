import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Upload, Code2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import FileDropzone from '@/components/FileDropzone';
import { updateProject } from '@/services/api';
import { addHistory } from '@/lib/history';
import { checkAuth } from '@/lib/auth';
import { getTokenPayload } from '@/lib/jwt';

export default function UpdatePage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'html'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [htmlCode, setHtmlCode] = useState('');
  const [editCode, setEditCode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [shareUrlInput, setShareUrlInput] = useState('');
  const [loading, setLoading] = useState(false);

  const currentUserId = getTokenPayload()?.sub ?? '';
  const isOwner = !ownerId || ownerId === currentUserId;

  const handleParseShareUrl = (url: string) => {
    setShareUrlInput(url);
    const match = url.match(/\/p\/([^/\s]+)\/([^/\s?#]+)/);
    if (match) {
      setOwnerId(match[1]);
      setSlug(match[2]);
    }
  };

  useEffect(() => {
    if (router.query.slug) setSlug(router.query.slug as string);
    if (router.query.owner) setOwnerId(router.query.owner as string);
  }, [router.query.slug, router.query.owner]);

  useEffect(() => {
    if (!checkAuth()) router.replace('/login');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sync validation before any await
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) { toast.error('Please enter the project slug.'); return; }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens.');
      return;
    }
    if (uploadMode === 'html' && !htmlCode.trim()) { toast.error('Paste some HTML code first.'); return; }
    if (uploadMode === 'file' && !file) { toast.error('Please select a file to upload.'); return; }
    if (!isOwner && !editCode.trim()) {
      toast.error('Edit code is required to update someone else\'s project.');
      return;
    }

    // Open new tab now — must be synchronous within the user gesture
    const newTab = window.open('', '_blank');

    let uploadFile: File | null = file;

    if (uploadMode === 'html') {
      const blob = new Blob([htmlCode], { type: 'text/html' });
      uploadFile = new File([blob], `${cleanSlug}.html`, { type: 'text/html' });
    } else if (uploadFile!.name.endsWith('.md')) {
      try {
        const text = await uploadFile!.text();
        const { marked } = await import('marked');
        const html = await marked(text);
        const blob = new Blob([html], { type: 'text/html' });
        uploadFile = new File([blob], uploadFile!.name.replace('.md', '.html'), { type: 'text/html' });
      } catch {
        toast.error('Failed to parse Markdown. Please check your file.');
        try { newTab?.close(); } catch {}
        return;
      }
    }

    const attemptUpdate = async (attemptsLeft: number): Promise<void> => {
      try {
        await updateProject(cleanSlug, uploadFile!, {
          ...(isOwner ? {} : { ownerId, editCode: editCode.trim() }),
          ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        });
        addHistory({ type: 'updated', projectName: cleanSlug, slug: cleanSlug });
        const shareOwner = ownerId || currentUserId;
        const linkPath = shareOwner ? `/p/${shareOwner}/${cleanSlug}` : `/p/${cleanSlug}`;
        const link = `${window.location.origin}${linkPath}`;
        if (newTab && !newTab.closed) newTab.location.href = link;
        toast.success('Upload successful!', { duration: 7000 });
        router.push(`/projects/${cleanSlug}?owner=${shareOwner}`);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: unknown } };
        const status = axiosErr?.response?.status;
        console.error('[update] PUT failed', { status, data: axiosErr?.response?.data });

        if (status === 500 && attemptsLeft > 0) {
          toast.loading('GitHub is busy — retrying in 3 s…', { id: 'retry' });
          await new Promise((r) => setTimeout(r, 3000));
          toast.dismiss('retry');
          return attemptUpdate(attemptsLeft - 1);
        }

        try { newTab?.close(); } catch {}
        const serverMsg = (axiosErr?.response?.data as { message?: string; error?: string })?.message
          ?? (axiosErr?.response?.data as { message?: string; error?: string })?.error;
        const msg = status === 404
          ? 'No project found with that slug.'
          : status === 403
          ? 'You do not have permission to update this project.'
          : status === 500
          ? 'GitHub is temporarily unavailable. Please try again in a moment.'
          : serverMsg ?? `Update failed (status ${status ?? 'no response'}).`;
        toast.error(msg);
      }
    };

    setLoading(true);
    try {
      await attemptUpdate(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-gray-900">Update Project</h1>
          <p className="text-gray-400 text-sm mt-1">Replace the file while keeping the same share link.</p>
        </div>

        <div className="li-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Collaborator helper — paste share URL to auto-fill slug + owner */}
            {!router.query.slug && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <p className="text-xs font-semibold text-violet-700 mb-1.5">Updating someone else&apos;s project?</p>
                <input
                  type="text"
                  className="li-input text-sm"
                  placeholder="Paste the share URL — e.g. https://…/p/123456/my-resume"
                  value={shareUrlInput}
                  onChange={(e) => handleParseShareUrl(e.target.value)}
                />
                <p className="text-xs text-violet-500 mt-1">Slug and owner ID will be filled automatically.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Slug</label>
              <input
                type="text"
                className="li-input"
                placeholder="e.g. my-resume"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1.5">Find this on your project card in the dashboard.</p>
            </div>

            {/* Edit code — only shown for non-owner collaborator updates */}
            {!isOwner && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-gray-400" />
                  Edit Code
                </label>
                <input
                  type="text"
                  className="li-input font-mono tracking-widest uppercase"
                  placeholder="e.g. A3X9KZ2M"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
                <p className="text-xs text-gray-400 mt-1.5">Ask the project owner to share their edit code with you.</p>
              </div>
            )}

            <div
              className="flex gap-1 rounded-xl p-1 border border-gray-100"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  uploadMode === 'file' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Upload size={14} />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('html')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  uploadMode === 'html' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Code2 size={14} />
                Paste HTML
              </button>
            </div>

            {uploadMode === 'file' ? (
              <FileDropzone file={file} onFileSelect={setFile} />
            ) : (
              <textarea
                className="li-input font-mono text-xs resize-none"
                rows={12}
                placeholder={'Paste your updated HTML code here…\n\n<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>'}
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                spellCheck={false}
              />
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Version notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                className="li-input resize-none text-sm"
                rows={2}
                placeholder="e.g. Updated pricing section, fixed mobile layout…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={200}
              />
            </div>

            <button
              type="submit"
              disabled={loading || (uploadMode === 'html' && !htmlCode.trim())}
              className="li-btn-primary w-full py-3.5 text-base"
            >
              {loading ? 'Updating…' : 'Upload New Version'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
