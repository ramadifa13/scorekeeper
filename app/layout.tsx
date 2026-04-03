import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ceki Coy - Scorekeeper",
    template: "%s | Ceki Coy",
  },
  description: "Aplikasi pencatat skor Ceki yang cepat, ringan, dan nyaman dipakai di mobile.",
  applicationName: "Ceki Coy",
  keywords: ["ceki", "scorekeeper", "pencatat skor", "kartu"],
  openGraph: {
    title: "Ceki Coy - Scorekeeper",
    description: "Catat skor permainan Ceki dengan cepat dan rapi langsung dari browser.",
    type: "website",
    locale: "id_ID",
    siteName: "Ceki Coy",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
