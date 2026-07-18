// server/models/Notification.js
import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileSize: Number,
  mimeType: String
});

// Central base metadata for the notification post
const NotificationSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  attachments: [AttachmentSchema],
  // NEW: Array to store all recipient IDs directly on the main record
  receiverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

// The mapping record table where individual user read statuses are updated
const UserNotificationMappingSchema = new mongoose.Schema({
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
});

const MailLogSchema = new mongoose.Schema({
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  recipientEmail: { type: String, required: true },
  status: { type: String, enum: ['Sent', 'Failed'], required: true },
  errorMessage: { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const UserNotificationMapping = mongoose.models.UserNotificationMapping || mongoose.model('UserNotificationMapping', UserNotificationMappingSchema);
export const MailLog = mongoose.models.MailLog || mongoose.model('MailLog', MailLogSchema);