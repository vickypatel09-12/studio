import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ClientToaster } from '@/components/ClientToaster';
import { LiveDataProvider } from '@/context/LiveDataContext';

export const metadata: Metadata = {
  title: 'Bachat Bank ERP',
  description: 'A basic ERP for small bachatbank',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=1024" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <div className="animation-container">
            <div className="circle x1"></div>
            <div className="circle x2"></div>
            <div className="circle x3"></div>
            <div className="circle x4"></div>
            <div className="circle x5"></div>
        </div>
        <FirebaseClientProvider>
          <LiveDataProvider>
            <FirebaseErrorListener />
            {children}
          </LiveDataProvider>
        </FirebaseClientProvider>
        <ClientToaster />
      </body>
    </html>
  );
}
