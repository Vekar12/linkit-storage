import { memo, useState } from 'react';
import { useRouter } from 'next/router';
import { ExternalLink, Download, RefreshCw, Calendar, Copy, CheckCircle, Trash2, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteProject, setProjectVisibility } from '@/services/api';
import { addHistory } from '@/lib/history';
import { getVisibility, setVisibility, type Visibility } from '@/lib/visibility';
import type { Project } from '@/types';

const typeColors: Record<string, { bg: string; text: string }> = {
  html: { bg: 'bg-orange-100', text: 'text-orange-600' },
  pdf:  { bg: 'bg-red-100',    text: 'text-red-500' },
  md:   { bg: 'bg-blue-100',   text: 'text-blue-600' },
  png:  { bg: 'bg-emerald-100',text: 'text-emerald-600' },
  jpg:  { bg: 'bg-emerald-100',text: 'text-emerald-600' },
  jpeg: { bg: 'bg-emerald-100',text: 'text-emerald-600' },
  zip:  { bg: 'bg-sky-100',    text: 'text-sky-600' },
  pptx: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

interface ProjectCardProps {
  project: Project;
  onDeleted: (slug: string) => void;
}

function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [visibility, setVisibilityState] = useState<Visibility>(() => getVisibility(project.slug));

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = visibility;
    const next: Visibility = visibility === 'personal' ? 'public' : 'personal';
    setVisibilityState(next);
    setVisibility(project.slug, next);
    try {
      await setProjectVisibility(project.slug, next);
      toast.success(next === 'public' ? 'Set to Public' : 'Set to Personal');
    } catch (err: unknown) {
      setVisibilityState(prev);
      setVisibility(project.slug, prev);
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message;
      toast.error(msg ?? `Could not update visibility (${status ?? 'no response'}).`);
    }
  };

  const shareLink = project.shareLink
    ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${project.ownerId}/${project.slug}`;

  const formattedDate = new Date(project.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

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

  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${project.ownerId}/${project.slug}/download`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
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
      const msg = axiosErr?.response?.data?.error
        ?? axiosErr?.response?.data?.message
        ?? `Delete failed (${axiosErr?.response?.status ?? 'no response'})`;
      toast.error(msg);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const fileKey = project.fileType?.toLowerCase();
  const badge = typeColors[fileKey] ?? { bg: 'bg-gray-100', text: 'text-gray-500' };

  return (
    <div
      onClick={() => router.push(`/projects/${project.slug}?owner=${project.ownerId}`)}
      className="bg-white rounded-2xl flex flex-col justify-between aspect-square cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(124,58,237,0.12), 0 0 0 1px rgba(124,58,237,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)';
      }}
    >
      {/* Top bar */}
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

        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
          {project.fileType?.toUpperCase()}
        </span>
      </div>

      {/* Middle: project info */}
      <div className="flex-1 px-3 py-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
          {project.projectName}
        </h3>
        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Calendar size={11} />
          {formattedDate}
        </p>
        <p className="text-xs text-gray-300 mt-0.5 truncate font-mono">{project.slug}</p>
        <button
          onClick={handleToggleVisibility}
          title={visibility === 'personal' ? 'Personal — click to make Public' : 'Public — click to make Personal'}
          className={`mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
            visibility === 'public'
              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          {visibility === 'public' ? <Globe size={9} /> : <Lock size={9} />}
          {visibility === 'public' ? 'Public' : 'Personal'}
        </button>
      </div>

      {/* Bottom actions */}
      <div className="px-3 pb-3 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={shareLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 li-btn-primary text-xs py-1.5 w-full rounded-xl"
        >
          <ExternalLink size={12} />
          Open Link
        </a>

        <div className="flex gap-1.5">
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy link'}
            className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
          >
            {copied
              ? <CheckCircle size={13} className="text-primary" />
              : <Copy size={13} className="text-gray-400" />
            }
          </button>

          <a
            href={downloadUrl}
            download
            onClick={(e) => e.stopPropagation()}
            title="Download"
            className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <Download size={13} className="text-gray-400" />
          </a>

          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/update?slug=${project.slug}&owner=${project.ownerId}`); }}
            title="Upload update"
            className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={13} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProjectCard);
