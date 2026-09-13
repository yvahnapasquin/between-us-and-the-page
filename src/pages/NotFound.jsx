export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">

        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          404
        </p>

        <h1 className="font-serif text-4xl text-ink sm:text-5xl">
          This page is missing.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ink-soft sm:text-base">
          The page you are looking for may have been moved, removed,
          or never existed.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

          <a
            href="/"
            className="
              inline-flex
              items-center
              justify-center
              rounded-md
              border
              border-ink
              bg-ink
              px-5
              py-2.5
              font-mono
              text-xs
              uppercase
              tracking-wide
              text-paper
              transition
              hover:opacity-90
            "
          >
            Back to home
          </a>

          <a
            href="/dashboard"
            className="
              inline-flex
              items-center
              justify-center
              rounded-md
              border
              border-ink/30
              bg-paper
              px-5
              py-2.5
              font-mono
              text-xs
              uppercase
              tracking-wide
              text-ink
              transition
              hover:border-ink
            "
          >
            Your library
          </a>

        </div>

      </div>
    </div>
  );
}