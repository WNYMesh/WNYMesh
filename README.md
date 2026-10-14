# wnymesh.org

The website for **WNYMesh Inc.**, a Western New York community emergency network.

The technical home of our MeshCore network is a separate site, [wnymeshcore.org](https://wnymeshcore.org), kept in its own repository.

## Editing the site (no coding needed)

1. Create a free GitHub account if you don't have one, and ask the President to add you to this repository.
2. Go to **https://app.pagescms.org**, sign in with GitHub, and open this repository.
3. You can edit:
   - **Events**: add, change, or hide events.
   - **Page text**: the About and Be Ready pages.
   - **Site settings**: tagline, contact email, mailing address, board list.
4. Save. Netlify rebuilds and publishes the site in about a minute.

Before showing a big change to the public, you can save it to a separate branch. Netlify creates a preview link for review.

## Where things live

| What | File |
| --- | --- |
| Contact email, address, tagline, board list | `src/data/site.json` |
| About and Be Ready page text | `src/content/pages/*.md` |
| Events | `src/content/events/*.md` |
| Home, Network, Get Involved, Contact, Transparency pages | `src/pages/*.astro` |
| Downloadable documents (bylaws, etc.) | `public/documents/` |
| Colors and fonts | `src/styles/global.css` |

## Forms

The newsletter, Get Involved, and Contact forms use **Netlify Forms**. Submissions appear in the Netlify dashboard under **Forms**. To have them emailed, go to **Site configuration → Notifications → Form submission notifications** and add an email notification.

## Developers

Requires Node 22.

```sh
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # production build into dist/
```

Netlify settings are in `netlify.toml` (build command `npm run build`, publish directory `dist`).

## Planned later

- Donations and paid event registration, once 501(c)(3) status is approved, the New York CHAR410 registration is filed, and the corporate bank account is open. All financial transactions will run through this site.
- Real photos, full board roster and bios.
