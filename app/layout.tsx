import React from 'react';

export const metadata = {
  title: 'Kroma Studio',
  description: 'The AI Director Suite. Script, cast, and produce cinematic scenes with Gemini Veo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body { font-family: 'Inter', sans-serif; }
          /* Custom scrollbar for webkit */
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: #f4f4f5; }
          ::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
        `}</style>
      </head>
      <body className="bg-zinc-50 text-zinc-900 antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}