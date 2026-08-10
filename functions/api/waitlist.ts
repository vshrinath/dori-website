interface Env {
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID?: string;
  ADMIN_NOTIFY_EMAIL?: string;
  RESEND_FROM_EMAIL?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body: any = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!email || !email.includes('@') || !email.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Resend API key configuration missing.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const fromEmail = env.RESEND_FROM_EMAIL || 'noreply@mydori.app';

    // 1. Add contact to Resend Audience if AUDIENCE_ID is configured
    if (env.RESEND_AUDIENCE_ID) {
      await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: name || undefined,
          unsubscribed: false,
        }),
      }).catch((err) => console.warn('Resend contact add warning:', err));
    }

    // 2. Send welcome email to subscriber
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "You're on the Dori Early Access list 🎉",
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:40px auto;padding:24px;color:#1e293b;background-color:#fafafa;border-radius:12px;border:1px solid #e2e8f0;">
  <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:12px">You're on the Dori Early Access list 🎉</h2>
  <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:20px">
    Thank you for requesting early access to <strong>Dori</strong> — your token-conscious, local-first AI executive assistant.
  </p>
  <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:24px">
    We're onboarding founding members in batches to ensure every executive vault experience is seamless. We'll send your invite as soon as a slot opens up.
  </p>
  <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#334155;">
      💡 <strong>Did you know?</strong> Dori runs 100% offline on your device with 0 token waste, keeping your notes, meeting debriefs, and client data completely private on standard Markdown files.
    </p>
  </div>
  <p style="font-size:13px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
    Sent with care by the Dori team • <a href="https://mydori.app" style="color:#6366f1;text-decoration:none;">mydori.app</a>
  </p>
</body>
</html>`,
      }),
    }).catch((err) => console.warn('Welcome email warning:', err));

    // 3. Notify Admin if configured
    const adminEmail = env.ADMIN_NOTIFY_EMAIL || env.RESEND_FROM_EMAIL;
    if (adminEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: adminEmail,
          subject: `🚀 New Early Access Signup: ${email}`,
          html: `<p>New early access waitlist signup from <strong>${email}</strong> via mydori.app homepage.</p>`,
        }),
      }).catch((err) => console.warn('Admin notify warning:', err));
    }

    return new Response(
      JSON.stringify({ success: true, message: "You've been added to the early access list!" }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('Waitlist Function Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to process waitlist signup. Please try again.' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
