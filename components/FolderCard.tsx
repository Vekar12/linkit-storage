import { FolderOpen } from 'lucide-react';

interface FolderCardProps {
  name: string;
  projectCount: number;
  onClick: () => void;
}

export default function FolderCard({ name, projectCount, onClick }: FolderCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-violet-50 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-violet-100 transition-colors"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mb-3">
        <FolderOpen size={22} className="text-violet-500" />
      </div>
      <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-1 px-3 text-center">
        {name}
      </h3>
      <span className="mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-violet-200 text-violet-700">
        {projectCount} {projectCount === 1 ? 'project' : 'projects'}
      </span>
    </div>
  );
}
