/** Minimal Deno globals for Supabase Edge Functions (IDE type-checking). */
declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };

  function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}
