
import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import Recipient from '../models/Recipient.js';
import EmailLog from '../models/EmailLog.js';

const router = Router();

// Forward asynchronous errors to the centralized error handler.
const asyncRoute = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

// GET /api/dashboard/stats
// Return the main dashboard statistics.
router.get(
    '/stats',
    asyncRoute(async (req, res) => {
        const [
            totalCampaigns,
            sent,
            failed,
            totalRecipients,
            recent
        ] = await Promise.all([
            Campaign.countDocuments(),

            // Accepted or delivered emails count as sent.
            EmailLog.countDocuments({
                status: {
                    $in: ['accepted', 'delivered']
                }
            }),

            EmailLog.countDocuments({
                status: 'failed'
            }),

            // Count only active and subscribed recipients.
            Recipient.countDocuments({
                isDeleted: false,
                subscribed: true
            }),

            // Latest five campaigns.
            Campaign.find()
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        return res.json({
            totalCampaigns,
            sent,
            failed,
            totalRecipients,
            recent
        });
    })
);

// GET /api/dashboard/analytics
// Return the distribution of email statuses.
router.get(
    '/analytics',
    asyncRoute(async (req, res) => {
        const grouped = await EmailLog.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]);

        return res.json({
            distribution: grouped
        });
    })
);

export default router;
