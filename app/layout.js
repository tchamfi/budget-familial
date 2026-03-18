export const metadata = {
  title: "Budget Familial 2026 | Tchamfong",
  description: "Suivi budgétaire familial - Lionel & Ophélie Tchamfong",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
