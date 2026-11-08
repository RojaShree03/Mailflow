
import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    campaignName: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: 120
    },

    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
      maxlength: 200
    },

    body: {
      type: String,
      required: [true, 'Email body is required'],
      maxlength: 100000
    },

    totalRecipients: {
      type: Number,
      default: 0,
      min: 0
    },

    sentCount: {
      type: Number,
      default: 0,
      min: 0
    },

    failedCount: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: [
        'queued',
        'sending',
        'completed',
        'completed_with_errors',
        'failed'
      ],
      default: 'queued'
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Ensure campaign statistics remain consistent.
schema.pre('validate', function () {
  if (this.sentCount + this.failedCount > this.totalRecipients) {
    this.invalidate(
      'sentCount',
      'Sent and failed counts cannot exceed total recipients'
    );
  }
});

export default mongoose.model('Campaign', schema);
