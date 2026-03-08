import express, { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../lib/auth';

const router = express.Router();

// Configuration for R2
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || 'https://default.r2.cloudflarestorage.com',
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    },
});
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'vistone-media';

// Configuration for Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Since the client uploads directly, we now only accept a JSON body containing file metadata
router.post('/presign', async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') {
                authHeaders[k] = v;
            }
        }

        // Authenticate the request
        const user = await requireAuth({
            headers: authHeaders,
            token: req.headers.authorization?.replace('Bearer ', ''),
        });

        console.log(`[upload/presign] Generating upload URL for user: ${user.id}`);

        const {
            filename,
            mimetype,
            context = 'general', // 'wiki', 'profile', 'project', etc.
            compress = 'false', // explicitly asked to compress (stringified boolean usually)
            isAccountRelated = 'false'
        } = req.body;

        if (!filename || !mimetype) {
            res.status(400).json({ success: false, error: 'filename and mimetype are required' });
            return;
        }

        const shouldCompress = isAccountRelated === 'true' || compress === 'true' || context === 'profile';
        const isImage = mimetype.startsWith('image/');
        const isVideo = mimetype.startsWith('video/');

        const fileExtension = filename.split('.').pop() || '';
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        const objectKey = `vistone/${context}/${uniqueFilename}`;

        // Images needing optimization -> Cloudinary
        // Videos -> Cloudinary
        // Documents/User Uploads -> R2
        if (isVideo || (isImage && shouldCompress)) {
            // Generate Cloudinary signature
            const timestamp = Math.round((new Date).getTime() / 1000);
            const folder = `vistone/${context}`;
            const paramsToSign = {
                folder,
                timestamp,
                resource_type: isVideo ? 'video' : 'image',
                // For client-side uploads, quality/fetch_format transformations are typically applied on the delivery URL or via upload presets
            };

            const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET || '');

            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload`;

            res.status(200).json({
                success: true,
                provider: 'cloudinary',
                data: {
                    uploadUrl: cloudinaryUrl,
                    fields: {
                        api_key: process.env.CLOUDINARY_API_KEY,
                        timestamp,
                        signature,
                        folder,
                        resource_type: isVideo ? 'video' : 'image',
                    },
                    // The client won't know the exact final URL until cloudinary returns it in the response, but we can structure what we expect
                    expectedDeliveryUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload/v${timestamp}/${folder}/[public_id].${fileExtension}`
                }
            });
        } else {
            // Generate R2 Pre-signed URL
            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: objectKey,
                ContentType: mimetype,
            });

            // URL expires in 15 minutes (900 seconds)
            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

            const r2PublicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || 'https://pub-media.vistone.com';
            const finalUrl = `${r2PublicDomain}/${objectKey}`;

            res.status(200).json({
                success: true,
                provider: 'r2',
                data: {
                    uploadUrl: signedUrl,
                    finalUrl: finalUrl,
                    method: 'PUT',
                    headers: {
                        'Content-Type': mimetype
                    }
                }
            });
        }
    } catch (error) {
        console.error('Presign generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
    }
});

export default router;
