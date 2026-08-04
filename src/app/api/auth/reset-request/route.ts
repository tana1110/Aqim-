import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { validEmail } from "@/lib/auth";

// Password reset, step 1: create a one-hour token and email a reset link.
// Email delivery uses Resend (RESEND_API_KEY); without a key configured the
// endpoint reports that recovery email isn't available yet.
// Always answers 200 for valid-looking emails — never reveals which emails
// have accounts.
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!validEmail(email)) {
    return Response.json({ error: "bad_email" }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "mail_not_configured" }, { status: 501 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.passwordHash) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const link = `https://aqim-eight.vercel.app/account?reset=${token}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aqim <onboarding@resend.dev>",
        to: [email],
        subject: "إعادة تعيين كلمة المرور — أقِم الصلاة",
        html: `<div dir="rtl"><p>لإعادة تعيين كلمة مرورك في «أقِم الصلاة» اضغط الرابط التالي (صالح لساعة واحدة):</p><p><a href="${link}">${link}</a></p><p>إن لم تطلب ذلك فتجاهل هذه الرسالة.</p></div>`,
      }),
    }).catch(() => {});
  }
  return Response.json({ ok: true });
}
