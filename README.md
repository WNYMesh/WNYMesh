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
| Email list connection (MailerLite) | `netlify/functions/submission-created.mjs` |
| Downloadable documents (bylaws, etc.) | `public/documents/` |
| Colors and fonts | `src/styles/global.css` |

## Forms

The newsletter, Get Involved, and Contact forms use **Netlify Forms**. Every submission is kept in the Netlify dashboard under **Forms**. To have them emailed, go to **Site configuration → Notifications → Form submission notifications** and add an email notification.

### Email list (MailerLite)

Newsletter signups are also sent to **MailerLite**, where we write and send updates. This is done by `netlify/functions/submission-created.mjs`, which Netlify runs after each form submission. It needs these Netlify environment variables (**Site configuration → Environment variables**):

| Name | Value |
| --- | --- |
| `MAILERLITE_API_KEY` | A MailerLite API key (**Integrations → API**). Mark it **Contains secret values**. Never put it in this repository. |
| `MAILERLITE_GROUP_ID` | Optional. The ID of the MailerLite group new subscribers should join (open the group; the number is in the address bar). |

In MailerLite, turn on **Account settings → Subscribe settings → Double opt-in for API and integrations** so each new subscriber gets a confirmation email. If a signup doesn't reach MailerLite, check **Netlify → Logs → Functions**; the signup is still saved in Netlify Forms and can be exported from there.

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
