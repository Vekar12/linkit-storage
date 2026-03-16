import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = {
  'text/html': ['.html'],
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/zip': ['.zip'],
};

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
}

export default function FileDropzone({ file, onFileSelect }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: { errors: { code: string }[] }[]) => {
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        if (code === 'file-too-large') {
          toast.error('File too large. Maximum size is 15 MB.');
        } else if (code === 'file-invalid-type') {
          toast.error('Invalid file type. Allowed: .html .pdf .png .jpg .zip');
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
          ? 'border-primary bg-secondary'
          : file
          ? 'border-green-400 bg-green-50'
          : 'border-gray-300 bg-white hover:border-primary hover:bg-secondary'
        }
      `}
    >
      <input {...getInputProps()} />

      {file ? (
        <div className="flex flex-col items-center gap-3">
          <FileCheck size={40} className="text-green-500" />
          <p className="font-medium text-gray-800">{file.name}</p>
          <p className="text-sm text-gray-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB — click or drag to replace
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <UploadCloud
            size={40}
            className={isDragActive ? 'text-primary' : 'text-gray-400'}
          />
          <p className="font-medium text-gray-700">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-400">or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">
            Supported: .html .pdf .png .jpg .zip — Max 15 MB
          </p>
        </div>
      )}
    </div>
  );
}
