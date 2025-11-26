import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn('Warning: MERCADOPAGO_ACCESS_TOKEN not set. Payment features will fail.');
}

// Initialize Mercado Pago SDK
export const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 5000 }
});

export const preferenceClient = new Preference(client);
export const paymentClient = new Payment(client);

export interface CreatePreferenceParams {
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  externalReference: string;
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  autoReturn?: 'approved' | 'all';
  notificationUrl?: string;
  payer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export async function createPaymentPreference(params: CreatePreferenceParams) {
  try {
    // Construimos el body asegurándonos de no enviar undefined en campos críticos
    const preferenceBody: any = {
      items: [
        {
          id: params.externalReference,
          title: params.title,
          description: params.description,
          quantity: params.quantity,
          unit_price: params.unitPrice,
          currency_id: params.currency,
        }
      ],
      back_urls: {
        success: params.backUrls.success,
        failure: params.backUrls.failure,
        pending: params.backUrls.pending,
      },
      external_reference: params.externalReference,
      statement_descriptor: 'TOBUGO',
    };

    // Solo agregamos auto_return si está definido (para evitar error en localhost)
    if (params.autoReturn) {
      preferenceBody.auto_return = params.autoReturn;
    }

    // Solo agregamos notification_url si está definido (para evitar error en localhost)
    if (params.notificationUrl) {
      preferenceBody.notification_url = params.notificationUrl;
    }

    // Mapeo de Payer
    if (params.payer) {
      preferenceBody.payer = {
        email: params.payer.email,
        name: params.payer.firstName,
        surname: params.payer.lastName
      };
    }

    console.log("Enviando preferencia a Mercado Pago:", JSON.stringify(preferenceBody, null, 2));

    const preference = await preferenceClient.create({ body: preferenceBody });

    return {
      id: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    };
  } catch (error: any) {
    console.error('Mercado Pago preference creation error:', error);
    throw new Error(`Failed to create payment preference: ${error.message}`);
  }
}

export async function getPaymentInfo(paymentId: string) {
  try {
    const payment = await paymentClient.get({ id: paymentId });
    return payment;
  } catch (error: any) {
    console.error('Mercado Pago payment info error:', error);
    throw new Error(`Failed to get payment info: ${error.message}`);
  }
}