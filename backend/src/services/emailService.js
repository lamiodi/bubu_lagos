import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@bubulagos.com';
const STORE_NAME = process.env.STORE_NAME || 'Bubu Lagos';

// Never let an email provider outage hang a customer request. Any Resend
// call that takes longer than EMAIL_TIMEOUT_MS is aborted and a clear
// error is thrown. Callers should wrap the call in a try/catch and
// treat the failure as non-fatal (the order is paid either way).
const EMAIL_TIMEOUT_MS = parseInt(process.env.EMAIL_TIMEOUT_MS, 10) || 5_000;

const sendWithTimeout = async (payload) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Resend timed out after ${EMAIL_TIMEOUT_MS}ms`)),
      EMAIL_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([resend.emails.send(payload), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Format shipping address gracefully whether stored as JSON string, object, or plain string.
 */
export const formatAddress = (addr) => {
  if (!addr) return 'Address not provided';
  if (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      if (parsed && typeof parsed === 'object') {
        return formatAddress(parsed);
      }
    } catch {
      return addr;
    }
    return addr;
  }
  if (typeof addr === 'object') {
    const parts = [
      addr.address,
      addr.apartment ? `Apt/Suite: ${addr.apartment}` : null,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.zipCode || addr.postalCode || null
    ].filter(Boolean);
    return parts.join('<br />') || 'Address on file';
  }
  return String(addr);
};

export const sendOrderConfirmationEmail = async (to, order, customerName) => {
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || item.productName || 'Bubu Piece'}${item.variantName ? ` <span style="font-size:12px; color:#666;">(${item.variantName})</span>` : ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(Number(item.price || item.unitPrice) || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const trackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track-order?ref=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(to)}`;
  const formattedAddress = formatAddress(order.shippingAddress || order.shipping_address);
  const totalAmount = Number(order.totalAmount || order.total_amount) || 0;

  const { data, error } = await sendWithTimeout({
    from: FROM_EMAIL,
    to,
    subject: `Order Confirmation #${order.reference} - ${STORE_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000; color: #fff; padding: 20px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">${STORE_NAME}</h1>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 8px;">
            <h2 style="margin-top: 0; color: #333;">Thank you for your order, ${customerName || 'valued customer'}!</h2>

            <p>Your order <strong>#${order.reference}</strong> has been confirmed and is currently being handcrafted and prepared in our Lagos atelier.</p>

            <h3 style="margin-top: 30px; margin-bottom: 15px;">Order Details</h3>

            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #000; color: #fff;">
                  <th style="padding: 10px; text-align: left;">Product</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Total:</td>
                  <td style="padding: 15px 10px; text-align: right; font-weight: bold;">₦${totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <h3 style="margin-top: 30px; margin-bottom: 15px;">Shipping Destination</h3>
            <div style="background: #fff; padding: 15px; border-radius: 5px; line-height: 1.5;">${formattedAddress}</div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackUrl}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Track Your Order</a>
            </div>
            <p style="color: #666; font-size: 14px;">Save this email — you can use your order reference <strong>${order.reference}</strong> and email anytime to track your package live.</p>
            <p style="color: #666; font-size: 14px;">If you have any questions or bespoke requests, please contact our atelier concierge.</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};

export const sendShippingUpdateEmail = async (to, order, trackingInfo, customerName) => {
  const trackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track-order?ref=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(to)}`;
  const trackingNumber = typeof trackingInfo === 'object' ? trackingInfo?.trackingNumber : trackingInfo;
  const shippingCarrier = typeof trackingInfo === 'object' ? trackingInfo?.shippingCarrier : null;

  const { data, error } = await sendWithTimeout({
    from: FROM_EMAIL,
    to,
    subject: `Your Order #${order.reference} Has Shipped! - ${STORE_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Shipping Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000; color: #fff; padding: 20px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">${STORE_NAME}</h1>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 8px;">
            <h2 style="margin-top: 0; color: #333;">Great news, ${customerName || 'valued customer'}!</h2>

            <p>Your order <strong>#${order.reference}</strong> has been dispatched from our atelier and is on its way to you!</p>

            ${trackingNumber ? `
              <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #eee;">
                ${shippingCarrier ? `<p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">Carrier: <strong>${shippingCarrier}</strong></p>` : ''}
                <p style="margin: 0; color: #666; font-size: 13px;">Tracking Number:</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; font-family: monospace; letter-spacing: 1px;">${trackingNumber}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackUrl}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Track Package Live</a>
            </div>
            <p style="color: #666; font-size: 14px;">You can expect your order to arrive soon. If you have any delivery inquiries, please contact our concierge team.</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};

export const sendDeliveryEmail = async (to, order, customerName) => {
  const trackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track-order?ref=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(to)}`;

  const { data, error } = await sendWithTimeout({
    from: FROM_EMAIL,
    to,
    subject: `Delivered: Your Bubu Lagos Order #${order.reference} Has Arrived - ${STORE_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Delivered</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000; color: #fff; padding: 20px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">${STORE_NAME}</h1>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 8px;">
            <h2 style="margin-top: 0; color: #15803d;">Your Order Has Been Delivered!</h2>

            <p>Dear ${customerName || 'Valued Customer'},</p>
            <p>Your handcrafted luxury piece(s) for order <strong>#${order.reference}</strong> have been successfully delivered.</p>

            <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #eee;">
              <p style="margin: 0; font-size: 14px; color: #444;">We hope you love your new silhouette. Share your look and tag us on Instagram <strong>@bubulagos</strong>!</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackUrl}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Order Details</a>
            </div>

            <p style="color: #666; font-size: 14px;">If you have any questions about garment care or styling, please contact our concierge team.</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  });

  if (error) {
    throw new Error(`Failed to send delivery email: ${error.message}`);
  }

  return data;
};

