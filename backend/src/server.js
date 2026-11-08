
import 'dotenv/config';

import app from './app.js';
import { connectDB } from './config/db.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT === undefined
    ? 5000
    : Number(process.env.PORT);

let server;
let isShuttingDown = false;

async function startServer() {
    try {
        // Validate essential environment variables.
        const requiredVariables = [
            'MONGODB_URI',
            'JWT_SECRET'
        ];

        const missingVariables = requiredVariables.filter(
            variable => !process.env[variable]
        );

        if (missingVariables.length > 0) {
            throw new Error(
                `Missing environment variables: ${missingVariables.join(', ')}`
            );
        }

        // Validate server port.
        if (
            !Number.isInteger(PORT) ||
            PORT < 1 ||
            PORT > 65535
        ) {
            throw new Error('Invalid server port configuration');
        }

        // Connect to MongoDB before starting Express.
        await connectDB();

        server = app.listen(PORT, () => {
            console.log(`MailFlow API running on port ${PORT}`);
        });

        server.on('error', error => {
            console.error('Server error:', error.message);
            process.exit(1);
        });

    } catch (error) {
        console.error('MailFlow startup failed:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown.
async function shutdown(signal) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.log(`${signal} received. Shutting down MailFlow...`);

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close(error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            console.log('HTTP server closed.');
        }

        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('MongoDB connection closed.');
        }

        console.log('MailFlow shutdown completed.');
        process.exit(0);

    } catch (error) {
        console.error('Shutdown failed:', error.message);
        process.exit(1);
    }
}

// Handle termination signals.
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the application.
startServer();
