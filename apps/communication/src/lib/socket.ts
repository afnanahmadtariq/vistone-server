import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import prisma from './prisma';
import { Message, IReaction } from '../models/message.model';

// Extended socket type with auth data
interface AuthenticatedSocket extends Socket {
    userId: string;
    organizationId: string;
}

let io: Server;

export function getIO(): Server {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
}

// ─── Auth middleware: extract userId from handshake ───
async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
    try {
        // The frontend will pass userId and organizationId in the handshake auth
        // In production, this should validate a JWT token
        const { userId, organizationId } = socket.handshake.auth;
        if (!userId || !organizationId) {
            return next(new Error('Authentication required: userId and organizationId must be provided'));
        }
        // Attach to socket for later use
        (socket as AuthenticatedSocket).userId = userId;
        (socket as AuthenticatedSocket).organizationId = organizationId;
        next();
    } catch (_err) {
        next(new Error('Authentication failed'));
    }
}

export function initSocketServer(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // ─── Redis Adapter for horizontal scaling ───
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        const pubClient = new Redis(redisUrl);
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Socket.IO] Redis adapter connected');
    } catch (_err) {
        console.warn('[Socket.IO] Redis not available, falling back to in-memory adapter. This is fine for dev.');
    }

    // ─── Auth middleware ───
    io.use(authenticateSocket);

    // ─── Connection handler ───
    io.on('connection', (socket: Socket) => {
        const authSocket = socket as AuthenticatedSocket;
        const userId = authSocket.userId;
        const organizationId = authSocket.organizationId;
        console.log(`[Socket.IO] User ${userId} connected (org: ${organizationId})`);

        // ── Join Channel ──
        socket.on('join_channel', async (channelId: string) => {
            try {
                // SECURITY: Check membership in PostgreSQL
                const membership = await prisma.channelMember.findUnique({
                    where: { channelId_userId: { channelId, userId } },
                });
                if (!membership) {
                    socket.emit('error', { message: 'You are not a member of this channel' });
                    return;
                }
                socket.join(channelId);
                console.log(`[Socket.IO] User ${userId} joined channel ${channelId}`);
            } catch (err) {
                console.error('[Socket.IO] join_channel error:', err);
                socket.emit('error', { message: 'Failed to join channel' });
            }
        });

        // ── Leave Channel ──
        socket.on('leave_channel', (channelId: string) => {
            socket.leave(channelId);
        });

        // ── Send Message ──
        socket.on('send_message', async (data: {
            channelId: string;
            content?: string;
            type?: string;
            attachments?: Array<{ url: string; fileType: string; fileName?: string; fileSize?: number; thumbnailUrl?: string }>;
            mentions?: Array<{ userId: string; displayName?: string }>;
            replyTo?: string;
        }) => {
            try {
                const { channelId, content, type = 'text', attachments = [], mentions = [], replyTo } = data;

                // SECURITY: Verify membership
                const membership = await prisma.channelMember.findUnique({
                    where: { channelId_userId: { channelId, userId } },
                });
                if (!membership) {
                    socket.emit('error', { message: 'You are not a member of this channel' });
                    return;
                }

                // Validate: must have content or attachments
                if (!content && attachments.length === 0) {
                    socket.emit('error', { message: 'Message must have content or attachments' });
                    return;
                }

                // Write to MongoDB
                const message = await Message.create({
                    channelId,
                    senderId: userId,
                    content: content || '',
                    type,
                    attachments,
                    mentions,
                    replyTo: replyTo || undefined,
                });

                // Broadcast to the room (including sender)
                io.to(channelId).emit('new_message', message.toJSON());

                // Update channel's updatedAt in PostgreSQL (for sorting channels)
                await prisma.chatChannel.update({
                    where: { id: channelId },
                    data: { updatedAt: new Date() },
                });

            } catch (err) {
                console.error('[Socket.IO] send_message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // ── Edit Message ──
        socket.on('edit_message', async (data: { messageId: string; content: string }) => {
            try {
                const { messageId, content } = data;
                const message = await Message.findById(messageId);
                if (!message || message.senderId !== userId) {
                    socket.emit('error', { message: 'Cannot edit this message' });
                    return;
                }
                message.content = content;
                message.isEdited = true;
                await message.save();

                io.to(message.channelId).emit('message_edited', message.toJSON());
            } catch (err) {
                console.error('[Socket.IO] edit_message error:', err);
                socket.emit('error', { message: 'Failed to edit message' });
            }
        });

        // ── Delete Message (soft) ──
        socket.on('delete_message', async (data: { messageId: string }) => {
            try {
                const { messageId } = data;
                const message = await Message.findById(messageId);
                if (!message || message.senderId !== userId) {
                    socket.emit('error', { message: 'Cannot delete this message' });
                    return;
                }
                message.isDeleted = true;
                message.content = '';
                message.attachments = [];
                await message.save();

                io.to(message.channelId).emit('message_deleted', { messageId, channelId: message.channelId });
            } catch (err) {
                console.error('[Socket.IO] delete_message error:', err);
                socket.emit('error', { message: 'Failed to delete message' });
            }
        });

        // ── Add Reaction ──
        socket.on('add_reaction', async (data: { messageId: string; emoji: string }) => {
            try {
                const { messageId, emoji } = data;
                const message = await Message.findById(messageId);
                if (!message) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }
                // Prevent duplicate reaction from same user + emoji
                const existing = message.reactions.find(r => r.userId === userId && r.emoji === emoji);
                if (!existing) {
                    message.reactions.push({ userId, emoji });
                    await message.save();
                }
                io.to(message.channelId).emit('reaction_updated', { messageId, reactions: message.reactions });
            } catch (err) {
                console.error('[Socket.IO] add_reaction error:', err);
            }
        });

        // ── Remove Reaction ──
        socket.on('remove_reaction', async (data: { messageId: string; emoji: string }) => {
            try {
                const { messageId, emoji } = data;
                const message = await Message.findById(messageId);
                if (!message) return;
                message.reactions = message.reactions.filter(r => !(r.userId === userId && r.emoji === emoji)) as IReaction[];
                await message.save();
                io.to(message.channelId).emit('reaction_updated', { messageId, reactions: message.reactions });
            } catch (err) {
                console.error('[Socket.IO] remove_reaction error:', err);
            }
        });

        // ── Typing Indicator ──
        socket.on('typing_start', (channelId: string) => {
            socket.to(channelId).emit('user_typing', { userId, channelId });
        });

        socket.on('typing_stop', (channelId: string) => {
            socket.to(channelId).emit('user_stopped_typing', { userId, channelId });
        });

        // ── Disconnect ──
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] User ${userId} disconnected`);
        });
    });

    return io;
}
