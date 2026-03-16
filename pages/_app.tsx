import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#2F6FED', secondary: '#fff' },
          },
        }}
      />
    </>
  );
}
