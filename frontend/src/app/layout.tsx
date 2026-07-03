import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ClientInitializer } from "@/components/layout/ClientInitializer";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalonsFlow | 24/7 AI WhatsApp Receptionist & Operations for Indian Salons",
  description: "Deploy a high-fidelity, autonomous Hinglish AI Receptionist directly on your business WhatsApp. Track live bookings, manage stylist payroll commissions, and automate billing checkout with 0% booking commission.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ClientInitializer />
        {children}
      </body>
    </html>
  );

  if (publishableKey && publishableKey.startsWith("pk_") && !publishableKey.includes("PLACEHOLDER")) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
