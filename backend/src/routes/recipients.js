
import { Router } from 'express';
import Recipient from '../models/Recipient.js';
import { emailSchema } from '../utils/validation.js';

const router = Router();

// Forward asynchronous errors to the centralized error handler.
// Compatible with Express 4 and Express 5.
const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// Escape special regex characters in user search input.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Validate and normalize recipient names.
function normalizeName(value, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== 'string') {
    const error = new Error('Recipient name must be a string');
    error.status = 400;
    throw error;
  }

  const name = value.trim();

  if (name.length > 100) {
    const error = new Error('Recipient name cannot exceed 100 characters');
    error.status = 400;
    throw error;
  }

  return name;
}

// GET /api/recipients
// List active recipients or deleted recipients with pagination and search.
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const requestedPage = Number(req.query.page);
    const requestedLimit = Number(req.query.limit);

    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const limit =
      Number.isSafeInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 20;

    const filter = {
      isDeleted: req.query.trash === 'true'
    };

    const search = String(req.query.q || '').trim().slice(0, 80);

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        { email: { $regex: safeSearch, $options: 'i' } },
        { name: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      Recipient.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      Recipient.countDocuments(filter)
    ]);

    return res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  })
);

// POST /api/recipients
// Add a recipient or restore an existing deleted recipient.
router.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = req.body || {};

    const email = emailSchema.parse(body.email);
    const name = normalizeName(body.name);

    const existing = await Recipient.findOne({ email });

    if (existing?.isDeleted) {
      existing.isDeleted = false;
      existing.deletedAt = null;
      existing.name = name || existing.name;
      existing.subscribed = true;

      await existing.save();

      return res.status(200).json(existing);
    }

    if (existing) {
      return res.status(409).json({
        message: 'Recipient already exists'
      });
    }

    const recipient = await Recipient.create({
      name,
      email
    });

    return res.status(201).json(recipient);
  })
);

// POST /api/recipients/import
// Import recipients from CSV data.
router.post(
  '/import',
  asyncRoute(async (req, res) => {
    const rows = Array.isArray(req.body?.recipients)
      ? req.body.recipients.slice(0, 1000)
      : [];

    if (!rows.length) {
      return res.status(400).json({
        message: 'No recipients provided'
      });
    }

    let imported = 0;
    let restored = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const isString = typeof row === 'string';

        const email = emailSchema.parse(
          isString ? row : row?.email
        );

        const name = normalizeName(
          isString ? undefined : row?.name
        );

        const existing = await Recipient.findOne({ email });

        if (existing) {
          if (existing.isDeleted) {
            existing.isDeleted = false;
            existing.deletedAt = null;
            existing.name = name || existing.name;
            existing.subscribed = true;

            await existing.save();
            restored++;
          } else {
            skipped++;
          }

          continue;
        }

        await Recipient.create({
          email,
          name,
          subscribed: true
        });

        imported++;
      } catch (error) {
        // Skip invalid rows and duplicate records.
        skipped++;

        if (error.code !== 11000 && error.name !== 'ZodError' &&
          error.status !== 400 && error.name !== 'ValidationError') {
          throw error;
        }
      }
    }

    return res.json({
      imported,
      restored,
      skipped
    });
  })
);

// PATCH /api/recipients/:id
// Update recipient name or subscription status.
router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (body.name !== undefined) {
      update.name = normalizeName(body.name);
    }

    if (body.subscribed !== undefined) {
      if (typeof body.subscribed !== 'boolean') {
        return res.status(400).json({
          message: 'Subscribed must be a boolean'
        });
      }

      update.subscribed = body.subscribed;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        message: 'No valid fields provided for update'
      });
    }

    const item = await Recipient.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: false
      },
      {
        $set: update
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!item) {
      return res.status(404).json({
        message: 'Recipient not found'
      });
    }

    return res.json(item);
  })
);

// DELETE /api/recipients/:id
// Move recipient to trash.
router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const item = await Recipient.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: false
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      },
      {
        new: true
      }
    );

    if (!item) {
      return res.status(404).json({
        message: 'Recipient not found'
      });
    }

    return res.json({
      message: 'Recipient moved to trash'
    });
  })
);

// POST /api/recipients/:id/restore
// Restore a deleted recipient.
router.post(
  '/:id/restore',
  asyncRoute(async (req, res) => {
    const item = await Recipient.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: true
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!item) {
      return res.status(404).json({
        message: 'Deleted recipient not found'
      });
    }

    return res.json(item);
  })
);

// DELETE /api/recipients/:id/permanent
// Permanently delete a recipient already in trash.
router.delete(
  '/:id/permanent',
  asyncRoute(async (req, res) => {
    const result = await Recipient.deleteOne({
      _id: req.params.id,
      isDeleted: true
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        message: 'Deleted recipient not found'
      });
    }

    return res.json({
      message: 'Recipient permanently deleted'
    });
  })
);

export default router;
