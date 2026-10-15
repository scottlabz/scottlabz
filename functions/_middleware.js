// 301s for retired pages. These live here, not in a _redirects file,
// because this middleware runs on every route (_routes.json includes /*)
// and Cloudflare Pages does not apply _redirects to requests served by
// Functions. Keys are extensionless paths; the .html form and a trailing
// slash are normalized away before lookup.
const REDIRECTS = {
  // Content cut, Oct 2026: site-maintenance Field Notes
  "/field-notes/100vh-mobile-viewport-bug": "/field-notes/",
  "/field-notes/async-everywhere-would-have-broken-the-footer": "/field-notes/",
  "/field-notes/bimi-sender-verification": "/field-notes/",
  "/field-notes/cache-invalidation-on-deploy": "/field-notes/",
  "/field-notes/cloudflare-7003-diagnosis": "/field-notes/",
  "/field-notes/css-specificity-trap": "/field-notes/",
  "/field-notes/http-response-headers-read-properly": "/field-notes/",
  "/field-notes/the-address-we-took-out-of-the-schema": "/field-notes/schema-drift-problem",
  "/field-notes/the-cleanup-pass": "/field-notes/",
  "/field-notes/the-diff-that-compared-two-broken-pages": "/field-notes/",
  "/field-notes/the-fix-that-dropped-the-score-first": "/field-notes/",
  "/field-notes/the-purge-that-only-ran-manually": "/field-notes/",
  "/field-notes/the-scroll-that-wouldnt-stop": "/field-notes/",
  "/field-notes/the-widget-that-broke-two-ways": "/field-notes/",
  "/field-notes/website-measurement-gaps": "/insights/measurement-before-media-spend",
  "/field-notes/topics/frontend": "/field-notes/",
  "/field-notes/topics/performance": "/field-notes/",
  // Content cut, Oct 2026: Insights
  "/insights/automation": "/field-notes/#insights",
  "/insights/what-automation-shouldnt-touch": "/field-notes/#insights",
  "/insights/redundant-data-entry-missing-integration": "/insights/what-is-analytics-architecture",
  "/insights/local-seo-is-a-data-problem": "/insights/seo-analytics",
  "/insights/why-redundancy-beats-a-single-stack": "/insights/what-is-analytics-architecture",
  "/insights/delete-with-proof": "/field-notes/#insights",
  "/insights/engineering-approach": "/about",
  // Insights hub folded into Field Notes; topic pages retired, Oct 2026
  "/insights": "/field-notes/#insights",
  "/insights/index": "/field-notes/#insights",
  "/field-notes/topics": "/field-notes/",
  "/field-notes/topics/index": "/field-notes/",
  "/field-notes/topics/measurement": "/field-notes/",
  "/field-notes/topics/infra": "/field-notes/",
  // Signals folded into Field Notes, Oct 2026
  "/signals": "/field-notes/",
  "/signals/index": "/field-notes/",
  "/signals/signals.json": "/field-notes/field-notes.json",
  "/signals/three-days-of-silence": "/field-notes/three-days-of-silence",
  "/signals/re-encode-from-the-original": "/field-notes/",
  "/signals/whats-hiding-behind-the-library": "/field-notes/",
  // Hawkeye Fan Shop deep dives moved under the client, Oct 2026
  "/case-studies/advertising-media-buying": "/case-studies/hawkeye-fan-shop/advertising-media-buying",
  "/case-studies/analytics-dashboard-reporting-platform": "/case-studies/hawkeye-fan-shop/analytics-dashboard-reporting",
  "/case-studies/analytics-dashboard-reporting": "/case-studies/hawkeye-fan-shop/analytics-dashboard-reporting",
  "/case-studies/analytics-modernization": "/case-studies/hawkeye-fan-shop/analytics-dashboard-reporting",
  "/case-studies/custom-web-application-development": "/case-studies/hawkeye-fan-shop/custom-web-application-development",
  "/case-studies/data-quality-governance": "/case-studies/hawkeye-fan-shop/data-quality-governance",
  "/case-studies/digital-analytics-implementation": "/case-studies/hawkeye-fan-shop/digital-analytics-implementation",
  "/case-studies/digital-experience-optimization": "/case-studies/hawkeye-fan-shop/digital-experience-optimization",
  "/case-studies/digital-infrastructure-modernization": "/case-studies/hawkeye-fan-shop/custom-web-application-development",
  "/case-studies/digital-measurement-strategy": "/case-studies/hawkeye-fan-shop/digital-analytics-implementation",
  "/case-studies/website-performance-optimization": "/case-studies/hawkeye-fan-shop/website-performance-optimization",
  "/case-studies/website-security-performance-engineering": "/case-studies/hawkeye-fan-shop/website-performance-optimization",
  // Hawkeye Fan Shop deep dives merged 12 to 7, Oct 2026
  "/case-studies/hawkeye-fan-shop/digital-measurement-strategy": "/case-studies/hawkeye-fan-shop/digital-analytics-implementation",
  "/case-studies/hawkeye-fan-shop/analytics-modernization": "/case-studies/hawkeye-fan-shop/analytics-dashboard-reporting",
  "/case-studies/hawkeye-fan-shop/analytics-dashboard-reporting-platform": "/case-studies/hawkeye-fan-shop/analytics-dashboard-reporting",
  "/case-studies/hawkeye-fan-shop/digital-infrastructure-modernization": "/case-studies/hawkeye-fan-shop/custom-web-application-development",
  "/case-studies/hawkeye-fan-shop/website-security-performance-engineering": "/case-studies/hawkeye-fan-shop/website-performance-optimization",
};

function redirectFor(url) {
  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.endsWith(".html")) path = path.slice(0, -5);
  const target = REDIRECTS[path];
  return target ? Response.redirect(new URL(target, url.origin).toString(), 301) : null;
}

export async function onRequest(context) {
  const redirect = redirectFor(new URL(context.request.url));
  if (redirect) return redirect;

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
