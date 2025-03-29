const { getNotificationsService, markAsReadService, deleteNotificationService } = require("../services/notificationService");

const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const data = await getNotificationsService(userId);
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi lấy danh sách thông báo" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationId = req.params.id;
        const data = await markAsReadService(notificationId, userId);
        if (!data) {
            return res.status(404).json({ message: "Thông báo không tồn tại hoặc bạn không có quyền chỉnh sửa" });
        }
        return res.status(200).json({ message: "Đã đánh dấu thông báo là đã đọc", notification: data });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi đánh dấu thông báo là đã đọc" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationId = req.params.id;
        const data = await deleteNotificationService(notificationId, userId);
        if (!data) {
            return res.status(404).json({ message: "Thông báo không tồn tại hoặc bạn không có quyền xóa" });
        }
        return res.status(200).json({ message: "Đã xóa thông báo thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi xóa thông báo" });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    deleteNotification
};