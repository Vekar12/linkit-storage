import { useState } from 'react';
import { useRouter } from 'next/router';
import { ExternalLink, Download, RefreshCw, Calendar, Copy, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteProject } from '@/services/api';
import { addHistory } from '@/lib/history';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  onDeleted: (slug: string) => void;
}

export default function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${project.slug}`;

  const formattedDate = new Date(project.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const latestFileURL = project.versions?.[project.versions.length - 1]?.fileURL;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy.');
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!latestFileURL) return;
    const a = document.createElement('a');
    a.href = latestFileURL;
    a.download = project.currentFile;
    a.target = '_blank';
    a.click();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      // auto-cancel confirm after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await deleteProject(project.slug);
      addHistory({ type: 'deleted', projectName: project.projectName, slug: project.slug });
      toast.success('Project deleted.');
      onDeleted(project.slug);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      console.error('Delete error:', axiosErr?.response?.status, axiosErr?.response?.data);
      const msg = axiosErr?.response?.data?.error
        ?? axiosErr?.response?.data?.message
        ?? `Delete failed (${axiosErr?.response?.status ?? 'no response'})`;
      toast.error(msg);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const typeColors: Record<string, string> = {
    html: 'bg-orange-100 text-orange-600',
    pdf:  'bg-red-100 text-red-600',
    png:  'bg-green-100 text-green-600',
    jpg:  'bg-green-100 text-green-600',
    jpeg: 'bg-green-100 text-green-600',
    zip:  'bg-blue-100 text-blue-600',
  };
  const badgeClass = typeColors[project.fileType?.toLowerCase()] ?? 'bg-gray-100 text-gray-500';

  return (
    <div
      onClick={() => router.push(`/projects/${project.slug}`)}
      className="bg-white border-2 border-purple-100 rounded-2xl flex flex-col justify-between hover:border-primary hover:shadow-purple transition-all duration-200 aspect-square cursor-pointer overflow-hidden"
    >
      {/* ── Top bar: delete (left) + file type badge (right) ── */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          title={confirmDelete ? 'Click again to confirm' : 'Delete project'}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
            confirmDelete
              ? 'bg-red-500 text-white'
              : 'bg-red-50 text-red-400 hover:bg-red-100'
          }`}
        >
          <Trash2 size={12} />
        </button>

        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
          {project.fileType?.toUpperCase()}
        </span>
      </div>

      {/* ── Middle: project info ── */}
      <div className="flex-1 px-3 py-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {project.projectName}
        </h3>
        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Calendar size={11} />
          {formattedDate}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate font-mono">{project.slug}</p>
      </div>

      {/* ── Bottom actions ── */}
      <div className="px-3 pb-3 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
        {/* Open link — full width */}
        <a
          href={shareLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 btn-primary text-xs py-1.5 w-full"
        >
          <ExternalLink size={12} />
          Open Link
        </a>

        {/* Icon-only row: Copy · Download · Update */}
        <div className="flex gap-1.5">
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy link'}
            className="flex items-center justify-center flex-1 py-1.5 rounded-xl border-2 border-purple-100 bg-secondary hover:bg-purple-200 transition-colors"
          >
            {copied ? <CheckCircle size={13} className="text-primary" /> : <Copy size={13} className="text-primary" />}
          </button>

          <button
            onClick={handleDownload}
            disabled={!latestFileURL}
            title="Download"
            className="flex items-center justify-center flex-1 py-1.5 rounded-xl border-2 border-purple-100 bg-secondary hover:bg-purple-200 transition-colors disabled:opacity-40"
          >
            <Download size={13} className="text-primary" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/update?slug=${project.slug}`); }}
            title="Upload update"
            className="flex items-center justify-center flex-1 py-1.5 rounded-xl border-2 border-purple-100 bg-secondary hover:bg-purple-200 transition-colors"
          >
            <RefreshCw size={13} className="text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}
