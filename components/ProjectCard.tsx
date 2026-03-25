import { memo, useState } from 'react';
import { useRouter } from 'next/router';
import { ExternalLink, Download, RefreshCw, Calendar, Copy, CheckCircle, Trash2, Lock, Globe, Pencil, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteProject, setProjectVisibility, renameProject, rotateEditCode } from '@/services/api';
import { addHistory } from '@/lib/history';
import { getApiError } from '@/lib/errors';
import type { Project } from '@/types';

const typeColors: Record<string, { bg: string; text: string }> = {
  html: { bg: 'bg-orange-100', text: 'text-orange-600' },
  pdf:  { bg: 'bg-red-100',    text: 'text-red-500' },
  md:   { bg: 'bg-blue-100',   text: 'text-blue-600' },
  png:  { bg: 'bg-emerald-100',text: 'text-emerald-600' },
  jpg:  { bg: 'bg-emerald-100',text: 'text-emerald-600' },
  jpeg: { bg: 'bg-emerald-100',text: 'text-emerald-600' },
  zip:  { bg: 'bg-sky-100',    text: 'text-sky-600' },
  pptx: { bg: 'bg-amber-100',  text: 'text-amber-600' },
};

interface ProjectCardProps {
  project: Project;
  onDeleted: (slug: string) => void;
  onVisibilityChanged?: (slug: string, visibility: 'personal' | 'public') => void;
  onRenamed?: (slug: string, projectName: string) => void;
  onEditCodeChanged?: (slug: string, editCode: string) => void;
  isPublicView?: boolean;
  currentUserId?: string;
}

function ProjectCard({ project, onDeleted, onVisibilityChanged, onRenamed, onEditCodeChanged, isPublicView = false, currentUserId = '' }: ProjectCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [visibility, setVisibilityState] = useState<'personal' | 'public'>(project.visibility ?? 'personal');
  const [editCodeDisplay, setEditCodeDisplay] = useState(project.editCode ?? '');
  const [displayName, setDisplayName] = useState(project.projectName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(project.projectName);

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = visibility;
    const next = visibility === 'personal' ? 'public' : 'personal' as const;
    setVisibilityState(next);
    try {
      const updated = await setProjectVisibility(project.slug, next);
      const confirmed = updated.visibility ?? next;
      setVisibilityState(confirmed);
      onVisibilityChanged?.(project.slug, confirmed);
      toast.success(confirmed === 'public' ? 'Set to Public' : 'Set to Personal');
    } catch (err: unknown) {
      setVisibilityState(prev);
      const { status, message } = getApiError(err);
      toast.error(message ?? `Could not update visibility (${status ?? 'no response'}).`);
    }
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(displayName);
    setIsRenaming(true);
  };

  const handleRenameSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) { setIsRenaming(false); return; }
    setIsRenaming(false);
    const prev = displayName;
    setDisplayName(trimmed);
    try {
      const updated = await renameProject(project.slug, trimmed);
      const confirmed = updated.projectName ?? trimmed;
      setDisplayName(confirmed);
      onRenamed?.(project.slug, confirmed);
      toast.success('Project renamed!');
    } catch (err: unknown) {
      setDisplayName(prev);
      const { message } = getApiError(err);
      toast.error(message ?? 'Could not rename project.');
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleRenameSubmit(); }
    if (e.key === 'Escape') { setIsRenaming(false); }
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

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editCodeDisplay) return;
    try {
      await navigator.clipboard.writeText(editCodeDisplay);
      setCodeCopied(true);
      toast.success('Edit code copied!');
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error('Could not copy.');
    }
  };

  const handleRotateCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rotating) return;
    setRotating(true);
    try {
      const updated = await rotateEditCode(project.slug);
      const newCode = updated.editCode ?? '';
      setEditCodeDisplay(newCode);
      onEditCodeChanged?.(project.slug, newCode);
      toast.success('Edit code rotated — old code is now invalid.');
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(message ?? 'Could not rotate edit code.');
    } finally {
      setRotating(false);
    }
  };

  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${project.ownerId}/${project.slug}/download`;
  const isHtml = project.fileType?.toLowerCase() === 'html';

  const handleDownloadHtmlAsPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to save as PDF.'); return; }
    try {
      const res = await fetch(downloadUrl);
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      // onload fires after resources finish; fallback timeout handles edge cases
      win.onload = () => win.print();
      setTimeout(() => { if (!win.closed) win.print(); }, 2000);
    } catch {
      try { win.close(); } catch {}
      toast.error('Could not load file for PDF export.');
    }
  };

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
      const { status, message } = getApiError(err);
      toast.error(message ?? `Delete failed (${status ?? 'no response'})`);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const fileKey = project.fileType?.toLowerCase();
  const badge = typeColors[fileKey] ?? { bg: 'bg-gray-100', text: 'text-gray-500' };

  const isOwnProject = isPublicView && !!currentUserId && project.ownerId === currentUserId;

  return (
    <div
      onClick={() => {
        const editParam = !isPublicView && project.editCode && project.visibility === 'public' ? `&editCode=${project.editCode}` : '';
        const nameParam = `&name=${encodeURIComponent(project.projectName)}`;
        router.push(`/projects/${project.slug}?owner=${project.ownerId}${nameParam}${editParam}`);
      }}
      className={`rounded-2xl flex flex-col justify-between aspect-square cursor-pointer overflow-hidden li-project-card ${isOwnProject ? 'li-project-card-own' : ''}`}
      style={{ backgroundColor: isOwnProject ? '#faf5ff' : '#ffffff' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          title={confirmDelete ? 'Click again to confirm' : 'Delete project'}
          aria-label={confirmDelete ? 'Confirm delete' : 'Delete project'}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
            confirmDelete
              ? 'bg-red-500 text-white'
              : 'bg-red-50 text-red-400 hover:bg-red-100'
          }`}
        >
          <Trash2 size={12} />
        </button>

        <div className="flex items-center gap-1.5">
          {isOwnProject && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-600">
              Yours
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
            {project.fileType?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Middle: project info */}
      <div className="flex-1 px-3 py-2">
        <div className="group flex items-start gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          {isRenaming ? (
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              autoFocus
              maxLength={80}
              className="text-sm font-semibold text-gray-800 bg-violet-50 border border-primary rounded-lg px-1.5 py-0.5 w-full outline-none"
            />
          ) : (
            <>
              <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-1 flex-1 min-w-0" title={displayName}>
                {displayName}
              </h3>
              <button
                onClick={handleStartRename}
                title="Rename project"
                aria-label="Rename project"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 text-gray-300 hover:text-primary mt-0.5"
              >
                <Pencil size={10} />
              </button>
            </>
          )}
        </div>
        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Calendar size={11} />
          {formattedDate}
        </p>
        {/* Attribution — shown in public project listings */}
        {isPublicView && project.ownerName && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {project.lastUpdatedByName && project.lastUpdatedByName !== project.ownerName
              ? `Updated by ${project.lastUpdatedByName}`
              : `by ${project.ownerName}`}
          </p>
        )}

        {/* Visibility toggle + edit code on the same row */}
        {!isPublicView && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleToggleVisibility}
              title={visibility === 'personal' ? 'Personal — click to make Public' : 'Public — click to make Personal'}
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors flex-shrink-0 ${
                visibility === 'public'
                  ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {visibility === 'public' ? <Globe size={9} /> : <Lock size={9} />}
              {visibility === 'public' ? 'Public' : 'Personal'}
            </button>
            {editCodeDisplay && visibility === 'public' && (
              <>
                <span className="text-[10px] font-mono tracking-widest text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                  {editCodeDisplay}
                </span>
                <button onClick={handleCopyCode} title="Copy edit code" aria-label="Copy edit code" className="text-gray-300 hover:text-primary transition-colors flex-shrink-0">
                  {codeCopied ? <CheckCircle size={9} className="text-primary" /> : <Copy size={9} />}
                </button>
                <button onClick={handleRotateCode} title="Rotate code (invalidates old)" aria-label="Rotate edit code" className="text-gray-300 hover:text-amber-500 transition-colors flex-shrink-0">
                  <RefreshCw size={9} className={rotating ? 'animate-spin' : ''} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-3 pb-3 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
        {isPublicView ? (
          /* Public directory — just copy + open, no owner actions */
          <div className="flex gap-1.5">
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy link'}
              aria-label={copied ? 'Copied!' : 'Copy link'}
              className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {copied
                ? <CheckCircle size={13} className="text-primary" />
                : <Copy size={13} className="text-gray-400" />
              }
            </button>
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open link in new tab"
              className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ExternalLink size={13} className="text-gray-400" />
            </a>
          </div>
        ) : (
          /* Owner's own card — full actions */
          <>
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
                aria-label={copied ? 'Copied!' : 'Copy link'}
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
                title={`Download ${project.fileType?.toUpperCase() ?? 'file'}`}
                aria-label={`Download ${project.fileType?.toUpperCase() ?? 'file'}`}
                className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <Download size={13} className="text-gray-400" />
              </a>
              {isHtml && (
                <button
                  onClick={handleDownloadHtmlAsPdf}
                  title="Save as PDF"
                  aria-label="Save as PDF"
                  className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <FileText size={13} className="text-gray-400" />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/update?slug=${project.slug}&owner=${project.ownerId}`); }}
                title="Upload update"
                aria-label="Upload new version"
                className="flex items-center justify-center flex-1 py-1.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw size={13} className="text-gray-400" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(ProjectCard);
