import { MercadoPagoConfig, Payment } from 'mercadopago';

if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.warn("MERCADO_PAGO_ACCESS_TOKEN not found in environment variables");
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
    options: { timeout: 5000 }
});

const payment = new Payment(client);

interface CreatePixPaymentParams {
    amount: number;
    description: string;
    payerEmail: string;
    payerFirstName?: string;
    payerLastName?: string;
    payerIdentification?: {
        type: string;
        number: string;
    };
}

export async function createPixPayment(params: CreatePixPaymentParams) {
    try {
        const body = {
            transaction_amount: params.amount,
            description: params.description,
            payment_method_id: 'pix',
            payer: {
                email: params.payerEmail,
                first_name: params.payerFirstName,
                last_name: params.payerLastName,
                identification: params.payerIdentification
            },
        };

        const response = await payment.create({ body });

        return {
            id: response.id,
            status: response.status,
            qr_code: response.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
        };
    } catch (error) {
        console.error('Error creating Pix payment:', error);
        throw error;
    }
}
