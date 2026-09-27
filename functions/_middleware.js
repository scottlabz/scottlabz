export async function onRequest(context) {
  const response = await context.next();

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  const cacheControl = headers.get("cache-control") || "";
  if (!/\bno-transform\b/i.test(cacheControl)) {
    headers.set("cache-control", cacheControl ? `${cacheControl}, no-transform` : "no-transform");
  }

  const accepts =
    context.request.cf?.clientAcceptEncoding ??
    context.request.headers.get("accept-encoding") ??
    "";

  const compress =
    response.body &&
    !response.headers.has("content-encoding") &&
    /\bgzip\b/i.test(accepts);

  if (compress) {
    headers.set("content-encoding", "gzip");
    headers.delete("content-length");
    headers.append("vary", "Accept-Encoding");
  }

  return new Response(
    compress ? response.body.pipeThrough(new CompressionStream("gzip")) : response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers,
      encodeBody: compress ? "manual" : "automatic",
    }
  );
}
