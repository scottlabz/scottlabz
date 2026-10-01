/*
 * Thank-you page - swaps in form-specific copy.
 *
 * The contact form and the Website Grant form both redirect here. The
 * grant form adds ?form=website-grant (also so GA4 can tell the two
 * apart), and applicants get grant-specific next steps instead of the
 * contact form's "I'll get back to you within one business day".
 * The year is filled in by website-grant.js, which loads after this.
 *
 * External file because the site's CSP only allows a fixed set of
 * inline-script hashes.
 */
(function () {
  var form = new URLSearchParams(window.location.search).get("form");
  if (form !== "website-grant") return;

  var message = document.querySelector("[data-thanks-message]");
  var next = document.querySelector("[data-thanks-next]");
  if (message) {
    message.innerHTML =
      "Your Website Grant application is in. Applications are reviewed " +
      'after March 31, <span data-grant-year></span>, and winners are ' +
      "announced on the Website Grant page by May 1, " +
      '<span data-grant-year></span>.';
  }
  if (next) {
    next.innerHTML =
      'While you wait, browse <a href="/case-studies">recent case studies</a> ' +
      'or reread the <a href="/website-grant#rules">official rules</a>.';
  }
})();
