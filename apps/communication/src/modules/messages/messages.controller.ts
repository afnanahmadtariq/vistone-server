import { Request, Response } from 'express';
import { Message } from '../../models/message.model';
import prisma from '../../lib/prisma';

// GET /messages/media?channelId=xxx&cursor=xxx&limit=50
// Returns messages that contain attachments (for the media sidebar)
export async function getChannelMediaHandler(req: Request, res: Response) {
    try {
        const { channelId, cursor, limit = '50', fileType } = req.query;

        if (!channelId) {
            res.status(400).json({ error: 'channelId is required' });
            return;
        }

        const pageLimit = Math.min(parseInt(limit as string, 10) || 50, 100);

        const query: Record<string, unknown> = {
            channelId: channelId as string,
            isDeleted: false,
            'attachments.0': { $exists: true }, // only messages with attachments
        };

        // Optionally filter by fileType (image, video, audio, document, etc.)
        if (fileType) {
            query['attachments.fileType'] = fileType as string;
        }

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor as string) };
        }

        const messages = await Message
            .find(query)
            .sort({ createdAt: -1 })
            .limit(pageLimit)
            .lean();

        // Flatten attachments with message context
        const media = messages.flatMap((msg: any) =>
            (msg.attachments || []).map((att: any) => ({
                ...att,
                messageId: msg._id?.toString() || msg.id,
                senderId: msg.senderId,
                channelId: msg.channelId,
                sentAt: msg.createdAt,
            }))
        );

        const hasMore = messages.length === pageLimit;
        const nextCursor = hasMore && messages.length > 0
            ? (messages[messages.length - 1] as any).createdAt.toISOString()
            : null;

        res.json({ media, hasMore, nextCursor });
    } catch (error) {
        console.error('[messages] media fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch channel media' });
    }
}

// GET /messages?channelId=xxx&cursor=xxx&limit=50
export async function getMessagesHandler(req: Request, res: Response) {
    try {
        const { channelId, cursor, limit = '50' } = req.query;

        if (!channelId) {
            res.status(400).json({ error: 'channelId is required' });
            return;
        }

        const pageLimit = Math.min(parseInt(limit as string, 10) || 50, 100);

        // Build query
        const query: Record<string, unknown> = {
            channelId: channelId as string,
            isDeleted: false,
        };

        // Cursor-based pagination: fetch messages older than the cursor
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor as string) };
        }

        const messages = await Message
            .find(query)
            .sort({ createdAt: -1 })
            .limit(pageLimit)
            .lean();

        // Determine if there are more messages
        const hasMore = messages.length === pageLimit;
        const nextCursor = hasMore && messages.length > 0
            ? messages[messages.length - 1].createdAt.toISOString()
            : null;

        res.json({
            messages: messages.reverse(), // return in chronological order
            hasMore,
            nextCursor,
        });
    } catch (error) {
        console.error('[messages] fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
}

// GET /messages/:id
export async function getMessageByIdHandler(req: Request, res: Response) {
    try {
        const message = await Message.findById(req.params.id).lean();
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        res.json(message);
    } catch (error) {
        console.error('[messages] fetch by id error:', error);
        res.status(500).json({ error: 'Failed to fetch message' });
    }
}

// POST /messages  (REST fallback for sending messages without WebSocket)
export async function createMessageHandler(req: Request, res: Response) {
    try {
        const { channelId, senderId, content, type = 'text', attachments = [], mentions = [], replyTo } = req.body;

        if (!channelId || !senderId) {
            res.status(400).json({ error: 'channelId and senderId are required' });
            return;
        }

        // Verify membership
        const membership = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId, userId: senderId } },
        });
        if (!membership) {
            res.status(403).json({ error: 'Not a member of this channel' });
            return;
        }

        if (!content && attachments.length === 0) {
            res.status(400).json({ error: 'Message must have content or attachments' });
            return;
        }

        const message = await Message.create({
            channelId,
            senderId,
            content: content || '',
            type,
            attachments,
            mentions,
            replyTo: replyTo || undefined,
        });

        // Broadcast via Socket.IO if available
        try {
            const { getIO } = require('../../lib/socket');
            getIO().to(channelId).emit('new_message', message.toJSON());
        } catch { /* socket not initialized, skip broadcast */ }

        // Touch channel
        await prisma.chatChannel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() },
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('[messages] create error:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
}
