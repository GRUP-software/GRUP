import axios from "axios";
import logger from "../utils/logger.js";
import Order from "../models/order.js";
import User from "../models/User.js";

class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    this.baseUrl = "https://graph.facebook.com/v22.0";

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn(
        "⚠️ WhatsApp credentials not configured. WhatsApp service will be disabled.",
      );
    }
  }

  // Send fulfillment choice message to customer for specific GroupBuy
  async sendFulfillmentChoiceMessage(
    phoneNumber,
    groupBuyDetails,
    orderTrackingNumber,
    groupBuyId,
  ) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        logger.warn("WhatsApp service not configured");
        return { success: false, error: "WhatsApp service not configured" };
      }

      const message = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "fulfillment_choice",
          language: {
            code: "en",
          },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "text",
                  text: `#${orderTrackingNumber}`,
                },
              ],
            },
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: groupBuyDetails.productName || "Product",
                },
                {
                  type: "text",
                  text: `#${orderTrackingNumber}`,
                },
                {
                  type: "text",
                  text: `₦${groupBuyDetails.totalAmount?.toLocaleString()}`,
                },
                {
                  type: "text",
                  text: `${groupBuyDetails.itemCount}`,
                },
              ],
            },
          ],
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Store message tracking in Order
      await this.storeMessageTracking(
        orderTrackingNumber,
        response.data.messages[0].id,
        "fulfillment_choice",
        null,
      );

      // Store message tracking in GroupBuy
      await this.storeGroupBuyMessageTracking(
        groupBuyId,
        orderTrackingNumber,
        response.data.messages[0].id,
        "fulfillment_choice",
        phoneNumber,
      );

      logger.info(
        `📱 WhatsApp fulfillment choice message sent to ${phoneNumber} for GroupBuy ${groupBuyId} (Order: ${orderTrackingNumber})`,
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        orderTrackingNumber,
        groupBuyId,
      };
    } catch (error) {
      logger.error(
        `❌ WhatsApp message error for GroupBuy ${groupBuyId}:`,
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Send confirmation message after user choice
  async sendConfirmationMessage(
    phoneNumber,
    trackingNumber,
    choice,
    pickupLocation = null,
  ) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return { success: false, error: "WhatsApp service not configured" };
      }

      const choiceText = choice === "pickup" ? "pickup" : "delivery";

      let messageText;
      if (choice === "pickup") {
        messageText = `✅ Pickup confirmed!\n\n📍 Please visit:\n${pickupLocation || "Main Store Location - 123 Commerce Street"}\n\n📞 Bring your tracking number: #${trackingNumber}\n⏰ You have 2-3 days to collect your order\n\nThank you for choosing pickup!`;
      } else {
        messageText = `✅ Delivery confirmed!\n\n🚚 We'll deliver to your address within 24-48 hours\n📞 Tracking: #${trackingNumber}\n💳 Delivery fee: ₦500 (payable on delivery)\n\nOur delivery team will contact you soon!\n\nThank you for choosing delivery!`;
      }

      const message = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: messageText,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      logger.info(
        `📱 WhatsApp confirmation sent to ${phoneNumber} for ${choiceText} choice`,
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      logger.error(
        `❌ WhatsApp confirmation error:`,
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Process incoming WhatsApp webhook
  async processWebhook(webhookData) {
    try {
      const entry = webhookData.entry?.[0];
      if (!entry) {
        return { success: false, error: "Invalid webhook data" };
      }

      const changes = entry.changes?.[0];
      if (!changes || changes.value?.messages?.length === 0) {
        return { success: false, error: "No messages in webhook" };
      }

      const message = changes.value.messages[0];
      const phoneNumber = message.from;
      const messageType = message.type;

      // Handle interactive responses (button clicks)
      if (
        messageType === "interactive" &&
        message.interactive?.type === "button_reply"
      ) {
        return await this.handleButtonResponse(
          phoneNumber,
          message.interactive.button_reply,
        );
      }

      // Handle text messages
      if (messageType === "text") {
        return await this.handleTextResponse(phoneNumber, message.text.body);
      }

      return { success: false, error: "Unsupported message type" };
    } catch (error) {
      logger.error("❌ WhatsApp webhook processing error:", error);
      return { success: false, error: error.message };
    }
  }

  // Handle button responses (pickup/delivery choice)
  async handleButtonResponse(phoneNumber, buttonReply) {
    try {
      const buttonId = buttonReply.id;

      // Handle our template button IDs: 'pickup' and 'delivery'
      if (buttonId === "pickup" || buttonId === "delivery") {
        // We need to find the order by phone number since button doesn't contain tracking number
        const order = await Order.findOne({
          $or: [
            { "user.phone": phoneNumber },
            { "deliveryAddress.phone": phoneNumber },
          ],
        }).populate("user", "phone name");

        if (!order) {
          logger.warn(`Order not found for phone number: ${phoneNumber}`);
          return {
            success: false,
            error: "Order not found for this phone number",
          };
        }

        const choice = buttonId;
        const trackingNumber = order.trackingNumber;

        // Update order fulfillment choice
        order.fulfillmentChoice = choice;
        const newStatus =
          choice === "pickup" ? "ready_for_pickup" : "out_for_delivery";

        order.currentStatus = newStatus;
        order.progress.push({
          status: newStatus,
          message: `Customer chose ${choice} via WhatsApp. Order is ${choice === "pickup" ? "ready for pickup" : "out for delivery"}.`,
          timestamp: new Date(),
        });

        await order.save();

        // Send confirmation message
        const pickupLocation = "Main Store Location - 123 Commerce Street"; // Make this configurable
        await this.sendConfirmationMessage(
          phoneNumber,
          trackingNumber,
          choice,
          pickupLocation,
        );

        logger.info(
          `✅ WhatsApp fulfillment choice processed: ${choice} for order ${trackingNumber}`,
        );

        return {
          success: true,
          trackingNumber,
          choice,
          newStatus,
          orderId: order._id,
        };
      }

      // Handle legacy format: choice_trackingNumber
      const [choice, trackingNumber] = buttonId.split("_");

      if (!["pickup", "delivery"].includes(choice) || !trackingNumber) {
        return { success: false, error: "Invalid button response" };
      }

      // Find order by tracking number
      const order = await Order.findOne({ trackingNumber }).populate(
        "user",
        "phone name",
      );

      if (!order) {
        logger.warn(`Order not found for tracking number: ${trackingNumber}`);
        return { success: false, error: "Order not found" };
      }

      // Verify phone number matches order
      if (
        order.deliveryAddress?.phone !== phoneNumber &&
        order.user?.phone !== phoneNumber
      ) {
        logger.warn(`Phone number mismatch for order ${trackingNumber}`);
        return { success: false, error: "Phone number does not match order" };
      }

      // Update order fulfillment choice
      order.fulfillmentChoice = choice;
      const newStatus =
        choice === "pickup" ? "ready_for_pickup" : "out_for_delivery";

      order.currentStatus = newStatus;
      order.progress.push({
        status: newStatus,
        message: `Customer chose ${choice} via WhatsApp. Order is ${choice === "pickup" ? "ready for pickup" : "out for delivery"}.`,
        timestamp: new Date(),
      });

      await order.save();

      // Send confirmation message
      const pickupLocation = "Main Store Location - 123 Commerce Street"; // Make this configurable
      await this.sendConfirmationMessage(
        phoneNumber,
        trackingNumber,
        choice,
        pickupLocation,
      );

      logger.info(
        `✅ WhatsApp fulfillment choice processed: ${choice} for order ${trackingNumber}`,
      );

      return {
        success: true,
        trackingNumber,
        choice,
        newStatus,
        orderId: order._id,
      };
    } catch (error) {
      logger.error("❌ Button response handling error:", error);
      return { success: false, error: error.message };
    }
  }

  // Handle text responses (fallback)
  async handleTextResponse(phoneNumber, text) {
    try {
      // Try to extract tracking number from text
      const trackingMatch = text.match(/#([A-Z0-9]+)/);
      if (!trackingMatch) {
        return { success: false, error: "No tracking number found in message" };
      }

      const trackingNumber = trackingMatch[1];

      // Check if text contains choice keywords
      const choice = text.toLowerCase().includes("pickup")
        ? "pickup"
        : text.toLowerCase().includes("delivery")
          ? "delivery"
          : null;

      if (!choice) {
        // Send help message
        await this.sendHelpMessage(phoneNumber, trackingNumber);
        return { success: true, message: "Help message sent" };
      }

      // Process as button response
      return await this.handleButtonResponse(phoneNumber, {
        id: `${choice}_${trackingNumber}`,
      });
    } catch (error) {
      logger.error("❌ Text response handling error:", error);
      return { success: false, error: error.message };
    }
  }

  // Send help message
  async sendHelpMessage(phoneNumber, trackingNumber) {
    try {
      const message = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: `Need help with order #${trackingNumber}?\n\nPlease reply with:\n• "pickup" to collect from store\n• "delivery" for home delivery\n\nOr use the buttons in the previous message.\n\nIf you need further assistance, please contact our support team.`,
        },
      };

      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      logger.error("❌ Help message error:", error);
    }
  }

  // Store message tracking for analytics
  async storeMessageTracking(
    trackingNumber,
    messageId,
    messageType,
    orderId = null,
  ) {
    try {
      if (orderId) {
        await Order.findOneAndUpdate(
          { _id: orderId },
          {
            $push: {
              whatsappMessages: {
                messageId,
                type: messageType,
                sentAt: new Date(),
                status: "sent",
              },
            },
          },
        );
      } else {
        await Order.findOneAndUpdate(
          { trackingNumber },
          {
            $push: {
              whatsappMessages: {
                messageId,
                type: messageType,
                sentAt: new Date(),
                status: "sent",
              },
            },
          },
        );
      }
    } catch (error) {
      logger.error("❌ Error storing message tracking:", error);
    }
  }

  // Store message tracking for GroupBuy
  async storeGroupBuyMessageTracking(
    groupId,
    trackingNumber,
    messageId,
    messageType,
    phoneNumber,
    orderId = null,
  ) {
    try {
      const GroupBuy = (await import("../models/GroupBuy.js")).default;

      await GroupBuy.findOneAndUpdate(
        { _id: groupId },
        {
          $push: {
            whatsappMessages: {
              messageId,
              orderId: orderId,
              trackingNumber,
              type: messageType,
              sentAt: new Date(),
              status: "sent",
              customerPhone: phoneNumber,
            },
          },
        },
      );
    } catch (error) {
      logger.error("❌ Error storing GroupBuy message tracking:", error);
    }
  }

  // Verify webhook signature (for security)
  verifyWebhookSignature(body, signature) {
    try {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", this.verifyToken)
        .update(JSON.stringify(body))
        .digest("hex");

      return signature === expectedSignature;
    } catch (error) {
      logger.error("❌ Webhook signature verification error:", error);
      return false;
    }
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(`${this.baseUrl}/${messageId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error("❌ Error getting message status:", error);
      return null;
    }
  }
}

export default new WhatsAppService();
