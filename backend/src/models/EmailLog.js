
import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true
    },

    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid recipient email'
      ]
    },

    status: {
      type: String,
      enum: [
        'accepted',
        'failed',
        'delivered',
        'bounced'
      ],
      default: 'failed'
    },

    providerMessageId: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null
    },

    errorMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    },

    sentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate logs for the same recipient in a campaign.
schema.index(
  { campaignId: 1, recipientEmail: 1 },
  {
    unique: true,
    name: 'unique_campaign_recipient'
  }
);

// Support efficient provider message ID lookups for future webhooks.
schema.index(
  { providerMessageId: 1 },
  {
    sparse: true,
    name: 'provider_message_lookup'
  }
);

export default mongoose.model('EmailLog', schema);
