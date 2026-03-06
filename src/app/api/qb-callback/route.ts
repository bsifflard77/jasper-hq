import { NextRequest, NextResponse } from 'next/server';

const QB_CLIENT_ID = process.env.QB_CLIENT_ID!;
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET!;
const REDIRECT_URI = 'https://jasper-hq.vercel.app/api/qb-callback';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(renderHTML('❌ Authorization Failed', `<p>Error: ${error}</p>`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code || !realmId) {
    return new NextResponse(renderHTML('❌ Missing Parameters', '<p>No authorization code or realmId received.</p>'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // Exchange code for tokens
    const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new NextResponse(
        renderHTML('❌ Token Exchange Failed', `<p>${tokenData.error}: ${tokenData.error_description || 'Unknown error'}</p>`),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Return success page with hidden token data for Jasper to retrieve
    // Tokens are shown only as a short confirmation — Jasper will save them via Discord callback
    const tokenPayload = JSON.stringify({
      realm_id: realmId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
      authorized_at: new Date().toISOString(),
    });

    // Base64 encode to keep it compact
    const encoded = Buffer.from(tokenPayload).toString('base64');

    return new NextResponse(
      renderHTML('✅ QuickBooks Connected!',
        `<p>Realm ID: <strong>${realmId}</strong></p>
         <p style="color: green; font-weight: bold;">✅ Tokens received successfully!</p>
         <p>Copy this code and paste it to Jasper in Discord:</p>
         <textarea readonly onclick="this.select()" style="width:100%;height:80px;font-family:monospace;font-size:11px;padding:8px;border:2px solid #2ca01c;border-radius:6px;">QB_TOKEN:${realmId}:${encoded}</textarea>
         <p style="color: #888; font-size: 0.9em;">Then click the auth link again for the next company.</p>`),
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (err: any) {
    return new NextResponse(
      renderHTML('❌ Error', `<p>Something went wrong: ${err.message}</p>`),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function renderHTML(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
           max-width: 600px; margin: 80px auto; padding: 20px; text-align: center; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    p { font-size: 1.1em; color: #555; line-height: 1.6; }
    strong { color: #333; }
    code { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}
