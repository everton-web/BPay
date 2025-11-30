import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
// If no key is provided, we'll log emails to console (development mode)
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

interface SendPixNotificationParams {
    email: string;
    studentName: string;
    amount: string;
    dueDate: string;
    pixCode: string;
    paymentLink: string;
}

export async function sendPixNotification(params: SendPixNotificationParams) {
    const { email, studentName, amount, dueDate, pixCode, paymentLink } = params;

    console.log(`[Notification] Preparing to send Pix notification to ${email} for student ${studentName}`);

    if (!resend) {
        console.log(`[Notification] RESEND_API_KEY not found. Mocking email send.`);
        console.log(`[Notification] To: ${email}`);
        console.log(`[Notification] Subject: Mensalidade BPay - ${studentName}`);
        console.log(`[Notification] Body: Olá! Segue o código Pix para pagamento da mensalidade de ${studentName}. Valor: R$ ${amount}. Vencimento: ${dueDate}. Link: ${paymentLink}`);
        return true;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'BPay <financeiro@bpay.com.br>', // Update this with a verified sender
            to: [email],
            subject: `Mensalidade BPay - ${studentName}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá!</h2>
          <p>Segue os dados para pagamento da mensalidade de <strong>${studentName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${amount}</p>
            <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${dueDate}</p>
          </div>

          <h3>Pagamento via Pix</h3>
          <p>Copie e cole o código abaixo no seu aplicativo de banco:</p>
          
          <div style="background-color: #e5e7eb; padding: 15px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${pixCode}
          </div>

          <p style="margin-top: 20px;">
            <a href="${paymentLink}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Pagar com Mercado Pago
            </a>
          </p>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem.
          </p>
        </div>
      `,
        });

        if (error) {
            console.error('[Notification] Error sending email:', error);
            return false;
        }

        console.log(`[Notification] Email sent successfully: ${data?.id}`);
        return true;
    } catch (error) {
        console.error('[Notification] Unexpected error sending email:', error);
        return false;
    }
}
