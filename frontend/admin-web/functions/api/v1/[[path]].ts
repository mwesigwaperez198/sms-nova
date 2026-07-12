export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = new URL(`https://sms-msku.onrender.com${url.pathname}${url.search}`);

  const proxyHeaders = new Headers(context.request.headers);
  proxyHeaders.delete("CF-Connecting-IP");
  proxyHeaders.delete("CF-IPCountry");
  proxyHeaders.delete("CF-Ray");
  proxyHeaders.delete("CF-Visitor");
  proxyHeaders.delete("CDN-Loop");
  proxyHeaders.delete("X-Forwarded-For");

  const proxyRequest = new Request(target.toString(), {
    method: context.request.method,
    headers: proxyHeaders,
    body: context.request.method !== "GET" && context.request.method !== "HEAD"
      ? context.request.body
      : null,
  });

  const response = await fetch(proxyRequest);
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  return newResponse;
}
