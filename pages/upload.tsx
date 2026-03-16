import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Copy, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FileDropzone from '@/components/FileDropzone';
import { createProject } from '@/services/api';
import { checkAuth } from '@/lib/auth';

export default function UploadPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!checkAuth()) router.replace('/login');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      toast.error('Please enter a project name.');
      return;
    }
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setLoading(true);
    try {
      const result = await createProject(projectName.trim(), file);
      setShareLink(result.shareLink);
      toast.success('Project created successfully!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Upload failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link.');
    }
  };

  // Success screen
  if (shareLink) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20">
          <div className="w-full max-w-lg text-center">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-purple">
              <CheckCircle size={36} className="text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Your link is ready!</h2>
            <p className="text-gray-500 text-sm mb-8">
              Share this link — it will always point to the latest version.
            </p>

            <div className="card">
              {/* Link box */}
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3 mb-4 border-2 border-purple-100">
                <span className="text-primary text-sm truncate flex-1 text-left font-medium">
                  {shareLink}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 text-primary hover:text-primary-dark transition-colors"
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <button onClick={handleCopy} className="btn-primary w-full mb-3 py-3">
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="btn-secondary w-full"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Upload form
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Purple banner */}
      <div
        className="py-8 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white">Upload New Project</h1>
          <p className="text-purple-200 text-sm mt-1">
            Get a permanent shareable link. Update anytime without changing it.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <div className="card shadow-purple">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Project name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. My Resume"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                maxLength={80}
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                File
              </label>
              <FileDropzone file={file} onFileSelect={setFile} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? 'Uploading…' : 'Upload & Generate Link'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
