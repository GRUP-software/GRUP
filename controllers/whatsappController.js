import whatsappService from '../services/whatsappService.js'
import logger from '../utils/logger.js'
import notificationService from '../services/notificationService.js'

// Simple test endpoint to verify the route is working
export const testWebhook = async (req, res) => {
  res.status(200).json({ 
    message: 'Webhook route is working',
    query: req.query,
    headers: req.headers
  })
}

// Verify WhatsApp webhook (for initial setup)
export const verifyWhatsAppWebhook = async (req, res) => {
  try {
    // Parse query parameters more robustly
    const mode = req.query['hub.mode'] || req.query.hub?.mode
    const token = req.query['hub.verify_token'] || req.query.hub?.verify_token
    const challenge = req.query['hub.challenge'] || req.query.hub?.challenge

    // Alternative: parse from URL directly if needed
    const url = new URL(req.url, `http://${req.headers.host}`)
    const modeAlt = url.searchParams.get('hub.mode')
    const tokenAlt = url.searchParams.get('hub.verify_token')
    const challengeAlt = url.searchParams.get('hub.challenge')

    // Use whichever method works
    const finalMode = mode || modeAlt
    const finalToken = token || tokenAlt
    const finalChallenge = challenge || challengeAlt

    logger.info(`🔐 WhatsApp webhook verification attempt: mode=${finalMode}, token=${finalToken}`)
    logger.info(`🔍 Raw query:`, req.query)
    logger.info(`🔍 URL:`, req.url)

    // Check if a token and mode were sent
    if (finalMode && finalToken) {
      // Check the mode and token sent are correct
      if (finalMode === 'subscribe' && finalToken === process.env.WHATSAPP_VERIFY_TOKEN) {
        // Respond with 200 OK and challenge token from the request
        logger.info('✅ WhatsApp webhook verified successfully')
        res.status(200).send(finalChallenge)
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        logger.warn('❌ WhatsApp webhook verification failed: invalid token')
        res.sendStatus(403)
      }
    } else {
      logger.warn('❌ WhatsApp webhook verification failed: missing parameters')
      logger.warn(`Mode: ${finalMode}, Token: ${finalToken}`)
      res.sendStatus(400)
    }
  } catch (error) {
    logger.error('❌ WhatsApp webhook verification error:', error)
    res.status(500).json({ error: 'Webhook verification failed' })
  }
}

// Handle incoming WhatsApp webhook messages
export const handleWhatsAppWebhook = async (req, res) => {
  try {
    logger.info('📱 WhatsApp webhook received:', JSON.stringify(req.body, null, 2))

    // Verify webhook signature for security
    const signature = req.headers['x-hub-signature-256']
    if (signature && !whatsappService.verifyWebhookSignature(req.body, signature)) {
      logger.warn('❌ Invalid WhatsApp webhook signature')
      return res.status(403).json({ error: 'Invalid signature' })
    }

    const result = await whatsappService.processWebhook(req.body)

    if (result.success) {
      // Send notification to admin about the fulfillment choice
      if (result.choice && result.trackingNumber) {
        try {
          await notificationService.createNotification({
            userId: process.env.ADMIN_USER_ID, // You'll need to set this
            type: 'info',
            category: 'whatsapp',
            title: 'WhatsApp Fulfillment Choice',
            message: `Customer chose ${result.choice} for order #${result.trackingNumber}`,
            data: {
              trackingNumber: result.trackingNumber,
              choice: result.choice,
              newStatus: result.newStatus,
              orderId: result.orderId
            },
            priority: 'high'
          })
        } catch (notificationError) {
          logger.error('❌ Error sending admin notification:', notificationError)
        }
      }

      logger.info('✅ WhatsApp webhook processed successfully:', result)
      res.status(200).json({ success: true, message: 'Webhook processed' })
    } else {
      logger.warn('⚠️ WhatsApp webhook processing failed:', result.error)
      res.status(400).json({ success: false, error: result.error })
    }

  } catch (error) {
    logger.error('❌ WhatsApp webhook processing error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

// Manual trigger for sending WhatsApp message (for testing/admin use)
export const sendWhatsAppMessage = async (req, res) => {
  try {
    const { trackingNumber, phoneNumber } = req.body

    if (!trackingNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Tracking number and phone number are required'
      })
    }

    // Find order details
    const Order = (await import('../models/order.js')).default
    const order = await Order.findOne({ trackingNumber })
      .populate('user', 'name phone')
      .populate('items.product', 'title')

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }

    const orderDetails = {
      totalAmount: order.totalAmount,
      itemCount: order.items.length,
      items: order.items.map(item => item.product.title).join(', ')
    }

    const result = await whatsappService.sendFulfillmentChoiceMessage(
      phoneNumber,
      trackingNumber,
      orderDetails,
      order._id // Pass orderId for tracking
    )

    if (result.success) {
      res.json({
        success: true,
        message: 'WhatsApp message sent successfully',
        data: result
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      })
    }

  } catch (error) {
    logger.error('❌ Manual WhatsApp message error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp message',
      details: error.message
    })
  }
}

// Get WhatsApp message status
export const getWhatsAppMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      })
    }

    const status = await whatsappService.getMessageStatus(messageId)

    if (status) {
      res.json({
        success: true,
        data: status
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Message status not found'
      })
    }

  } catch (error) {
    logger.error('❌ Get WhatsApp message status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get message status',
      details: error.message
    })
  }
}

// Get WhatsApp messages for an order
export const getOrderWhatsAppMessages = async (req, res) => {
  try {
    const { trackingNumber } = req.params

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        error: 'Tracking number is required'
      })
    }

    const Order = (await import('../models/order.js')).default
    const order = await Order.findOne({ trackingNumber })

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }

    res.json({
      success: true,
      data: {
        trackingNumber,
        whatsappMessages: order.whatsappMessages || [],
        fulfillmentChoice: order.fulfillmentChoice
      }
    })

  } catch (error) {
    logger.error('❌ Get order WhatsApp messages error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp messages',
      details: error.message
    })
  }
}

// Get WhatsApp messages for a GroupBuy
export const getGroupBuyWhatsAppMessages = async (req, res) => {
  try {
    const { groupBuyId } = req.params

    if (!groupBuyId) {
      return res.status(400).json({
        success: false,
        error: 'Group Buy ID is required'
      })
    }

    const GroupBuy = (await import('../models/GroupBuy.js')).default
    const groupBuy = await GroupBuy.findById(groupBuyId)

    if (!groupBuy) {
      return res.status(404).json({
        success: false,
        error: 'Group Buy not found'
      })
    }

    res.json({
      success: true,
      data: {
        groupBuyId,
        productTitle: groupBuy.productId?.title || 'Product',
        whatsappMessages: groupBuy.whatsappMessages || [],
        participantCount: groupBuy.participants.length
      }
    })

  } catch (error) {
    logger.error('❌ Get GroupBuy WhatsApp messages error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get GroupBuy WhatsApp messages',
      details: error.message
    })
  }
}

