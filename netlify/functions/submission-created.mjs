// Netlify runs this automatically each time a form submission passes spam filtering.
// Newsletter signups are forwarded to MailerLite. Netlify keeps its own copy of every
// submission (Netlify dashboard → Forms), so nothing is lost if MailerLite is unreachable.
//
// Settings (Netlify → Site configuration → Environment variables):
//   MAILERLITE_API_KEY   required, mark it as secret
//   MAILERLITE_GROUP_ID  optional, the MailerLite group new subscribers join

const API = 'https://connect.mailerlite.com/api/subscribers';

export const handler = async (event) => {
  const { payload } = JSON.parse(event.body || '{}');
  if (payload?.form_name !== 'newsletter') return { statusCode: 200, body: 'Not a newsletter signup' };

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error('MAILERLITE_API_KEY is not set; signup kept in Netlify Forms only.');
    return { statusCode: 200, body: 'MailerLite not configured' };
  }

  const data = payload.data || {};
  const email = String(data.email || '').trim();
  if (!email) return { statusCode: 200, body: 'No email' };

  const fields = {};
  const name = String(data.name || '').trim();
  const town = String(data.town || '').trim();
  if (name) fields.name = name.slice(0, 100);
  if (town) fields.city = town.slice(0, 100);

  const body = { email, fields };
  const groupId = process.env.MAILERLITE_GROUP_ID?.trim();
  if (groupId) body.groups = [groupId];

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Logged in Netlify → Logs → Functions. Never log the key or the subscriber's details.
    console.error(`MailerLite returned ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return { statusCode: 502, body: 'MailerLite error' };
  }
  return { statusCode: 200, body: 'Subscribed' };
};
