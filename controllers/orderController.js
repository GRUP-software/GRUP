import Order from "../models/order.js";
import notificationService from "../services/notificationService.js";

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .populate("items.groupbuyId")
      .sort({ createdAt: -1 });

    // Update order statuses and priority scores
    for (const order of orders) {
      order.checkAllGroupsSecured();
      order.calculatePriorityScore();
      await order.save();
    }

    res.json(orders);
  } catch (err) {
    console.error("Fetch Orders Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching orders", error: err.message });
  }
};

export const getOrderProgress = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    })
      .populate("items.product", "title images")
      .populate(
        "items.groupbuyId",
        "status progressPercentage participantCount",
      );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order status
    order.checkAllGroupsSecured();
    await order.save();

    // Calculate estimated fulfillment time if all groups are secured
    let estimatedFulfillment = null;
    if (order.allGroupsSecured && !order.estimatedFulfillmentTime) {
      estimatedFulfillment = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      order.estimatedFulfillmentTime = estimatedFulfillment;
      await order.save();
    }

    res.json({
      order,
      estimatedFulfillment: order.estimatedFulfillmentTime,
      groupsProgress: order.items.map((item) => ({
        productId: item.product._id,
        productTitle: item.product.title,
        groupStatus: item.groupStatus,
        groupProgress: item.groupbuyId?.progressPercentage || 0,
        participantCount: item.groupbuyId?.participantCount || 0,
      })),
    });
  } catch (err) {
    console.error("Get Order Progress Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching order progress", error: err.message });
  }
};

// Customer: Track order by tracking number (public endpoint)
export const trackOrderByNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const order = await Order.findOne({ trackingNumber })
      .populate("items.product", "title images price")
      .populate(
        "items.groupbuyId",
        "status progressPercentage participantCount minimumViableUnits unitsSold",
      )
      .populate("user", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found with this tracking number" });
    }

    // Update order status
    order.checkAllGroupsSecured();
    await order.save();

    // Calculate group progress for each item
    const itemsProgress = order.items.map((item) => {
      const groupBuy = item.groupbuyId;
      let progressPercentage = 0;

      if (groupBuy && groupBuy.minimumViableUnits > 0) {
        progressPercentage = Math.round(
          (groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100,
        );
      }

      return {
        productId: item.product._id,
        productTitle: item.product.title,
        productImage: item.product.images?.[0] || null,
        quantity: item.quantity,
        price: item.price,
        groupStatus: item.groupStatus,
        groupProgress: progressPercentage,
        participantCount: groupBuy?.participantCount || 0,
        unitsNeeded: groupBuy?.minimumViableUnits || 0,
        unitsSold: groupBuy?.unitsSold || 0,
      };
    });

    res.json({
      trackingNumber: order.trackingNumber,
      currentStatus: order.currentStatus,
      allGroupsSecured: order.allGroupsSecured,
      estimatedFulfillmentTime: order.estimatedFulfillmentTime,
      totalAmount: order.totalAmount,
      walletUsed: order.walletUsed,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      progress: order.progress,
      items: itemsProgress,
      customerInfo: {
        name: order.user.name,
        email: order.user.email,
      },
    });
  } catch (err) {
    console.error("Track Order Error:", err);
    res
      .status(500)
      .json({ message: "Error tracking order", error: err.message });
  }
};

// Staff: Lookup order by tracking number (requires auth)
export const lookupOrderForStaff = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const order = await Order.findOne({ trackingNumber })
      .populate("items.product", "title images price stock")
      .populate(
        "items.groupbuyId",
        "status progressPercentage participantCount",
      )
      .populate("user", "name email phone")
      .populate("paymentHistoryId", "referenceId flutterwaveReference");

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found with this tracking number" });
    }

    // Update order status
    order.checkAllGroupsSecured();
    order.calculatePriorityScore();
    await order.save();

    res.json({
      order,
      paymentInfo: {
        referenceId: order.paymentHistoryId?.referenceId,
        flutterwaveReference: order.paymentHistoryId?.flutterwaveReference,
      },
      customerContact: {
        name: order.user.name,
        email: order.user.email,
        phone: order.deliveryAddress.phone,
      },
    });
  } catch (err) {
    console.error("Staff Order Lookup Error:", err);
    res
      .status(500)
      .json({ message: "Error looking up order", error: err.message });
  }
};

// Admin: Get orders with priority sorting
export const getOrdersForAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.currentStatus = status;
    }

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("items.product", "title")
      .populate("items.groupbuyId", "status")
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Update all order priorities
    for (const order of orders) {
      order.checkAllGroupsSecured();
      order.calculatePriorityScore();
      await order.save();
    }

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    console.error("Get Admin Orders Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching orders for admin", error: err.message });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { status, message, notifyCustomer = true } = req.body;

    const validStatuses = [
      "groups_forming",
      "all_secured",
      "processing",
      "packaged",
      "awaiting_fulfillment_choice",
      "ready_for_pickup",
      "out_for_delivery",
      "delivered",
      "picked_up",
      "cancelled",
      "groups_under_review",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        validStatuses,
      });
    }

    const order = await Order.findOne({ trackingNumber })
      .populate("user", "name email")
      .populate("items.product", "title");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = order.currentStatus;
    order.currentStatus = status;
    order.progress.push({
      status,
      message: message || `Order status updated to ${status}`,
      timestamp: new Date(),
    });

    // Set estimated fulfillment time when packaged
    if (status === "packaged" && !order.estimatedFulfillmentTime) {
      order.estimatedFulfillmentTime = new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ); // 2 hours from now
    }

    await order.save();

    // Send detailed notification to customer if requested
    if (notifyCustomer) {
      const customMessage =
        message ||
        `Your order ${trackingNumber} status has been updated to ${status}.`;
      const adminName = req.user?.name || req.user?.email || "Admin";

      await notificationService.notifyAdminOrderStatusUpdate(
        order.user._id,
        {
          orderId: order._id,
          trackingNumber: order.trackingNumber,
        },
        status,
        customMessage,
        adminName,
      );

      // Send additional notification for tracking number if this is the first status update
      if (previousStatus === "groups_forming" && status !== "groups_forming") {
        await notificationService.notifyTrackingNumberAssigned(order.user._id, {
          orderId: order._id,
          trackingNumber: order.trackingNumber,
        });
      }
    }

    res.json({
      message: "Order status updated successfully",
      trackingNumber: order.trackingNumber,
      newStatus: status,
      previousStatus,
      customerNotified: notifyCustomer,
      order,
    });
  } catch (err) {
    console.error("Update Order Status Error:", err);
    res
      .status(500)
      .json({ message: "Error updating order status", error: err.message });
  }
};

// WhatsApp Integration: Handle fulfillment choice
export const handleFulfillmentChoice = async (req, res) => {
  try {
    const { trackingNumber, choice, customerPhone } = req.body;

    if (!["pickup", "delivery"].includes(choice)) {
      return res
        .status(400)
        .json({ message: "Invalid choice. Must be 'pickup' or 'delivery'" });
    }

    const order = await Order.findOne({ trackingNumber });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify customer phone matches
    if (order.deliveryAddress.phone !== customerPhone) {
      return res
        .status(403)
        .json({ message: "Phone number does not match order" });
    }

    const newStatus =
      choice === "pickup" ? "ready_for_pickup" : "out_for_delivery";

    order.currentStatus = newStatus;
    order.fulfillmentChoice = choice;
    order.progress.push({
      status: newStatus,
      message: `Customer chose ${choice}. Order is ${choice === "pickup" ? "ready for pickup" : "out for delivery"}.`,
      timestamp: new Date(),
    });

    await order.save();

    res.json({
      message: `Fulfillment choice recorded: ${choice}`,
      trackingNumber: order.trackingNumber,
      newStatus,
      choice,
    });
  } catch (err) {
    console.error("Handle Fulfillment Choice Error:", err);
    res
      .status(500)
      .json({
        message: "Error handling fulfillment choice",
        error: err.message,
      });
  }
};
