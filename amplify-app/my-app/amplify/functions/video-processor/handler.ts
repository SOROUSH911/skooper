import type { S3Handler, S3EventRecord } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({});

interface VideoMetadata {
  originalKey: string;
  processedAt: string;
  fileSize?: number;
  duration?: number;
  format: string;
  width?: number;
  height?: number;
  codec?: string;
}

export const handler: S3Handler = async (event) => {
  console.log('Video processor triggered:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    try {
      await processVideo(record);
    } catch (error) {
      console.error(`Error processing ${record.s3.object.key}:`, error);
      // Continue processing other records even if one fails
    }
  }
};

async function processVideo(record: S3EventRecord) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  console.log(`Processing video: ${key} from bucket: ${bucket}`);
  
  // Skip if not a video file
  if (!isVideoFile(key)) {
    console.log(`Skipping non-video file: ${key}`);
    return;
  }
  
  // Skip if already processed (has .mp4 extension)
  if (key.endsWith('.mp4')) {
    console.log(`File already in MP4 format: ${key}`);
    return;
  }
  
  // Check if it's a WebM file from Chrome extension
  if (key.includes('.webm')) {
    console.log(`WebM file detected, needs conversion: ${key}`);
    
    // For now, we'll just copy the file with metadata
    // In production, you'd use FFmpeg Lambda Layer for actual conversion
    await copyWithMetadata(bucket, key);
  } else {
    // For other formats, just add metadata
    await addMetadata(bucket, key);
  }
}

async function copyWithMetadata(bucket: string, key: string) {
  try {
    // Get the original object
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const response = await s3Client.send(getCommand);
    
    // Get file size
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const headResponse = await s3Client.send(headCommand);
    
    // Create metadata
    const metadata: VideoMetadata = {
      originalKey: key,
      processedAt: new Date().toISOString(),
      fileSize: headResponse.ContentLength,
      format: 'webm', // Original format
      codec: 'vp8/vp9', // Common WebM codecs
    };
    
    // Create a processed filename
    const processedKey = key.replace('.webm', '-processed.webm');
    
    // Copy with metadata (in production, this would be the converted MP4)
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: processedKey,
      Body: response.Body as Readable,
      ContentType: 'video/webm',
      Metadata: {
        'original-key': key,
        'processed-at': metadata.processedAt,
        'file-size': String(metadata.fileSize || 0),
        'format': metadata.format,
      },
      // Add cache headers for better streaming
      CacheControl: 'max-age=31536000', // 1 year
      ContentDisposition: `inline; filename="${processedKey.split('/').pop()}"`,
    });
    
    await s3Client.send(putCommand);
    console.log(`Created processed version: ${processedKey}`);
    
    // Also create a metadata JSON file
    const metadataKey = key.replace(/\.[^/.]+$/, '') + '-metadata.json';
    const metadataCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: metadataKey,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
    });
    
    await s3Client.send(metadataCommand);
    console.log(`Created metadata file: ${metadataKey}`);
    
  } catch (error) {
    console.error(`Error processing ${key}:`, error);
    throw error;
  }
}

async function addMetadata(bucket: string, key: string) {
  try {
    // Get object metadata
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const headResponse = await s3Client.send(headCommand);
    
    // Create metadata
    const metadata: VideoMetadata = {
      originalKey: key,
      processedAt: new Date().toISOString(),
      fileSize: headResponse.ContentLength,
      format: getFileExtension(key),
    };
    
    // Create a metadata JSON file
    const metadataKey = key.replace(/\.[^/.]+$/, '') + '-metadata.json';
    const metadataCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: metadataKey,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
    });
    
    await s3Client.send(metadataCommand);
    console.log(`Created metadata file: ${metadataKey}`);
    
  } catch (error) {
    console.error(`Error adding metadata for ${key}:`, error);
    throw error;
  }
}

function isVideoFile(key: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
  return videoExtensions.some(ext => key.toLowerCase().endsWith(ext));
}

function getFileExtension(key: string): string {
  const parts = key.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}