import type { S3Handler, S3EventRecord } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, GetObjectTaggingCommand, PutObjectTaggingCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

interface VideoMetadata {
  originalKey: string;
  uploadedAt: string;
  processedAt?: string;
  fileSize?: number;
  contentType?: string;
  format?: string;
  needsProcessing?: boolean;
}

export const handler: S3Handler = async (event) => {
  console.log(`Upload handler invoked for ${event.Records.length} file(s)`);

  for (const record of event.Records) {
    if (record.eventName.startsWith('ObjectCreated:')) {
      try {
        await processUploadedVideo(record);
      } catch (error) {
        console.error(`Error processing upload for ${record.s3.object.key}:`, error);
        // Continue processing other records
      }
    }
  }
};

async function processUploadedVideo(record: S3EventRecord) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  console.log(`Processing uploaded video: ${key} from bucket: ${bucket}`);

  // Skip non-video files
  if (!isVideoFile(key)) {
    console.log(`Skipping non-video file: ${key}`);
    return;
  }

  // Skip metadata files and processed files to prevent recursion
  if (key.includes('-metadata.json') ||
      key.includes('-processed') ||
      key.includes('-thumbnail') ||
      key.endsWith('.json')) {
    console.log(`Skipping processed/metadata file to prevent recursion: ${key}`);
    return;
  }

  try {
    // Check if file has already been processed using tags
    try {
      const getTagsCommand = new GetObjectTaggingCommand({
        Bucket: bucket,
        Key: key,
      });
      const tagsResponse = await s3Client.send(getTagsCommand);

      // If file is already tagged as processed, skip it
      if (tagsResponse.TagSet?.some(tag => tag.Key === 'processed' && tag.Value === 'true')) {
        console.log(`File already processed, skipping: ${key}`);
        return;
      }
    } catch (error) {
      // If we can't get tags, continue processing (file might be new)
      console.log(`Could not get tags for ${key}, continuing with processing`);
    }
    // Get object metadata
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const headResponse = await s3Client.send(headCommand);

    const contentType = headResponse.ContentType || 'video/mp4';
    const fileSize = headResponse.ContentLength;

    // Check if it's a WebM file that needs processing
    const needsProcessing = key.toLowerCase().endsWith('.webm');

    // Create metadata object
    const metadata: VideoMetadata = {
      originalKey: key,
      uploadedAt: new Date().toISOString(),
      fileSize: fileSize,
      contentType: contentType,
      format: getFileExtension(key),
      needsProcessing: needsProcessing,
    };

    // If it's a WebM file, tag it for processing
    if (needsProcessing) {
      console.log(`WebM file detected, tagging for processing: ${key}`);

      // Add tags to indicate the file needs processing and has been seen
      const taggingCommand = new PutObjectTaggingCommand({
        Bucket: bucket,
        Key: key,
        Tagging: {
          TagSet: [
            { Key: 'processed', Value: 'true' },
            { Key: 'format', Value: 'webm' },
            { Key: 'needs-conversion', Value: 'true' },
            { Key: 'processed-at', Value: new Date().toISOString() },
          ],
        },
      });

      await s3Client.send(taggingCommand);
      console.log(`Tagged WebM file as processed: ${key}`);

      // Mark as processed in metadata
      metadata.processedAt = new Date().toISOString();
    }

    // Create metadata JSON file
    const metadataKey = key.replace(/\.[^/.]+$/, '') + '-metadata.json';
    const metadataCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: metadataKey,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(metadataCommand);
    console.log(`Created metadata file: ${metadataKey}`);

    // Log summary
    console.log(`Successfully processed upload:`, {
      key: key,
      size: `${(fileSize || 0) / (1024 * 1024)}MB`,
      format: metadata.format,
      needsProcessing: needsProcessing,
    });

  } catch (error) {
    console.error(`Failed to process upload for ${key}:`, error);
    throw error;
  }
}

function isVideoFile(key: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.3gp'];
  return videoExtensions.some(ext => key.toLowerCase().endsWith(ext));
}

function getFileExtension(key: string): string {
  const parts = key.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
}

// convert to mp4 from ffmpeg rn it has webm only support