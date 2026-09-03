export async function mercadoPagoRequest<T>(input: {
  accessToken: string;
  path: string;
  init?: RequestInit;
  fetcher?: typeof fetch;
}) {
  const response = await (input.fetcher ?? fetch)(
    `https://api.mercadopago.com${input.path}`,
    {
      ...input.init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        ...input.init?.headers,
      },
    },
  );
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      body = undefined;
    }

    const provider = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const causes = Array.isArray(provider.cause)
      ? provider.cause
          .filter((cause): cause is Record<string, unknown> => Boolean(cause && typeof cause === "object"))
          .map((cause) => ({
            code: typeof cause.code === "string" ? cause.code : undefined,
            description: typeof cause.description === "string" && !/[\\w.+-]+@[\\w.-]+|Bearer|token|secret|cpf|card/i.test(cause.description)
              ? cause.description
              : undefined,
          }))
      : undefined;

    console.error("[AULA_SAAS_MP_REQUEST_ERROR]", {
      status: response.status,
      error: typeof provider.error === "string" ? provider.error : undefined,
      message: typeof provider.message === "string" ? provider.message : undefined,
      code: typeof provider.code === "string" ? provider.code : undefined,
      causes,
    });
    throw new Error(`mercado_pago_request_failed:${response.status}`);
  }
  return response.json() as Promise<T>;
}
