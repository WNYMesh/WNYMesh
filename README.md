# wnymesh.org

The website for **WNYMesh Inc.**, a Western New York community emergency network.

The technical home of our MeshCore network is a separate site, [wnymeshcore.org](https://wnymeshcore.org), kept in its own repository.

## Editing the site (no coding needed)

1. Create a free GitHub account if you don't have one, and ask the President to add you to this repository.
2. Go to **https://app.pagescms.org**, sign in with GitHub, and open this repository.
3. You can edit:
   - **Events**: add, change, or hide events. For a paid event, add the cost and a Square payment link.
   - **Page text**: the About and Be Ready pages.
   - **Site settings**: tagline, contact email, mailing address, board list, and tax status.
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

WNYMesh is a 501(c)(3). Payouts go to the corporate bank account.

### Donations (Stripe)

The **Donate** page (`/donate/`) takes one-time and monthly gifts ($5 to $10,000) through **Stripe Checkout**:

1. `netlify/functions/donate.mjs` creates a Checkout session and sends the donor to Stripe's secure payment page.
2. When the payment succeeds, Stripe calls `netlify/functions/stripe-webhook.mjs`. It checks Stripe's signature, then emails the donor a tax receipt through MailerSend: amount, date, reference, our EIN, 501(c)(3) status, and "no goods or services were provided". It also sends a short "New donation" note to `FORM_INBOX`. Monthly donors get a receipt every month.
3. The donor lands on `/donate/thanks/`.

Only payments started from our Donate page get receipts. Other Stripe activity is ignored.

Settings (**Netlify → Site configuration → Environment variables**, Functions scope). Use Stripe **test** keys for Deploy Previews and **live** keys for Production:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` for Deploy Previews, `sk_live_...` for Production). Secret. A restricted key also works if it can write Checkout Sessions. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret (`whsec_...`) of the webhook endpoint below. Test mode and live mode each have their own. Secret. |
| `DONATION_FROM` | Optional. Address receipts come from, e.g. `donations@wnymeshcore.org`. Defaults to `FORM_FROM`. Replies go to `FORM_INBOX`. |

In Stripe (**Developers → Webhooks → Add endpoint**), point the webhook at `https://wnymesh.org/api/stripe-webhook` (live), or at the Deploy Preview's address (test). Send these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`. Then turn off Stripe's own receipt emails (**Settings → Customer emails → Successful payments**) so donors don't get two.

To change or cancel someone's monthly gift, find the subscription in the Stripe dashboard (**Customers**, or **Billing → Subscriptions**).

### Paid event registration (Square)

**Square** handles paid event registration. In the Square Dashboard, create a payment link (**Payments → Payment links → Create link**) for the event, then paste the `https://square.link/u/...` address into the event's **Square payment link** field in Pages CMS. A **Register** button appears on the event. Leave the field empty for free events.

### Tax status

**501(c)(3) effective date** is in Site settings and shows on the Transparency page. To publish the IRS determination letter, add the PDF to `public/documents/`.

## Planned later

- Real photos, full board roster and bios.
