import Order from '../models/order.js';

export const notifyGroupSecured = async (group) => {
    try {
        // Find all orders that contain items from this group
        const orders = await Order.find({
            'items.groupbuyId': group._id,
        }).populate('user', 'name email');

        for (const order of orders) {
            // Update the specific item's status
            order.items.forEach((item) => {
                if (
                    item.groupbuyId &&
                    item.groupbuyId.toString() === group._id.toString()
                ) {
                    item.groupStatus = 'secured';
                }
            });

            // Add progress update
            order.progress.push({
                status: 'group_secured',
                message: `Group purchase for one of your items has been secured!`,
                timestamp: new Date(),
            });

            await order.save();

            // Here you would send actual notifications (email, push, etc.)
            console.log(
                `Notification sent to ${order.user.name}: Group secured for order ${order._id}`
            );
        }
    } catch (err) {
        console.error('Error sending group secured notifications:', err);
    }
};

export const notifyOrderReady = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate(
            'user',
            'name email'
        );

        if (order && order.allGroupsSecured) {
            // Send notification that order is ready for processing
            console.log(
                `Order ${orderId} is ready for processing - all groups secured`
            );

            // Here you would send actual notifications
        }
    } catch (err) {
        console.error('Error sending order ready notification:', err);
    }
};
