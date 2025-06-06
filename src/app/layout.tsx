
import type {Metadata} from 'next';
// Temporarily remove GeistSans and GeistMono to isolate the font loading issue.
// import { GeistSans, GeistMono, Roboto, Open_Sans, Lato, Montserrat } from 'next/font/google';
import { Roboto, Open_Sans, Lato, Montserrat } from 'next/font/google';
import './globals.css';

// const geistSans = GeistSans({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });

// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['400', '700'],
  subsets: ['latin'],
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  weight: ['400', '700'],
  subsets: ['latin'],
});

const lato = Lato({
  variable: '--font-lato',
  weight: ['400', '700'],
  subsets: ['latin'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  weight: ['400', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Firebase Studio App',
  description: 'Generated by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${openSans.variable} ${lato.variable} ${montserrat.variable} antialiased`}>
        {/* Removed geistSans.variable and geistMono.variable */}
        {children}
      </body>
    </html>
  );
}
