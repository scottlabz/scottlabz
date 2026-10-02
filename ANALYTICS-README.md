# Click data layer

Every meaningful click on scottlabz.com pushes one named event to `window.dataLayer`. GTM forwards it to GA4 (G-08JHY36N39) through one trigger and one GA4 event tag.

The code lives in `assets/js/gtm.js`, below the GTM loader. Every page that loads GTM also gets click tracking, so new pages are covered automatically.

## Why the logic is on the site, not in GTM

The site's Content Security Policy allows scripts only from `'self'`, five inline-script hashes and a short domain allowlist. It has no `'unsafe-inline'` and no `'unsafe-eval'`. That blocks two GTM features:

- **Custom HTML tags** are inline scripts. This is why the old back-to-top tag never ran.
- **Custom JavaScript variables** are evaluated with `eval`.

So the click classification runs in the same-origin `gtm.js`. GTM only maps values that are already in the data layer. Data Layer Variables, Custom Event triggers and the GA4 event tag all work under this CSP.

## Events

When a click matches more than one rule, the first match in this table wins.

| Event | Fires on | Notes |
|---|---|---|
| `diagnostic_answer` | Answer buttons in the Diagnostics games | `click_action` is `correct` or `wrong`; `click_context` is the case title |
| `filter_click` | Pills and "Clear filters" in `<scott-filter-bar>` | `click_action` is `select` or `clear`; `click_context` is the category key |
| `faq_toggle` | The `<summary>` of a `<details>` | `click_action` is `open` or `close`; `click_text` is the question |
| `form_submit_click` | Submit buttons inside a form | A submit attempt. The conversion is the `/thank-you` page view. `click_context` is the form id or `<page_group>_form` |
| `contact_click` | `mailto:` and `tel:` links | `link_type` is `email` or `phone` |
| `file_download` | Links to pdf, zip, docx, xlsx, pptx, csv, txt, vcf, ics | `click_context` is the file name |
| `outbound_click` | Links to another domain | `click_domain` is the destination host |
| `jump_link_click` | Same-page `#anchor` links | `click_context` is the anchor id |
| `nav_click` | Internal links in `<scott-nav>`, including the logo | |
| `footer_click` | Internal links in `<scott-footer>` | External footer links count as `outbound_click` |
| `cta_click` | Internal links styled as buttons, or any link to /contact | |
| `content_click` | Every other internal link | Cards, tiles, links in body text |
| `button_click` | Every other button | Back to top, "Next case", and so on |

Middle-clicks on links (open in a new tab) count too. Right-clicks don't.

## Parameters

Every push carries all twelve keys. A key that doesn't apply is `undefined`, which clears the previous click's value in GTM's data model.

| Parameter | Example | Notes |
|---|---|---|
| `click_text` | `Start a Conversation` | Taken from `data-analytics-text`, then `aria-label`, a card's headline, the text as written (not CSS uppercase), `title`, or image `alt`. Capped at 100 characters |
| `click_url` | `https://scottlabz.com/contact` | Links only. Capped at 100 characters |
| `click_path` | `/contact` | Same-site links only |
| `click_domain` | `linkedin.com` | Links only |
| `link_type` | `internal`, `external`, `email`, `phone`, `download`, `anchor` | Links only |
| `click_section` | `latest_from_the_lab`, `hero`, `nav`, `footer` | Where the click happened, in this order: a `data-analytics-section` override; `nav`, `footer` or `filter_bar` for the shared components; `hero` for page banners; otherwise the nearest section's h1/h2, snake_cased and cut at a word boundary to 40 characters |
| `click_element` | `a`, `button`, `summary` | |
| `click_id` | `backToTop` | The element's id, if it has one |
| `click_action` | `open`, `close`, `select`, `clear`, `correct`, `wrong`, `email`, `phone` | Event-specific |
| `click_context` | `measurement`, `website_grant_form` | Event-specific |
| `destination_group` | `case_study`, `field_note`, `insight`, `service`, `contact` | Internal links only. The content group of the target page |
| `page_group` | `home`, `field_note`, `website_grant` | Content group of the page the click happened on |

Content groups: `home`, `service`, `about`, `contact`, `thank_you`, `website_grant`, `case_studies_hub`, `case_study`, `field_notes_hub`, `field_notes_topic`, `field_note`, `insights_hub`, `insight`, `signals_hub`, `signal`, `diagnostics`, `market`, `legal`, `other`. To add a group, edit `groupFor()` in `gtm.js`.

## Overrides

Add these attributes to an element or any of its ancestors to adjust tracking without touching the script:

- `data-analytics-event="custom_name"` forces the event name. Add the new name to the GTM trigger regex too.
- `data-analytics-text="Label"` forces `click_text`.
- `data-analytics-section="name"` forces `click_section`.
- `data-analytics-ignore` turns off tracking for that element.

## GTM setup

1. **Import the container file.**
   1. Go to Admin, then Import Container.
   2. Choose `scottlabz-gtm-click-events.json`.
   3. Pick your current workspace, choose **Merge**, then **Rename conflicting tags, triggers, and variables**.
   4. Review the preview. It should add 1 tag, 1 trigger and 12 variables, and change nothing else.

   The file creates these items:
   - **12 Data Layer Variables**, named `DLV - click_text` through `DLV - page_group`, all Version 2.
   - **The trigger** `CE - Click Events (data layer)`. It's a Custom Event trigger and uses this event-name regex:
     ```
     ^(nav_click|footer_click|cta_click|content_click|outbound_click|contact_click|file_download|jump_link_click|faq_toggle|filter_click|diagnostic_answer|form_submit_click|button_click)$
     ```
   - **The tag** `GA4 - Event - Click Events (data layer)`, which sends to G-08JHY36N39. Its event name is `{{Event}}`, so the data layer event name passes straight through, and each of the 12 parameters is mapped to its variable.
2. **Test before publishing.**
   1. Open Preview, then click around the site.
   2. Each click should show the event in Tag Assistant, with the GA4 tag fired and the parameters filled in.
   3. In GA4, check Admin, then DebugView.
3. **Publish.**

## GA4 setup

1. **Turn off the overlapping Enhanced Measurement toggles.** Go to Admin, Data streams, the web stream, then Enhanced measurement.
   - **Outbound clicks:** GA4's own `click` event would double count `outbound_click`.
   - **File downloads:** GA4's own `file_download` uses the same event name as ours.
   - Leave page views, scrolls, site search and the other toggles on.
2. **Register the parameters as event-scoped custom dimensions.** Go to Admin, then Custom definitions. Use the parameter name as the dimension name:
   - `click_text`
   - `click_section`
   - `link_type`
   - `click_action`
   - `click_context`
   - `destination_group`
   - `page_group`
   - `click_path`
   - `click_domain`
   - `click_element`
   - Optional: `click_url` and `click_id`. Each custom dimension uses one of the property's 50 event-scoped slots.
3. **Optional:** mark `cta_click` and `contact_click` as key events, alongside the `/thank-you` page view.

Custom dimensions only collect data from the moment they're registered. Register them before publishing the GTM change.

## Adding a new kind of click

1. Add a branch to `classify()` in `gtm.js`, above the generic fallbacks.
2. Add the event name to this file's table.
3. Add it to the GTM trigger regex.
