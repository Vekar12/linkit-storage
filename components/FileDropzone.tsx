import { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = {
  'text/html': ['.html'],
  'application/pdf': ['.pdf'],
  'text/markdown': ['.md'],
};

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

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
          toast.error('Only HTML, Markdown, and PDF files are allowed.');
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
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200
        ${isDragActive
          ? 'border-primary bg-dark-raised'
          : file
          ? 'border-green-500 bg-dark-raised'
          : 'border-dark-border bg-dark-raised hover:border-primary'
        }
      `}
    >
      <input {...getInputProps()} />

      {file ? (
        <div className="flex flex-col items-center gap-3">
          <FileCheck size={40} className="text-green-400" />
          <p className="font-medium text-dark-text">{file.name}</p>
          <p className="text-sm text-dark-muted">
            {(file.size / 1024 / 1024).toFixed(2)} MB — click or drag to replace
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <UploadCloud
            size={40}
            className={isDragActive ? 'text-primary' : 'text-dark-muted'}
          />
          <p className="font-medium text-dark-text">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-dark-muted">or click to browse</p>
          <p className="text-xs text-dark-dim mt-1">
            Supported: .html .md .pdf — Max 15 MB
          </p>
        </div>
      )}
    </div>
  );
}
