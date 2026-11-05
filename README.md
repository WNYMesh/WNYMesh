# wnymesh.org

The website for **WNYMesh Inc.**, a Western New York community emergency network.

The technical home of our MeshCore network is a separate site, [wnymeshcore.org](https://wnymeshcore.org), kept in its own repository.

## Editing the site (no coding needed)

1. Create a free GitHub account if you don't have one, and ask the President to add you to this repository.
2. Go to **https://app.pagescms.org**, sign in with GitHub, and open this repository.
3. You can edit:
   - **Events**: add, change, or hide events. For a paid event, add the cost and a Square payment link.
   - **Page text**: the About and Be Ready pages.
   - **Site settings**: tagline, contact email, mailing address, board list, tax status, and the Give Lively page ID.
4. Save. Netlify rebuilds and publishes the site in about a minute.

Before showing a big change to the public, you can save it to a separate branch. Netlify creates a preview link for review.

## Where things live

| What | File |
| --- | --- |
| Contact email, address, tagline, board list | `src/data/site.json` |
| About and Be Ready page text | `src/content/pages/*.md` |
| Events | `src/content/events/*.md` |
| Home, Network, Get Involved, Contact, Transparency, Donate pages | `src/pages/*.astro` |
| Form handling (MailerLite, MailerSend) | `netlify/functions/`, `netlify/lib/forms.mjs` |
| Downloadable documents (bylaws, etc.) | `public/documents/` |
| Colors and fonts | `src/styles/global.css` |

## Forms

All three forms are handled by small Netlify Functions in `netlify/functions/` (shared code in `netlify/lib/forms.mjs`). Netlify Forms is not used.

| Form | Where | What happens |
| --- | --- | --- |
| Stay in the loop | Home and Events pages | Added to MailerLite, in the Newsletter group. |
| Get Involved | `/get-involved/` | Emailed to the form inbox. Added to MailerLite in the Volunteers group, with their interests. Also added to the Newsletter group if they tick "Also send me the newsletter". |
| Contact | `/contact/` | Emailed to the form inbox. |

Form emails come from MailerSend (MailerLite's sister service for one-off emails). Hit **Reply** to answer the person directly.

### Settings

Set these in **Netlify → Site configuration → Environment variables**. Each must include the **Functions** scope and the deploy contexts you use (Production, and Deploy Previews for testing). Redeploy after changing them.

| Name | Value |
| --- | --- |
| `MAILERLITE_API_KEY` | MailerLite API key (**Integrations → API**). Secret. |
| `MAILERLITE_NEWSLETTER_GROUP_ID` | ID of the MailerLite **Newsletter** group (open the group; the number is in the address bar). |
| `MAILERLITE_VOLUNTEERS_GROUP_ID` | ID of the MailerLite **Volunteers** group. |
| `MAILERSEND_API_KEY` | MailerSend API token (**Integrations → API tokens**, with permission to send email). Secret. |
| `FORM_INBOX` | Where Contact and Get Involved messages are sent, e.g. `airin@wnymeshcore.org`. Change it here when the shared inbox is ready. No code change needed. |
| `FORM_FROM` | Address the form emails come from. Must be on a domain verified in MailerSend, e.g. `website@wnymeshcore.org`. It doesn't need to be a real mailbox. |

In MailerLite:
- Create a text field named **Interests** under **Subscribers → Fields** so volunteers' interests are saved. Without it, volunteers are still added, just without their interests.
- Send newsletters to the **Newsletter** group, not to all subscribers, so volunteers who didn't ask for the newsletter don't get it.
- **Double opt-in for API and integrations** (**Account settings → Subscribe settings**) sends new subscribers a confirmation email.

### When something goes wrong

The visitor sees the problem on the form, and what they typed is kept. Without JavaScript they see `/signup-problem/` or `/form-problem/` instead. The reason is in **Netlify → Logs → Functions** under the form's function (`subscribe`, `get-involved` or `contact`).

## Developers

Requires Node 22.

```sh
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # production build into dist/
```

Netlify settings are in `netlify.toml` (build command `npm run build`, publish directory `dist`).

## Donations and payments

WNYMesh is a 501(c)(3). Money comes in through two services, and both send payouts to the corporate bank account:

- **Give Lively** handles donations on the **Donate** page (`/donate/`). In Pages CMS, open **Site settings** and fill in **Give Lively page ID**: the last part of our Give Lively donation address, `https://secure.givelively.org/donate/<page-id>`. Until it's filled in, the Donate page asks people to give by check. Give Lively emails each donor a tax receipt.
- **Square** handles paid event registration. In the Square Dashboard, create a payment link (**Payments → Payment links → Create link**) for the event, then paste the `https://square.link/u/...` address into the event's **Square payment link** field in Pages CMS. A **Register** button appears on the event. Leave the field empty for free events.

Also fill in **501(c)(3) effective date** from the IRS determination letter so it shows on the Transparency page. To publish the letter itself, add the PDF to `public/documents/`.

## Planned later

- Real photos, full board roster and bios.
