import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Copy, CheckCircle, Search, Upload, Code2, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import DashboardLayout from '@/components/DashboardLayout';
import ProjectCard from '@/components/ProjectCard';
import FileDropzone from '@/components/FileDropzone';
import RecentActivity from '@/components/ActivityPane';
import { getProjects, createProject } from '@/services/api';
import { checkAuth } from '@/lib/auth';
import { addHistory } from '@/lib/history';
import { setVisibility, getVisibility, type Visibility } from '@/lib/visibility';
import type { Project } from '@/types';

// ── Module-level cache ──
let _cache: { data: Project[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

async function fetchWithCache(): Promise<Project[]> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  const data = await getProjects();
  _cache = { data, ts: Date.now() };
  return data;
}

function invalidateCache() {
  _cache = null;
}

const PAGE_SIZE = 20;

// ── Skeleton card ──
function SkeletonCard() {
  return (
    <div
      className="border border-dark-border rounded-2xl aspect-square flex flex-col justify-between p-3 animate-pulse"
      style={{ backgroundColor: '#1c2333' }}
    >
      <div className="flex items-center justify-between">
        <div className="w-6 h-6 rounded-lg bg-dark-border" />
        <div className="w-10 h-4 rounded-full bg-dark-border" />
      </div>
      <div className="flex-1 px-0 py-3">
        <div className="h-3.5 bg-dark-border rounded w-3/4 mb-2" />
        <div className="h-3 bg-dark-border rounded w-1/2 mb-1.5" />
        <div className="h-2.5 bg-dark-border rounded w-2/3" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-7 bg-dark-border rounded-xl" />
        <div className="flex gap-1.5">
          <div className="flex-1 h-7 bg-dark-border rounded-xl" />
          <div className="flex-1 h-7 bg-dark-border rounded-xl" />
          <div className="flex-1 h-7 bg-dark-border rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const view = (router.query.view as string) || 'projects';

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Upload state
  const [uploadMode, setUploadMode] = useState<'file' | 'html'>('file');
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [htmlCode, setHtmlCode] = useState('');
  const [uploading, setUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [newVisibility, setNewVisibility] = useState<Visibility>('personal');

  // Filter state
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | Visibility>('all');

  useEffect(() => {
    const init = async () => {
      if (!checkAuth()) { router.replace('/login'); return; }
      try {
        const data = await fetchWithCache();
        setProjects(data);
      } catch {
        toast.error('Failed to load projects.');
      } finally {
        setLoadingProjects(false);
      }
    };
    init();
  }, [router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) { toast.error('Enter a project name.'); return; }

    let uploadFile: File | null = file;

    if (uploadMode === 'html') {
      if (!htmlCode.trim()) { toast.error('Paste some HTML code first.'); return; }
      const blob = new Blob([htmlCode], { type: 'text/html' });
      const safeName = projectName.trim().toLowerCase().replace(/\s+/g, '-');
      uploadFile = new File([blob], `${safeName}.html`, { type: 'text/html' });
    } else {
      if (!uploadFile) { toast.error('Select a file.'); return; }
      // Convert markdown to HTML before upload
      if (uploadFile.name.endsWith('.md')) {
        const text = await uploadFile.text();
        const html = await marked(text);
        const blob = new Blob([html], { type: 'text/html' });
        uploadFile = new File([blob], uploadFile.name.replace('.md', '.html'), { type: 'text/html' });
      }
    }

    setUploading(true);
    try {
      const result = await createProject(projectName.trim(), uploadFile!, newVisibility);
      setVisibility(result.slug, newVisibility);
      setShareLink(result.shareLink);
      toast.success('Link created!');
      addHistory({ type: 'created', projectName: projectName.trim(), slug: result.slug });
      invalidateCache();
      const data = await fetchWithCache();
      setProjects(data);
      setProjectName('');
      setFile(null);
      setHtmlCode('');
      // Auto-open the new link
      window.open(`${window.location.origin}/p/${result.slug}`, '_blank');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const status = axiosErr?.response?.status;
      const msg = status === 409
        ? 'A project with this name already exists. Please choose a different name.'
        : status === 403
        ? 'You do not have permission to create this project.'
        : axiosErr?.response?.data?.error
          ?? axiosErr?.response?.data?.message
          ?? `Upload failed (${status ?? 'no response'})`;
      console.error('Upload error:', axiosErr?.response);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy.');
    }
  };

  const publicProjects = projects.filter((p) => getVisibility(p.slug) === 'public');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchesVisibility =
      visibilityFilter === 'all' || getVisibility(p.slug) === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  const visibleProjects = filteredProjects.slice(0, page * PAGE_SIZE);
  const hasMore = visibleProjects.length < filteredProjects.length;

  return (
    <DashboardLayout>
      <div className="px-6 sm:px-8 py-8 max-w-6xl mx-auto">

        {/* ── Projects view ── */}
        {view === 'projects' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h1 className="text-xl font-bold text-dark-text">
                Projects
                {!loadingProjects && (
                  <span className="ml-2 text-sm font-normal text-dark-muted">
                    {projects.length} total
                  </span>
                )}
              </h1>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="dark-input pl-9 pr-4 py-2 text-sm w-56"
                />
              </div>
            </div>

            {/* Visibility filter tabs */}
            <div className="flex gap-1 mb-6" style={{ backgroundColor: '#0d1117', borderRadius: '10px', padding: '4px', display: 'inline-flex' }}>
              {(['all', 'personal', 'public'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setVisibilityFilter(f); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    visibilityFilter === f
                      ? 'bg-dark-raised text-dark-text border border-dark-border'
                      : 'text-dark-muted hover:text-dark-text'
                  }`}
                >
                  {f === 'personal' && <Lock size={11} />}
                  {f === 'public' && <Globe size={11} />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Grid */}
            {loadingProjects ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredProjects.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.slug}
                      project={project}
                      onDeleted={(slug) => {
                        invalidateCache();
                        setProjects((prev) => prev.filter((p) => p.slug !== slug));
                      }}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="dark-btn-primary px-6 py-2.5 text-sm"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            ) : search ? (
              <p className="text-dark-muted text-sm">No projects match &quot;{search}&quot;.</p>
            ) : (
              <div className="text-center py-16">
                <p className="text-dark-muted text-base mb-2">No projects yet.</p>
                <p className="text-dark-dim text-sm">
                  Upload your first file to get started.
                </p>
                <button
                  onClick={() => router.push('/dashboard?view=upload')}
                  className="dark-btn-primary mt-5 px-6 py-2.5 text-sm inline-flex items-center gap-2"
                >
                  <Upload size={15} />
                  Upload a file
                </button>
              </div>
            )}

            {/* ── Public Projects section ── */}
            {!loadingProjects && publicProjects.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={15} className="text-green-400" />
                  <h2 className="text-base font-bold text-dark-text">
                    Public Projects
                    <span className="ml-2 text-sm font-normal text-dark-muted">{publicProjects.length} shared</span>
                  </h2>
                </div>
                <div
                  className="rounded-2xl border border-green-900/30 p-4"
                  style={{ backgroundColor: '#0f1f13' }}
                >
                  <p className="text-xs text-green-700 mb-4">
                    These projects are marked public and will appear in the public directory when launched.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {publicProjects.map((project) => (
                      <ProjectCard
                        key={project.slug}
                        project={project}
                        onDeleted={(slug) => {
                          invalidateCache();
                          setProjects((prev) => prev.filter((p) => p.slug !== slug));
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Upload view ── */}
        {view === 'upload' && (
          <div className="max-w-xl">
            <h1 className="text-xl font-bold text-dark-text mb-6">Upload File</h1>

            <div className="dark-card shadow-glow">
              {shareLink ? (
                <div className="text-center py-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: '#1c2333' }}
                  >
                    <CheckCircle size={28} className="text-primary" />
                  </div>
                  <p className="font-semibold text-dark-text mb-1">Your link is ready</p>
                  <p className="text-dark-muted text-sm mb-4">
                    This link always points to the latest version.
                  </p>
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 border border-dark-border"
                    style={{ backgroundColor: '#1c2333' }}
                  >
                    <span className="text-primary text-sm truncate flex-1 text-left font-medium">
                      {shareLink}
                    </span>
                    <button onClick={handleCopy} className="text-primary hover:text-primary-dark transition-colors flex-shrink-0">
                      {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCopy} className="dark-btn-primary flex-1 py-2.5">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => setShareLink('')}
                      className="dark-btn-ghost flex-1 py-2.5 border border-dark-border rounded-xl"
                    >
                      Upload Another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab switcher */}
                  <div
                    className="flex gap-1 rounded-xl p-1 mb-5 border border-dark-border"
                    style={{ backgroundColor: '#0d1117' }}
                  >
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        uploadMode === 'file'
                          ? 'bg-dark-raised text-dark-text border border-dark-border'
                          : 'text-dark-muted hover:text-dark-text'
                      }`}
                    >
                      <Upload size={14} />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('html')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        uploadMode === 'html'
                          ? 'bg-dark-raised text-dark-text border border-dark-border'
                          : 'text-dark-muted hover:text-dark-text'
                      }`}
                    >
                      <Code2 size={14} />
                      Paste HTML
                    </button>
                  </div>

                  <form onSubmit={handleUpload} className="flex flex-col gap-5">
                    <input
                      type="text"
                      className="dark-input"
                      placeholder="Project name (e.g. My Resume)"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      maxLength={80}
                    />

                    {uploadMode === 'file' ? (
                      <FileDropzone file={file} onFileSelect={setFile} />
                    ) : (
                      <textarea
                        className="dark-input font-mono text-xs resize-none"
                        rows={10}
                        placeholder={'Paste your HTML code here...\n\n<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>'}
                        value={htmlCode}
                        onChange={(e) => setHtmlCode(e.target.value)}
                        spellCheck={false}
                      />
                    )}

                    {/* Visibility toggle */}
                    <div>
                      <p className="text-xs text-dark-muted mb-2 font-medium">Visibility</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewVisibility('personal')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            newVisibility === 'personal'
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-dark-border text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          <Lock size={13} />
                          Personal
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewVisibility('public')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            newVisibility === 'public'
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-dark-border text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          <Globe size={13} />
                          Public
                        </button>
                      </div>
                      <p className="text-xs text-dark-dim mt-1.5">
                        {newVisibility === 'personal'
                          ? 'Only visible to you. Share link still works for anyone with it.'
                          : 'Will appear in public directory (coming soon). Share link works for all.'}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || (uploadMode === 'html' && !htmlCode.trim())}
                      className="dark-btn-primary w-full py-3 text-base"
                    >
                      {uploading ? 'Uploading...' : 'Upload & Generate Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Recent view ── */}
        {view === 'recent' && (
          <RecentActivity />
        )}

      </div>
    </DashboardLayout>
  );
}
