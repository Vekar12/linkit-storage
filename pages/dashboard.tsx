import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Copy, CheckCircle, Search, Upload, Code2, Lock, Globe,
  LayoutGrid, RefreshCw, Plus, Trash2, Clock, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import DashboardLayout from '@/components/DashboardLayout';
import ProjectCard from '@/components/ProjectCard';
import FileDropzone from '@/components/FileDropzone';
import RecentActivity from '@/components/ActivityPane';
import { getProjects, createProject, getPublicProjects } from '@/services/api';
import { checkAuth } from '@/lib/auth';
import { addHistory, getHistory, type HistoryEntry } from '@/lib/history';
import { setVisibility, getVisibility, type Visibility } from '@/lib/visibility';
import { getTokenPayload } from '@/lib/jwt';
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

function invalidateCache() { _cache = null; }

const PAGE_SIZE = 20;

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Skeleton card ──
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl aspect-square flex flex-col justify-between p-3 animate-pulse" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="w-6 h-6 rounded-lg bg-gray-100" />
        <div className="w-10 h-4 rounded-full bg-gray-100" />
      </div>
      <div className="flex-1 px-0 py-3">
        <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2 mb-1.5" />
        <div className="h-2.5 bg-gray-100 rounded w-2/3" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-7 bg-gray-100 rounded-xl" />
        <div className="flex gap-1.5">
          <div className="flex-1 h-7 bg-gray-100 rounded-xl" />
          <div className="flex-1 h-7 bg-gray-100 rounded-xl" />
          <div className="flex-1 h-7 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const view = (typeof router.query.view === 'string' ? router.query.view : null) ?? 'projects';

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

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

  // Right panel
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);

  // User greeting
  const payload = getTokenPayload();
  const displayName = payload?.name || payload?.login || payload?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const init = async () => {
      if (!checkAuth()) { router.replace('/login'); return; }
      try {
        const data = await fetchWithCache();
        setProjects(data);
      } catch {
        setLoadError(true);
        toast.error('Failed to load projects.');
      } finally {
        setLoadingProjects(false);
      }
      try {
        const pub = await getPublicProjects();
        setPublicProjects(pub);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404 && status !== 501) {
          console.warn('GET /projects/public not available yet:', status);
        }
      } finally {
        setLoadingPublic(false);
      }
    };
    init();
    setRecentHistory(getHistory());
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
      if (uploadFile.name.endsWith('.md')) {
        try {
          const text = await uploadFile.text();
          const html = await marked(text);
          const blob = new Blob([html], { type: 'text/html' });
          uploadFile = new File([blob], uploadFile.name.replace('.md', '.html'), { type: 'text/html' });
        } catch {
          toast.error('Failed to parse Markdown. Please check your file and try again.');
          return;
        }
      }
    }

    const attemptCreate = async (attemptsLeft: number): Promise<void> => {
      try {
        const result = await createProject(projectName.trim(), uploadFile!, newVisibility);
        setVisibility(result.slug, newVisibility);
        toast.success('Link created!');
        addHistory({ type: 'created', projectName: projectName.trim(), slug: result.slug });
        invalidateCache();
        const data = await fetchWithCache();
        setProjects(data);
        const newProject = data.find((p) => p.slug === result.slug);
        const correctLink = newProject
          ? (newProject.shareLink ?? `${window.location.origin}/p/${newProject.ownerId}/${newProject.slug}`)
          : result.shareLink;
        setShareLink(correctLink);
        setProjectName('');
        setFile(null);
        setHtmlCode('');
        setRecentHistory(getHistory());
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
        const status = axiosErr?.response?.status;

        if (status === 500 && attemptsLeft > 0) {
          toast.loading('GitHub is busy — retrying in 3 s…', { id: 'retry' });
          await new Promise((r) => setTimeout(r, 3000));
          toast.dismiss('retry');
          return attemptCreate(attemptsLeft - 1);
        }

        const msg = status === 409
          ? 'A project with this name already exists.'
          : status === 403
          ? 'You do not have permission to create this project.'
          : status === 500
          ? 'GitHub is temporarily unavailable. Please try again in a moment.'
          : axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ?? `Upload failed (${status ?? 'no response'})`;
        toast.error(msg);
      }
    };

    setUploading(true);
    try {
      await attemptCreate(1);
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

  const filteredProjects = useMemo(() => projects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = p.projectName.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    const matchesVisibility = visibilityFilter === 'all' || getVisibility(p.slug) === visibilityFilter;
    return matchesSearch && matchesVisibility;
  }), [projects, search, visibilityFilter]);

  const visibleProjects = filteredProjects.slice(0, page * PAGE_SIZE);
  const hasMore = visibleProjects.length < filteredProjects.length;

  // Stat card values
  const publicCount = projects.filter((p) => getVisibility(p.slug) === 'public').length;
  const personalCount = projects.filter((p) => getVisibility(p.slug) === 'personal').length;
  const totalVersions = projects.reduce((sum, p) => sum + (p.versions?.length ?? 1), 0);

  const statCards = [
    { label: 'Total Projects',  value: projects.length, icon: LayoutGrid, bg: 'bg-violet-100', color: 'text-violet-600' },
    { label: 'Public Links',    value: publicCount,     icon: Globe,       bg: 'bg-emerald-100', color: 'text-emerald-600' },
    { label: 'Personal Files',  value: personalCount,   icon: Lock,        bg: 'bg-blue-100',    color: 'text-blue-600' },
    { label: 'Total Versions',  value: totalVersions,   icon: RefreshCw,   bg: 'bg-orange-100',  color: 'text-orange-500' },
  ];

  // Right panel — recent activity (last 4)
  const miniActivity = recentHistory.slice(0, 4);

  return (
    <DashboardLayout>
      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* ── Projects view ── */}
        {view === 'projects' && (
          <div className="flex gap-6 items-start">

            {/* Main column */}
            <div className="flex-1 min-w-0">
              {/* Greeting */}
              <div className="mb-7">
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {greeting}, {displayName}!
                </h1>
                <p className="text-gray-400 text-sm mt-1">Here's what's happening with your links today.</p>
              </div>

              {/* Stat cards */}
              {!loadingProjects && !loadError && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {statCards.map((s) => (
                    <div key={s.label} className="li-card flex items-start gap-4 !p-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                        <s.icon size={18} className={s.color} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search + filter bar */}
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div
                  className="flex items-center gap-0.5 rounded-full px-1.5 py-1.5"
                  style={{ backgroundColor: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  {(['all', 'personal', 'public'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setVisibilityFilter(f); setPage(1); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        visibilityFilter === f
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f === 'personal' && <Lock size={10} />}
                      {f === 'public' && <Globe size={10} />}
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="li-input pl-9 pr-4 py-2 text-sm w-52"
                  />
                </div>
              </div>

              {/* Grid */}
              {loadingProjects ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : loadError ? (
                <div className="li-card text-center py-12">
                  <p className="text-red-500 text-sm font-medium mb-3">Failed to load projects.</p>
                  <button
                    onClick={() => {
                      invalidateCache();
                      setLoadError(false);
                      setLoadingProjects(true);
                      fetchWithCache().then(setProjects).catch(() => setLoadError(true)).finally(() => setLoadingProjects(false));
                    }}
                    className="li-btn-primary px-5 py-2 text-sm"
                  >
                    Retry
                  </button>
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
                      <button onClick={() => setPage((p) => p + 1)} className="li-btn-primary px-6 py-2.5 text-sm">
                        Load more
                      </button>
                    </div>
                  )}
                </>
              ) : search ? (
                <p className="text-gray-400 text-sm">No projects match &quot;{search}&quot;.</p>
              ) : (
                <div className="li-card text-center py-16">
                  <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload size={24} className="text-violet-500" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">No projects yet</p>
                  <p className="text-gray-400 text-sm mb-5">Upload your first file to get a permanent shareable link.</p>
                  <button
                    onClick={() => router.push('/dashboard?view=upload')}
                    className="li-btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2"
                  >
                    <Upload size={14} />
                    Upload a file
                  </button>
                </div>
              )}

              {/* Public Projects section */}
              {!loadingProjects && !loadError && (
                <div className="mt-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={15} className="text-emerald-500" />
                    <h2 className="text-base font-bold text-gray-800">
                      Public Projects
                      {!loadingPublic && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          {publicProjects.length} from all users
                        </span>
                      )}
                    </h2>
                  </div>
                  <div className="li-card !p-4" style={{ borderColor: 'rgba(16,185,129,0.15)', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' }}>
                    <p className="text-xs text-emerald-600 mb-4">
                      Projects marked as Public by any user appear here for everyone.
                    </p>
                    {loadingPublic ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                      </div>
                    ) : publicProjects.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {publicProjects.map((project) => (
                          <ProjectCard
                            key={project.slug}
                            project={project}
                            onDeleted={(slug) => {
                              invalidateCache();
                              setProjects((prev) => prev.filter((p) => p.slug !== slug));
                              setPublicProjects((prev) => prev.filter((p) => p.slug !== slug));
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-center py-6 text-emerald-700/50">
                        No public projects yet. Set any project to Public to share it here.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right panel ── */}
            <div className="w-72 flex-shrink-0 hidden xl:flex flex-col gap-4">

              {/* Quick Upload CTA */}
              <div className="li-card !p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-800 text-sm">Quick Upload</h3>
                  <ExternalLink size={13} className="text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Upload a file and get a permanent shareable link instantly.
                </p>
                <button
                  onClick={() => router.push('/dashboard?view=upload')}
                  className="li-btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <Upload size={13} />
                  Upload File
                </button>
              </div>

              {/* Mini Recent Activity */}
              <div className="li-card !p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                    <Clock size={13} className="text-primary" />
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => router.push('/dashboard?view=recent')}
                    className="text-xs text-primary hover:underline"
                  >
                    View all
                  </button>
                </div>
                {miniActivity.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No activity yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {miniActivity.map((e, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          e.type === 'created' ? 'bg-violet-100' : e.type === 'updated' ? 'bg-amber-100' : 'bg-red-100'
                        }`}>
                          {e.type === 'created'
                            ? <Plus size={11} className="text-violet-600" />
                            : e.type === 'updated'
                            ? <RefreshCw size={11} className="text-amber-500" />
                            : <Trash2 size={11} className="text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{e.projectName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(e.at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Estimated Processing card (mirrors the design's right-panel feel) */}
              <div
                className="li-card !p-5"
                style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: 'rgba(124,58,237,0.15)' }}
              >
                <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Link Status</p>
                <p className="text-sm font-bold text-gray-800 mb-1">Always up to date</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Your share links always serve the latest file version automatically.
                </p>
                <div className="w-full h-1.5 bg-violet-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-[10px] text-violet-400 mt-1.5">Instant propagation</p>
              </div>

            </div>
          </div>
        )}

        {/* ── Upload view ── */}
        {view === 'upload' && (
          <div className="max-w-xl">
            <div className="mb-7">
              <h1 className="text-2xl font-extrabold text-gray-900">Upload File</h1>
              <p className="text-gray-400 text-sm mt-1">Get a permanent shareable link in seconds.</p>
            </div>

            <div className="li-card">
              {shareLink ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-primary" />
                  </div>
                  <p className="font-bold text-gray-900 text-lg mb-1">Your link is ready!</p>
                  <p className="text-gray-400 text-sm mb-5">This link always points to the latest version.</p>
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 border border-gray-100"
                    style={{ backgroundColor: '#f9fafb' }}
                  >
                    <span className="text-primary text-sm truncate flex-1 text-left font-medium">{shareLink}</span>
                    <button onClick={handleCopy} className="text-primary hover:text-primary-dark transition-colors flex-shrink-0">
                      {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="li-btn-primary w-full py-2.5 flex items-center justify-center gap-2 mb-3 rounded-xl"
                  >
                    <ExternalLink size={15} />
                    Open Link
                  </a>
                  <div className="flex gap-3">
                    <button onClick={handleCopy} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => setShareLink('')}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Upload Another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mode switcher */}
                  <div
                    className="flex gap-1 rounded-xl p-1 mb-6 border border-gray-100"
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

                  <form onSubmit={handleUpload} className="flex flex-col gap-5">
                    <input
                      type="text"
                      className="li-input"
                      placeholder="Project name (e.g. My Resume)"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      maxLength={80}
                    />

                    {uploadMode === 'file' ? (
                      <FileDropzone file={file} onFileSelect={setFile} />
                    ) : (
                      <textarea
                        className="li-input font-mono text-xs resize-none"
                        rows={10}
                        placeholder={'Paste your HTML here…\n\n<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>'}
                        value={htmlCode}
                        onChange={(e) => setHtmlCode(e.target.value)}
                        spellCheck={false}
                      />
                    )}

                    {/* Visibility */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Visibility</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewVisibility('personal')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            newVisibility === 'personal'
                              ? 'border-primary text-primary bg-violet-50'
                              : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Lock size={13} /> Personal
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewVisibility('public')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            newVisibility === 'public'
                              ? 'border-primary text-primary bg-violet-50'
                              : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Globe size={13} /> Public
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {newVisibility === 'personal'
                          ? 'Only visible to you. Share link still works for anyone with it.'
                          : 'Appears in the public directory. Share link works for all.'}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || (uploadMode === 'html' && !htmlCode.trim())}
                      className="li-btn-primary w-full py-3 text-base"
                    >
                      {uploading ? 'Uploading…' : 'Upload & Generate Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Recent view ── */}
        {view === 'recent' && <RecentActivity />}

      </div>
    </DashboardLayout>
  );
}
