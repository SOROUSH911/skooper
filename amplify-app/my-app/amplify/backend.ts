import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { videoProcessor } from './functions/video-processor/resource';
// import { data } from './data/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  storage,
  videoProcessor,
  // data,
});

// Add additional trigger for WebM files specifically
backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED_PUT,
  new LambdaDestination(backend.videoProcessor.resources.lambda),
  {
    prefix: 'videos/',
    suffix: '.webm',
  }
);

// Grant the video processor permissions to read and write to the storage bucket
backend.videoProcessor.resources.lambda.role?.addToPrincipalPolicy({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      Resource: [
        backend.storage.resources.bucket.bucketArn,
        `${backend.storage.resources.bucket.bucketArn}/*`,
      ],
    },
  ],
});
