export async function onRequest(context) {
  const response = await context.next();

  const type = response.headers.get("content-type") || "";
  const accepts =
    context.request.cf?.clientAcceptEncoding ??
    context.request.headers.get("accept-encoding") ??
    "";

  if (
    !type.includes("text/html") ||
    !response.body ||
    response.headers.has("content-encoding") ||
    !/\bgzip\b/i.test(accepts)
  ) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("content-encoding", "gzip");
  headers.delete("content-length");
  headers.append("vary", "Accept-Encoding");

  return new Response(response.body.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    statusText: response.statusText,
    headers,
    encodeBody: "manual",
  });
}
