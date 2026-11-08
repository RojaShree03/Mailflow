
import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },

    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address'
      ]
    },

    subscribed: {
      type: Boolean,
      default: true
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate email addresses, including soft-deleted records.
schema.index(
  { email: 1 },
  {
    unique: true,
    name: 'unique_recipient_email'
  }
);

export default mongoose.model('Recipient', schema);
