import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD', server-local calendar day
  type: { type: String, enum: ['full', 'half'], required: true },
  leave_time: {
    type: String, // 'HH:mm'
    default: null,
    required: function () { return this.type === 'half'; }
  },
  marked_at: { type: Date, default: Date.now }
}, { timestamps: true });

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', AttendanceSchema);
