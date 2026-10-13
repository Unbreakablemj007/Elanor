"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/icons";
import { t } from "@/lib/strings";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <AlertIcon className="mx-auto mb-3 text-danger" width={32} height={32} />
      <p className="mb-1 font-medium">{t.common.unexpectedError}</p>
      <p className="mb-5 text-sm text-muted">{t.errors.dbUnavailable}</p>
      <button type="button" className="btn-primary w-full" onClick={reset}>
        {t.common.tryAgain}
      </button>
    </div>
  );
}
