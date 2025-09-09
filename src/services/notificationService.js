const Notification = require('../models/notifications');

// Tạo thông báo mới
const createNotificationService = async (userId, message) => {
    try {
        if (!userId || !message) {
            throw new Error("userId và message là bắt buộc");
        }
        const newNotification = new Notification({
            userId,
            message
        });
        await newNotification.save();
        return newNotification;
    } catch (error) {
        console.log("Lỗi khi tạo thông báo:", error);
        return null;
    }
};

// Lấy danh sách thông báo của người dùng
const getNotificationsService = async (userId) => {
    try {
        if (!userId) {
            throw new Error("userId là bắt buộc");
        }
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo, mới nhất trước
            .limit(50); // Giới hạn 50 thông báo gần nhất
        return notifications;
    } catch (error) {
        console.log("Lỗi khi lấy danh sách thông báo:", error);
        return [];
    }
};

// Đánh dấu thông báo là đã đọc
const markAsReadService = async (notificationId, userId) => {
    try {
        if (!notificationId || !userId) {
            throw new Error("notificationId và userId là bắt buộc");
        }
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
        return notification;
    } catch (error) {
        console.log("Lỗi khi đánh dấu thông báo là đã đọc:", error);
        return null;
    }
};

// Xóa thông báo
const deleteNotificationService = async (notificationId, userId) => {
    try {
        if (!notificationId || !userId) {
            throw new Error("notificationId và userId là bắt buộc");
        }
        const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
        return notification;
    } catch (error) {
        console.log("Lỗi khi xóa thông báo:", error);
        return null;
    }
};

module.exports = {
    createNotificationService,
    getNotificationsService,
    markAsReadService,
    deleteNotificationService
};