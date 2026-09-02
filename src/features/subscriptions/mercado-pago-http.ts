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
  if (!response.ok) throw new Error(`mercado_pago_request_failed:${response.status}`);
  return response.json() as Promise<T>;
}
