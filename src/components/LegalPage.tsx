import Link from 'next/link';

export const LLC = 'Industrial Molecular and Quantum Solutions LLC (name TBD — formation pending, California)';
export const CONTACT = 'jgallagher10@gmail.com';

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 text-gray-800">
      <div className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        DRAFT – needs lawyer review. Not yet in effect. Placeholders in [brackets].
      </div>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: [DATE] · Operated by {LLC}</p>
      <div className="space-y-4 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
      <p className="mt-10 text-sm">
        Questions: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> ·{' '}
        <Link className="underline" href="/privacy">Privacy</Link> ·{' '}
        <Link className="underline" href="/terms">Terms</Link> ·{' '}
        <Link className="underline" href="/refunds">Refunds</Link> ·{' '}
        <Link className="underline" href="/">Home</Link>
      </p>
    </main>
  );
}
