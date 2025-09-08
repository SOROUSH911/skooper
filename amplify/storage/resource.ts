import { defineStorage } from '@aws-amplify/backend';
import { storageUploadTrigger } from '../functions/storage-upload-trigger/resource';
import { storageDeleteTrigger } from '../functions/storage-delete-trigger/resource';

export const storage = defineStorage({
  name: 'userVideos',
  access: (allow) => ({
    'videos/*': [
      // Allow all authenticated users to upload, read, and delete videos
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
  triggers: {
    onUpload: storageUploadTrigger,
    onDelete: storageDeleteTrigger,
  }
});