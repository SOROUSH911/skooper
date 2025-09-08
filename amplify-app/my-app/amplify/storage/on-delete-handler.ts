import type { S3Handler, S3EventRecord } from 'aws-lambda';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

export const handler: S3Handler = async (event) => {
  console.log(`Delete handler invoked for ${event.Records.length} file(s)`);
  
  for (const record of event.Records) {
    if (record.eventName.startsWith('ObjectRemoved:')) {
      try {
        await cleanupRelatedFiles(record);
      } catch (error) {
        console.error(`Error processing deletion for ${record.s3.object.key}:`, error);
        // Continue processing other records
      }
    }
  }
};

async function cleanupRelatedFiles(record: S3EventRecord) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  console.log(`Processing deletion: ${key} from bucket: ${bucket}`);
  
  // Skip if this is already a metadata or processed file
  if (key.includes('-metadata.json') || key.includes('-processed')) {
    console.log(`Skipping cleanup for metadata/processed file: ${key}`);
    return;
  }
  
  try {
    // Generate related file keys
    const baseKey = key.replace(/\.[^/.]+$/, ''); // Remove extension
    const relatedKeys = [
      `${baseKey}-metadata.json`,           // Metadata file
      `${baseKey}-processed.webm`,          // Processed WebM
      `${baseKey}-processed.mp4`,           // Processed MP4
      `${baseKey}-thumbnail.jpg`,           // Thumbnail if exists
    ];
    
    console.log(`Looking for related files to cleanup for: ${key}`);
    
    // Delete related files
    for (const relatedKey of relatedKeys) {
      try {
        // Check if file exists first
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: relatedKey,
          MaxKeys: 1,
        });
        
        const listResponse = await s3Client.send(listCommand);
        
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          // File exists, delete it
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucket,
            Key: relatedKey,
          });
          
          await s3Client.send(deleteCommand);
          console.log(`Deleted related file: ${relatedKey}`);
        }
      } catch (error) {
        // Ignore errors for individual file deletions
        console.log(`Could not delete ${relatedKey}: ${error}`);
      }
    }
    
    console.log(`Cleanup completed for: ${key}`);
    
  } catch (error) {
    console.error(`Failed to cleanup related files for ${key}:`, error);
    throw error;
  }
}