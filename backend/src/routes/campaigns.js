
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import Campaign from '../models/Campaign.js';
import EmailLog from '../models/EmailLog.js';
import Recipient from '../models/Recipient.js';

import { campaignSchema } from '../utils/validation.js';
import { sendOne } from '../services/mailer.js';

const router = Router();

// Only campaign sending consumes this rate limit.
// Campaign history and log requests are not affected.
const campaignSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many campaign requests. Please try again later.'
  }
});

// Get campaign history.
router.get('/', async (req, res) => {
  const items = await Campaign.find()
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(items);
});

// Create and send campaign.
router.post('/', campaignSendLimiter, async (req, res) => {
  const data = campaignSchema.parse(req.body);

  const unique = [...new Set(data.recipients)];

  // Only active and subscribed recipients can receive campaigns.
  const subscribed = await Recipient.find({
    email: { $in: unique },
    isDeleted: false,
    subscribed: true
  }).select('email');

  const allowed = new Set(
    subscribed.map(recipient => recipient.email)
  );

  const recipients = unique.filter(
    email => allowed.has(email)
  );

  if (!recipients.length) {
    return res.status(400).json({
      message: 'No recipients are currently active and subscribed. Add/import recipients and confirm consent first.'
    });
  }

  const campaign = await Campaign.create({
    campaignName: data.campaignName,
    subject: data.subject,
    body: data.body,
    totalRecipients: recipients.length,
    status: 'sending'
  });

  let sentCount = 0;
  let failedCount = 0;

  // Sequential processing for small campaigns.
  for (const email of recipients) {
    try {
      const info = await sendOne({
        to: email,
        subject: data.subject,
        body: data.body
      });

      await EmailLog.create({
        campaignId: campaign.id,
        recipientEmail: email,
        status: 'accepted',
        providerMessageId: info.messageId,
        sentAt: new Date()
      });

      sentCount++;

    } catch (error) {
      await EmailLog.create({
        campaignId: campaign.id,
        recipientEmail: email,
        status: 'failed',
        errorMessage: String(error.message).slice(0, 500)
      });

      failedCount++;
    }
  }

  campaign.sentCount = sentCount;
  campaign.failedCount = failedCount;

  campaign.status =
    failedCount === 0
      ? 'completed'
      : sentCount === 0
        ? 'failed'
        : 'completed_with_errors';

  campaign.completedAt = new Date();

  await campaign.save();

  res.status(201).json({
    campaign,
    message: `Campaign finished: ${sentCount} accepted, ${failedCount} failed`
  });
});

// Get campaign details and email logs.
router.get('/:id', async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return res.status(404).json({
      message: 'Campaign not found'
    });
  }

  const logs = await EmailLog.find({
    campaignId: campaign.id
  }).sort({ createdAt: 1 });

  res.json({
    campaign,
    logs
  });
});

// Get campaign email logs.
router.get('/:id/logs', async (req, res) => {
  const logs = await EmailLog.find({
    campaignId: req.params.id
  }).sort({ createdAt: 1 });

  res.json(logs);
});

export default router;
