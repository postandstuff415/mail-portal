// Printable intake card: name, mailbox number, QR code, and (only right after
// sign-up or a reset) the PIN. Prints black on white to save ink.
export function IntakeCard({
  name,
  pmbNumber,
  qrDataUrl,
  pin,
}: {
  name: string;
  pmbNumber: string;
  qrDataUrl: string;
  pin?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-5 text-black print:max-w-none print:rounded-none">
      <p className="text-center text-xl font-extrabold">POST &amp; STUFF</p>
      <p className="text-center text-sm">4051 Foothill Blvd, Oakland, CA 94604 · (415) 725-1603</p>
      <div className="mt-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for mailbox ${pmbNumber}`} width={140} height={140} />
        <div>
          <p className="text-lg font-bold">{name}</p>
          <p className="text-sm">Mailbox number</p>
          <p className="font-mono text-3xl font-bold">{pmbNumber}</p>
        </div>
      </div>
      {pin && (
        <div className="mt-4 rounded-lg border-2 border-black p-3 text-center">
          <p className="text-sm">Your PIN (keep it private)</p>
          <p className="font-mono text-3xl font-bold tracking-widest">{pin}</p>
        </div>
      )}
      <p className="mt-4 text-center text-sm">
        Check your mail at <strong>postandstuff.com</strong> — scan the code to log in.
      </p>
    </div>
  );
}
