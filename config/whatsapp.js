// WhatsApp Business API Configuration
export const whatsappConfig = {
  // Meta Business API credentials
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,

  // API endpoints
  baseUrl: "https://graph.facebook.com/v22.0",

  // Message templates
  templates: {
    fulfillmentChoice: {
      header: "🎉 Order Ready!",
      body: "Your order is ready! Please choose your preferred fulfillment method:",
      footer: "Reply with your choice to proceed",
      buttons: {
        pickup: {
          id: "pickup",
          title: "🏪 Pickup",
        },
        delivery: {
          id: "delivery",
          title: "🚚 Delivery (+₦500)",
        },
      },
    },
    confirmation: {
      pickup: {
        message:
          "✅ Pickup confirmed! Please visit:\n📍 {pickupLocation}\n📞 Bring your tracking number: #{trackingNumber}",
      },
      delivery: {
        message:
          "✅ Delivery confirmed! We'll deliver to your address within 24 hours.\n📞 Tracking: #{trackingNumber}\n💳 Delivery fee: ₦500",
      },
    },
    help: {
      message:
        'Need help with order #{trackingNumber}?\n\nReply with:\n• "pickup" to collect from store\n• "delivery" for home delivery\n\nOr use the buttons in the previous message.',
    },
  },

  // Pickup locations
  pickupLocations: {
    default: "Main Store Location - 123 Commerce Street",
    locations: [
      {
        id: "main",
        name: "Main Store Location",
        address: "123 Commerce Street, Lagos",
        hours: "9:00 AM - 6:00 PM (Mon-Sat)",
      },
      {
        id: "branch1",
        name: "Branch 1",
        address: "456 Business Avenue, Lagos",
        hours: "8:00 AM - 5:00 PM (Mon-Fri)",
      },
    ],
  },

  // Delivery settings
  delivery: {
    fee: 500, // ₦500
    estimatedTime: "24 hours",
    supportedStates: ["Lagos", "Ogun", "Oyo", "Ondo", "Ekiti"],
  },

  // Webhook settings
  webhook: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    signatureHeader: "x-hub-signature-256",
  },

  // Message tracking
  tracking: {
    enabled: true,
    storeResponses: true,
    logLevel: "info", // 'debug', 'info', 'warn', 'error'
  },
};

// Validation functions
export const validateWhatsAppConfig = () => {
  const required = ["accessToken", "phoneNumberId", "verifyToken"];
  const missing = required.filter((key) => !whatsappConfig[key]);

  if (missing.length > 0) {
    console.warn(`⚠️ Missing WhatsApp configuration: ${missing.join(", ")}`);
    return false;
  }

  return true;
};

// Helper functions
export const formatPhoneNumber = (phone) => {
  // Ensure phone number is in international format
  if (phone && !phone.startsWith("+")) {
    if (phone.startsWith("0")) {
      return "+234" + phone.substring(1);
    }
    if (phone.startsWith("234")) {
      return "+" + phone;
    }
  }
  return phone;
};

export const getPickupLocation = (locationId = "default") => {
  const location = whatsappConfig.pickupLocations.locations.find(
    (loc) => loc.id === locationId,
  );
  return location
    ? location.name + " - " + location.address
    : whatsappConfig.pickupLocations.default;
};

export const getDeliveryFee = () => {
  return whatsappConfig.delivery.fee;
};

export const isDeliverySupported = (state) => {
  return whatsappConfig.delivery.supportedStates.includes(state);
};
