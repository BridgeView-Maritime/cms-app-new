import mongoose from 'mongoose';

const crewSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  experience: {
    type: Number,
    default: 0
  },
  bio: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Crew', crewSchema);