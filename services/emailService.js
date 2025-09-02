import nodemailer from "nodemailer";
import config from "../config/environment.js";
import logger from "../utils/logger.js";

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    // Initialize email service without blocking the main application
    this.init().catch((error) => {
      logger.error("❌ Email service initialization failed:", error);
      this.isConfigured = false;
    });
  }

  async init() {
    try {
      // Temporarily disable email service to prevent connection errors
      // Uncomment the code below when you have valid email credentials

      /*
      // Check if email configuration is available and not empty
      if (config.EMAIL.HOST && config.EMAIL.USER && config.EMAIL.PASS && 
          config.EMAIL.USER.trim() !== '' && config.EMAIL.PASS.trim() !== '') {
        
        logger.info('📧 Attempting to configure email service...');
        
        this.transporter = nodemailer.createTransport({
          host: config.EMAIL.HOST,
          port: config.EMAIL.PORT || 587,
          secure: config.EMAIL.PORT === 465, // true for 465, false for other ports
          auth: {
            user: config.EMAIL.USER,
            pass: config.EMAIL.PASS,
          },
        });

        // Verify connection
        await this.transporter.verify();
        this.isConfigured = true;
        logger.info('✅ Email service configured successfully');
      } else {
        logger.info('ℹ️ Email service not configured - missing or empty credentials');
        this.isConfigured = false;
      }
      */

      // For now, just disable email service
      logger.info(
        "ℹ️ Email service temporarily disabled - in-app notifications only",
      );
      this.isConfigured = false;
    } catch (error) {
      logger.error("❌ Email service configuration failed:", error);
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.isConfigured || !this.transporter) {
      logger.warn(`📧 Email not sent to ${to} - email service not configured`);
      return { success: false, message: "Email service not configured" };
    }

    try {
      const mailOptions = {
        from: `"${config.EMAIL.FROM_NAME || "Grup Team"}" <${config.EMAIL.USER}>`,
        to,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email sent successfully to ${to}: ${subject}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, "");
  }

  // Email templates
  generateOrderStatusEmail(data) {
    const {
      orderId,
      trackingNumber,
      status,
      message,
      customerName,
      items,
      totalAmount,
    } = data;

    const statusColors = {
      processing: "#3b82f6",
      packaged: "#10b981",
      ready_for_pickup: "#f59e0b",
      out_for_delivery: "#8b5cf6",
      delivered: "#059669",
      cancelled: "#ef4444",
    };

    const color = statusColors[status] || "#6b7280";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 8px 16px; background: ${color}; color: white; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .item:last-child { border-bottom: none; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
            <p>Hello ${customerName},</p>
          </div>
          
          <div class="content">
            <h2>Your order status has been updated</h2>
            <p><span class="status-badge">${status.replace("_", " ")}</span></p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
              <p><strong>Total Amount:</strong> ₦${totalAmount?.toLocaleString()}</p>
              
              ${
                items
                  ? `
                <h4>Items:</h4>
                ${items
                  .map(
                    (item) => `
                  <div class="item">
                    <strong>${item.productName}</strong> - ₦${item.price?.toLocaleString()}
                  </div>
                `,
                  )
                  .join("")}
              `
                  : ""
              }
            </div>
            
            <p><strong>Status Message:</strong> ${message}</p>
            
            <a href="${config.FRONTEND_URL}/track/${trackingNumber}" class="button">Track Your Order</a>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with Grup!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateGroupBuyStatusEmail(data) {
    const {
      productName,
      groupBuyId,
      newStatus,
      oldStatus,
      customerName,
      progressPercentage,
      fulfillmentData,
    } = data;

    const statusMessages = {
      secured: "Your group buy has been secured and is ready for processing!",
      processing: "Your order is now being processed!",
      packaging: "Your order is being packaged for delivery!",
      ready_for_pickup: "Your order is ready for pickup!",
      delivered: "Your order has been delivered!",
      failed:
        "Unfortunately, your group buy has failed. A refund will be processed to your wallet.",
    };

    const message =
      statusMessages[newStatus] ||
      `Your group buy status has been updated to ${newStatus}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Group Buy Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
          .product-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #f093fb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Group Buy Status Update</h1>
            <p>Hello ${customerName},</p>
          </div>
          
          <div class="content">
            <h2>Group Buy Status Changed</h2>
            <p><span class="status-badge">${newStatus.replace("_", " ")}</span></p>
            
            <div class="product-details">
              <h3>Product Details</h3>
              <p><strong>Product:</strong> ${productName}</p>
              <p><strong>Group Buy ID:</strong> ${groupBuyId}</p>
              ${progressPercentage ? `<p><strong>Progress:</strong> ${progressPercentage}%</p>` : ""}
            </div>
            
            <p><strong>Status Message:</strong> ${message}</p>
            
            ${
              fulfillmentData
                ? `
              <div class="product-details">
                <h3>Fulfillment Details</h3>
                ${fulfillmentData.deliveryMethod ? `<p><strong>Delivery Method:</strong> ${fulfillmentData.deliveryMethod}</p>` : ""}
                ${fulfillmentData.pickupLocation ? `<p><strong>Pickup Location:</strong> ${fulfillmentData.pickupLocation}</p>` : ""}
                ${fulfillmentData.trackingNumber ? `<p><strong>Tracking Number:</strong> ${fulfillmentData.trackingNumber}</p>` : ""}
              </div>
            `
                : ""
            }
            
            <a href="${config.FRONTEND_URL}/account/orders" class="button">View Your Orders</a>
          </div>
          
          <div class="footer">
            <p>Thank you for using Grup!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePaymentConfirmationEmail(data) {
    const {
      orderId,
      trackingNumber,
      amount,
      paymentMethod,
      customerName,
      items,
    } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #4ade80; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmation</h1>
            <p>Hello ${customerName},</p>
          </div>
          
          <div class="content">
            <h2>Payment Successful! 🎉</h2>
            <p>Your payment has been processed successfully.</p>
            
            <div class="payment-details">
              <h3>Payment Details</h3>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
              <p><strong>Amount:</strong> ₦${amount?.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            </div>
            
            <a href="${config.FRONTEND_URL}/track/${trackingNumber}" class="button">Track Your Order</a>
          </div>
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>We'll keep you updated on your order status.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateRefundNotificationEmail(data) {
    const { amount, reason, orderId, customerName } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .refund-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #fbbf24; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Refund Notification</h1>
            <p>Hello ${customerName},</p>
          </div>
          
          <div class="content">
            <h2>Refund Processed</h2>
            <p>A refund has been processed to your wallet.</p>
            
            <div class="refund-details">
              <h3>Refund Details</h3>
              <p><strong>Amount:</strong> ₦${amount?.toLocaleString()}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ""}
            </div>
            
            <a href="${config.FRONTEND_URL}/account/wallet" class="button">View Your Wallet</a>
          </div>
          
          <div class="footer">
            <p>Thank you for your understanding!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateAdminActionNotificationEmail(data) {
    const { actionType, actionDetails, customerName, adminName, timestamp } =
      data;

    const actionTitles = {
      order_status_update: "Order Status Updated",
      group_buy_status_update: "Group Buy Status Updated",
      order_cancelled: "Order Cancelled",
      refund_processed: "Refund Processed",
      delivery_scheduled: "Delivery Scheduled",
      pickup_ready: "Order Ready for Pickup",
    };

    const title = actionTitles[actionType] || "Admin Action Notification";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .action-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
            <p>Hello ${customerName},</p>
          </div>
          
          <div class="content">
            <h2>Admin Action Completed</h2>
            <p>An admin has taken action on your account.</p>
            
            <div class="action-details">
              <h3>Action Details</h3>
              <p><strong>Action:</strong> ${actionDetails.title || actionType}</p>
              <p><strong>Description:</strong> ${actionDetails.description || actionDetails.message}</p>
              <p><strong>Admin:</strong> ${adminName}</p>
              <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
              
              ${actionDetails.orderId ? `<p><strong>Order ID:</strong> ${actionDetails.orderId}</p>` : ""}
              ${actionDetails.trackingNumber ? `<p><strong>Tracking Number:</strong> ${actionDetails.trackingNumber}</p>` : ""}
              ${actionDetails.amount ? `<p><strong>Amount:</strong> ₦${actionDetails.amount.toLocaleString()}</p>` : ""}
            </div>
            
            <a href="${config.FRONTEND_URL}/account/orders" class="button">View Your Orders</a>
          </div>
          
          <div class="footer">
            <p>Thank you for your patience!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

const emailService = new EmailService();
export default emailService;
