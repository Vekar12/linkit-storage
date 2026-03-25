import { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// Allowed extensions and their display labels
const ALLOWED_EXTENSIONS = ['.html', '.md', '.pdf', '.pptx'];

// macOS reports .pptx as application/zip because it's a ZIP-based format.
// We include both the official MIME type and application/zip so the OS
// file picker doesn't grey them out. A custom validator then ensures
// only the correct extensions actually pass through.
const ACCEPTED_TYPES = {
  'text/html': ['.html'],
  'application/pdf': ['.pdf'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  // macOS / Brave may report .pptx with these MIME types
  'application/zip': ['.pptx'],
  'application/octet-stream': ['.pptx'],
};

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

/** Extension-based validator — runs after the file picker accepts the file. */
function extensionValidator(file: File) {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { code: 'file-invalid-type', message: 'File type not allowed.' };
  }
  return null;
}

interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
}

export default function FileDropzone({ file, onFileSelect }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        if (code === 'file-too-large') {
          toast.error('File too large. Maximum size is 15 MB.');
        } else if (code === 'file-invalid-type') {
          toast.error('Only HTML, Markdown, PDF, and PPTX files are allowed.');
        } else {
          toast.error('Upload failed. Please try again.');
        }
        return;
      }
      if (accepted.length > 0) {
        onFileSelect(accepted[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    validator: extensionValidator,
  });

  return (
    <div
      {...getRootProps()}
      role="button"
      tabIndex={0}
      aria-label={file ? `Selected file: ${file.name}. Click or press Enter to replace.` : 'Upload area. Click or press Enter to browse files, or drag and drop.'}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
        ${isDragActive
          ? 'border-primary bg-violet-50'
          : file
          ? 'border-emerald-400 bg-emerald-50'
          : 'border-gray-200 bg-gray-50 hover:border-primary hover:bg-violet-50/40'
        }
      `}
    >
      <input {...getInputProps()} />

      {file ? (
        <div className="flex flex-col items-center gap-3">
          <FileCheck size={40} className="text-emerald-500" />
          <p className="font-semibold text-gray-800">{file.name}</p>
          <p className="text-sm text-gray-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB — click or drag to replace
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <UploadCloud
            size={40}
            className={isDragActive ? 'text-primary' : 'text-gray-300'}
          />
          <p className="font-semibold text-gray-700">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-400">or click to browse</p>
          <p className="text-xs text-gray-300 mt-1">
            Supported: .html .md .pdf .pptx — Max 15 MB
          </p>
        </div>
      )}
    </div>
  );
}
