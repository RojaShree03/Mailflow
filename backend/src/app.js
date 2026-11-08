
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import recipientRoutes from './routes/recipients.js';
import campaignRoutes from './routes/campaigns.js';
import dashboardRoutes from './routes/dashboard.js';

import { requireAuth } from './middleware/auth.js';
import {
    notFound,
    errorHandler
} from './middleware/errors.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = (
    process.env.CLIENT_ORIGIN || 'http://localhost:5173'
)
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin = origin.replace(/\/$/, '');

            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            return callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With'
        ]
    })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');

    res.status(200).json({
        status: 'ok',
        service: 'mailflow-api'
    });
});

// Authentication rate limiter.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many authentication attempts. Please try again later.'
    }
});

app.use('/api/auth', authLimiter, authRoutes);

app.use(
    '/api/recipients',
    requireAuth,
    recipientRoutes
);

// IMPORTANT:
// Do not apply the campaign sending limiter here.
// It should only apply to POST /api/campaigns.
app.use(
    '/api/campaigns',
    requireAuth,
    campaignRoutes
);

app.use(
    '/api/dashboard',
    requireAuth,
    dashboardRoutes
);

app.use(notFound);
app.use(errorHandler);

export default app;
