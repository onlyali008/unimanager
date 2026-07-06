import nodemailer from "nodemailer";

/**
 * Sends the login verification code. SMTP settings come from .env.local
 * (SMTP_HOST/PORT/USER/PASS, optional SMTP_FROM). SMTP_DEBUG=1 swaps in a
 * transport that just logs the mail to the server console — used for
 * testing the flow without a mail account.
 */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<void> {
  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "semestra@localhost";
  const mail = {
    from,
    to,
    subject: `${code} is your Semestra login code`,
    text: `Your Semestra verification code is ${code}\n\nIt expires in 10 minutes. If you didn't try to log in, someone on your network knows your password — change it (node scripts/set-password.mjs).`,
  };

  if (process.env.SMTP_DEBUG === "1") {
    console.log(`[auth] verification code for ${to}: ${code}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transport.sendMail(mail);
}
