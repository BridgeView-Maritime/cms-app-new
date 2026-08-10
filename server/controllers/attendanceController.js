import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

const getTodayDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// @desc   Whether the logged-in user needs to see the attendance gate today
// @route  GET /api/attendance/today
export const getTodayStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('skip_attendance');
    const today = getTodayDateString();
    const record = await Attendance.findOne({ user: req.user.id, date: today });

    res.status(200).json({
      success: true,
      skip_attendance: !!user?.skip_attendance,
      already_marked: !!record,
      record
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc   Mark today's attendance for the logged-in user
// @route  POST /api/attendance/mark
export const markAttendance = async (req, res) => {
  try {
    const { type, leave_time } = req.body;

    if (!['full', 'half'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "full" or "half".' });
    }
    if (type === 'half' && !leave_time) {
      return res.status(400).json({ success: false, message: 'leave_time is required for a half day.' });
    }

    const user = await User.findById(req.user.id).select('skip_attendance');
    if (user?.skip_attendance) {
      return res.status(400).json({ success: false, message: 'Your account is exempt from marking attendance.' });
    }

    const today = getTodayDateString();
    const existing = await Attendance.findOne({ user: req.user.id, date: today });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Attendance already marked for today.', record: existing });
    }

    const record = await Attendance.create({
      user: req.user.id,
      date: today,
      type,
      leave_time: type === 'half' ? leave_time : null
    });

    res.status(201).json({ success: true, record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Attendance already marked for today.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc   List attendance records, optionally filtered by user / date range
// @route  GET /api/attendance/admin/records
export const listRecords = async (req, res) => {
  try {
    const { userId, from, to, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter.user = userId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('user', 'first_name last_name email username')
        .sort({ date: -1, marked_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Attendance.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, records, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc   Per-user attendance summary for a given month
// @route  GET /api/attendance/admin/summary
export const getMonthlySummary = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const summary = await Attendance.aggregate([
      { $match: { date: { $regex: `^${monthPrefix}` } } },
      {
        $group: {
          _id: { user: '$user', type: '$type' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.user',
          counts: { $push: { type: '$_id.type', count: '$count' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          user_id: '$user._id',
          first_name: '$user.first_name',
          last_name: '$user.last_name',
          email: '$user.email',
          counts: 1
        }
      }
    ]);

    const formatted = summary.map(row => {
      const full_days = row.counts.find(c => c.type === 'full')?.count || 0;
      const half_days = row.counts.find(c => c.type === 'half')?.count || 0;
      return {
        user_id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        full_days,
        half_days,
        total_marked: full_days + half_days
      };
    });

    res.status(200).json({ success: true, year, month, summary: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
