import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PublicNav } from '@/components/public-nav';
import { WhatsAppFloat } from '@/components/whatsapp-float';
import { TelegramFloat } from '@/components/telegram-float';
import { AIChatWidget } from '@/components/ai-chat-widget';
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
  title: "Young Cyber Knights Foundation",
  description:
    "Young Cyber Knights is an initiative aimed at nurturing the next generation of cybersecurity professionals through engaging cybersecurity education, awareness, and hands-on experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <PublicNav>{children}</PublicNav>
        <WhatsAppFloat />
        <TelegramFloat />
        <AIChatWidget />
      </body>
    </html>
  );
}
