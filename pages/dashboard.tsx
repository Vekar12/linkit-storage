import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Copy, CheckCircle, Search, Upload, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectCard from '@/components/ProjectCard';
import FileDropzone from '@/components/FileDropzone';
import { getProjects, createProject } from '@/services/api';
import { checkAuth } from '@/lib/auth';
import { addHistory } from '@/lib/history';
import ActivityPane from '@/components/ActivityPane';
import type { Project } from '@/types';

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [search, setSearch] = useState('');

  const [uploadMode, setUploadMode] = useState<'file' | 'html'>('file');
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [htmlCode, setHtmlCode] = useState('');
  const [uploading, setUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!checkAuth()) { router.replace('/login'); return; }
      try {
        const data = await getProjects();
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

    let uploadFile = file;

    if (uploadMode === 'html') {
      if (!htmlCode.trim()) { toast.error('Paste some HTML code first.'); return; }
      // Convert pasted HTML string into a .html File object
      const blob = new Blob([htmlCode], { type: 'text/html' });
      const safeName = projectName.trim().toLowerCase().replace(/\s+/g, '-');
      uploadFile = new File([blob], `${safeName}.html`, { type: 'text/html' });
    } else {
      if (!uploadFile) { toast.error('Select a file.'); return; }
    }

    setUploading(true);
    try {
      const result = await createProject(projectName.trim(), uploadFile!);
      setShareLink(result.shareLink);
      toast.success('Link created!');
      addHistory({ type: 'created', projectName: projectName.trim(), slug: result.slug });
      const data = await getProjects();
      setProjects(data);
      setProjectName('');
      setFile(null);
      setHtmlCode('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const msg = axiosErr?.response?.data?.error
        ?? axiosErr?.response?.data?.message
        ?? `Upload failed (${axiosErr?.response?.status ?? 'no response'})`;
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

  const filteredProjects = projects.filter((p) =>
    p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 w-full px-4 sm:px-8 py-8 max-w-7xl mx-auto flex gap-6 items-start">

        {/* ── Left: Activity pane ── */}
        <ActivityPane />

        {/* ── Right: Upload + Projects ── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* ── Upload card ── */}
        <div className="card shadow-purple">

          {shareLink ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={28} className="text-primary" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">Your link is ready</p>
              <p className="text-gray-400 text-sm mb-4">
                This link always points to the latest version.
              </p>
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3 mb-4 border-2 border-purple-100">
                <span className="text-primary text-sm truncate flex-1 text-left font-medium">
                  {shareLink}
                </span>
                <button onClick={handleCopy} className="text-primary hover:text-primary-dark transition-colors flex-shrink-0">
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCopy} className="btn-primary flex-1 py-2.5">
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button onClick={() => setShareLink('')} className="btn-secondary flex-1 py-2.5">
                  Upload Another
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 bg-background rounded-xl p-1 mb-5 border border-purple-100">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    uploadMode === 'file'
                      ? 'bg-white text-primary shadow-sm border border-purple-100'
                      : 'text-gray-400 hover:text-gray-600'
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
                      ? 'bg-white text-primary shadow-sm border border-purple-100'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Code2 size={14} />
                  Paste HTML
                </button>
              </div>

              <form onSubmit={handleUpload} className="flex flex-col gap-5">
                <input
                  type="text"
                  className="input"
                  placeholder="Project name  (e.g. My Resume)"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  maxLength={80}
                />

                {uploadMode === 'file' ? (
                  <FileDropzone file={file} onFileSelect={setFile} />
                ) : (
                  <textarea
                    className="input font-mono text-xs resize-none"
                    rows={10}
                    placeholder={'Paste your HTML code here…\n\n<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>'}
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    spellCheck={false}
                  />
                )}

                <button
                  type="submit"
                  disabled={uploading || (uploadMode === 'html' && !htmlCode.trim())}
                  className="btn-primary w-full py-3 text-base"
                >
                  {uploading ? 'Uploading…' : 'Upload & Generate Link'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── Projects — full width, grid ── */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">
              Projects
              {!loadingProjects && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {projects.length} total
                </span>
              )}
            </h2>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border-2 border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background w-56"
              />
            </div>
          </div>

          {/* Grid */}
          {loadingProjects ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse border border-purple-50 rounded-xl p-4 aspect-square flex flex-col justify-between">
                  <div className="h-4 bg-purple-50 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-purple-50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  onDeleted={(slug) => setProjects((prev) => prev.filter((p) => p.slug !== slug))}
                />
              ))}
            </div>
          ) : search ? (
            <p className="text-gray-400 text-sm">No projects match &quot;{search}&quot;.</p>
          ) : (
            <p className="text-gray-400 text-sm">No projects yet — upload your first file above.</p>
          )}
        </div>

        </div>{/* end right column */}
        </main>

      <Footer />
    </div>
  );
}
