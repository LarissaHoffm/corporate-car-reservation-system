import React, { useState } from "react";

export default function CopyableSecret({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="px-2 py-1 rounded bg-slate-800 text-slate-100">{value}</code>
      <button
        onClick={onCopy}
        className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 transition"
        aria-label="Copiar"
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
