import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title:'NovaPay — Payments workspace', description:'NovaPay test-mode payment platform' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
