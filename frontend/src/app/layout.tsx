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
      <ClerkProvider 
        publishableKey={publishableKey}
        appearance={{
          variables: {
            colorPrimary: "#9333ea", // purple-600
            colorBackground: "#ffffff",
            colorText: "#1e293b", // slate-800
            colorInputBackground: "#ffffff",
            colorInputText: "#1e293b",
            colorBorder: "#cbd5e1", // slate-300
          },
          elements: {
            card: "bg-white border border-slate-200 shadow-xl rounded-3xl",
            headerTitle: "text-slate-800 font-bold",
            headerSubtitle: "text-slate-500",
            socialButtonsIconButton: "border-slate-200 hover:bg-slate-50 text-slate-700",
            formFieldLabel: "text-slate-500 font-bold uppercase text-[10px]",
            formButtonPrimary: "bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl h-11 border-0",
            footerActionText: "text-slate-500",
            footerActionLink: "text-purple-600 hover:text-purple-500 font-bold",
          }
        }}
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
