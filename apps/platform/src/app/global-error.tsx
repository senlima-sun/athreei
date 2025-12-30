"use client";

/**
 * Global Error Boundary
 *
 * Captures React render errors and reports them to Sentry.
 * This component is rendered when an error occurs anywhere in the App Router.
 */

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* NextError requires statusCode but App Router doesn't expose it, so we pass 0 */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
