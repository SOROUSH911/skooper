import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
// import { videoProcessor } from './functions/video-processor/resource';
import { storageUploadTrigger } from './functions/storage-upload-trigger/resource';
import { storageDeleteTrigger } from './functions/storage-delete-trigger/resource';
// import { data } from './data/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  storage,
  // videoProcessor,
  storageUploadTrigger,
  storageDeleteTrigger,
  // data,
});

// Grant storage permissions to all Lambda functions
const storageBucketArn = backend.storage.resources.bucket.bucketArn;

// Grant permissions to upload trigger
backend.storageUploadTrigger.resources.lambda.role?.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      's3:GetObject',
      's3:PutObject',
      's3:PutObjectAcl',
      's3:HeadObject',
    ],
    resources: [`${storageBucketArn}/*`],
  })
);

// Grant permissions to delete trigger
backend.storageDeleteTrigger.resources.lambda.role?.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      's3:DeleteObject',
      's3:ListBucket',
    ],
    resources: [
      storageBucketArn,
      `${storageBucketArn}/*`,
    ],
  })
);

// Grant permissions to video processor (uncomment when adding video processor)
// backend.videoProcessor.resources.lambda.role?.addToPrincipalPolicy(
//   new PolicyStatement({
//     effect: Effect.ALLOW,
//     actions: [
//       's3:GetObject',
//       's3:PutObject',
//       's3:DeleteObject',
//       's3:ListBucket',
//     ],
//     resources: [
//       storageBucketArn,
//       `${storageBucketArn}/*`,
//     ],
//   })
// );
