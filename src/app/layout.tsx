import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NavHub",
  description: "导航站",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'auto';
    var d = t === 'auto' ? window.matchMedia('(prefers-color-scheme:dark)').matches : t === 'dark';
    document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
