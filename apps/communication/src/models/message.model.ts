import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

// ─── Attachment Sub-document ───
export interface IAttachment {
    url: string;
    fileType: string;          // 'image' | 'video' | 'audio' | 'document' | 'gif' | 'voice_note'
    fileName?: string;
    fileSize?: number;         // in bytes
    thumbnailUrl?: string;     // for images/videos
}

const AttachmentSchema = new Schema<IAttachment>({
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    thumbnailUrl: { type: String },
}, { _id: false });

// ─── Mention Sub-document ───
export interface IMention {
    userId: string;
    displayName?: string;
}

const MentionSchema = new Schema<IMention>({
    userId: { type: String, required: true },
    displayName: { type: String },
}, { _id: false });

// ─── Reaction Sub-document ───
export interface IReaction {
    emoji: string;
    userId: string;
}

const ReactionSchema = new Schema<IReaction>({
    emoji: { type: String, required: true },
    userId: { type: String, required: true },
}, { _id: false });

// ─── Main Message Document ───
export interface IMessage extends MongoDocument {
    channelId: string;
    senderId: string;
    content?: string;          // text content (optional if attachment-only)
    type: string;              // 'text' | 'image' | 'video' | 'audio' | 'file' | 'gif' | 'voice_note' | 'system'
    attachments: IAttachment[];
    mentions: IMention[];
    reactions: IReaction[];
    replyTo?: string;          // the message _id being replied to
    isEdited: boolean;
    isDeleted: boolean;        // soft delete
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    channelId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    content: { type: String, default: '' },
    type: { type: String, required: true, default: 'text' },
    attachments: { type: [AttachmentSchema], default: [] },
    mentions: { type: [MentionSchema], default: [] },
    reactions: { type: [ReactionSchema], default: [] },
    replyTo: { type: String, default: undefined },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,   // auto createdAt + updatedAt
    collection: 'messages',
});

// ─── Critical Indexes ───
// Fast channel-based pagination: fetch latest 50 messages in a channel
MessageSchema.index({ channelId: 1, createdAt: -1 });
// Fast lookup for replies
MessageSchema.index({ replyTo: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
