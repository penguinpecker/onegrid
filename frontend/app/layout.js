export const metadata = {
  title: 'OneGrid — 5×5 On-Chain Grid Game on OneChain',
  description: 'Claim cells. Win the pot. 60-second rounds on OneChain.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#030F1C' }}>{children}</body>
    </html>
  );
}
