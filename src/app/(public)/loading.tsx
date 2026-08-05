/**
 * Squelette de chargement affiché pendant le rendu des Server Components.
 * Les dimensions reprennent celles du contenu réel afin d'éviter un saut de
 * mise en page au moment où il apparaît.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-4 w-32 rounded-full bg-surface" />
      <div className="mt-4 h-10 w-3/4 rounded-lg bg-surface" />
      <div className="mt-3 h-4 w-1/2 rounded-full bg-surface" />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-line p-4">
            <div className="aspect-[16/9] rounded-xl bg-surface" />
            <div className="h-3 w-20 rounded-full bg-surface" />
            <div className="h-4 w-full rounded-full bg-surface" />
            <div className="h-4 w-2/3 rounded-full bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
