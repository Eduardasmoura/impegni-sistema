import { HelpNav } from "./_components/help-nav";

export default function SuporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <HelpNav />
      {children}
    </div>
  );
}
