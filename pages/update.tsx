import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ArrowLeft, Upload, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FileDropzone from '@/components/FileDropzone';
import { updateProject } from '@/services/api';
import { addHistory } from '@/lib/history';
import { checkAuth } from '@/lib/auth';

export default function UpdatePage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'html'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [htmlCode, setHtmlCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (router.query.slug) setSlug(router.query.slug as string);
  }, [router.query.slug]);

  useEffect(() => {
    if (!checkAuth()) router.replace('/login');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) { toast.error('Please enter the project slug.'); return; }

    let uploadFile = file;

    if (uploadMode === 'html') {
      if (!htmlCode.trim()) { toast.error('Paste some HTML code first.'); return; }
      const blob = new Blob([htmlCode], { type: 'text/html' });
      const safeName = slug.trim().toLowerCase().replace(/\s+/g, '-');
      uploadFile = new File([blob], `${safeName}.html`, { type: 'text/html' });
    } else {
      if (!uploadFile) { toast.error('Please select a file to upload.'); return; }
    }

    setLoading(true);
    try {
      await updateProject(slug.trim(), uploadFile!);
      addHistory({ type: 'updated', projectName: slug.trim(), slug: slug.trim() });
      setSuccess(true);
      toast.success('Project updated!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = status === 404
        ? 'No project found with that slug.'
        : ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed. Please try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20">
          <div className="w-full max-w-lg text-center">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-purple">
              <CheckCircle size={36} className="text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Project updated successfully!
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              The same share link now serves your new file.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary px-8 py-3">
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <div className="card shadow-purple">
          <h1 className="text-lg font-bold text-gray-900 mb-5">Update Existing Project</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Slug */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Slug</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. my-resume"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1.5">Find this on your project card in the dashboard.</p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-background rounded-xl p-1 border border-purple-100">
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

            {/* Input area */}
            {uploadMode === 'file' ? (
              <FileDropzone file={file} onFileSelect={setFile} />
            ) : (
              <textarea
                className="input font-mono text-xs resize-none"
                rows={12}
                placeholder={'Paste your updated HTML code here…\n\n<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>'}
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                spellCheck={false}
              />
            )}

            <button
              type="submit"
              disabled={loading || (uploadMode === 'html' && !htmlCode.trim())}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? 'Updating…' : 'Upload New Version'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
