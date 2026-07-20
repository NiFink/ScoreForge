import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScoreForge",
  description: "Mobile-friendly score tracking for board and card games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // Setzt das Theme synchron vor dem ersten Paint, damit im Light
          // Mode kein dunkler Flash beim Laden auftritt.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("scoreforge:theme");if(t==="light"){document.documentElement.dataset.theme="light";}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex flex-col min-h-full">
        {children}
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
