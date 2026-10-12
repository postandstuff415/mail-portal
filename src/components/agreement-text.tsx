import type { Agreement } from "@/lib/agreement";

// Renders a versioned agreement (used on /agreement and in the sign-up form).
export function AgreementText({ agreement }: { agreement: Agreement }) {
  return (
    <div className="flex flex-col gap-3 leading-7">
      <p>{agreement.intro}</p>
      {agreement.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="mt-2 text-lg font-semibold">{s.heading}</h2>
          {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {s.numbered && (
            <ol className="ml-6 list-decimal">
              {s.numbered.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
          )}
          {s.bullets && (
            <ul className="ml-6 list-disc">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {s.closing?.map((p) => <p key={p}>{p}</p>)}
        </section>
      ))}
      <p className="text-sm opacity-70">Version {agreement.version}</p>
    </div>
  );
}
