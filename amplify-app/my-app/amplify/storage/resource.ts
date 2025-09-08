import { defineStorage, defineFunction } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'userVideos',
  access: (allow) => ({
    'videos/*': [
      // Allow all authenticated users to upload, read, and delete videos
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
  triggers: {
    onUpload: defineFunction({
      entry: './on-upload-handler.ts'
    }),
    onDelete: defineFunction({
      entry: './on-delete-handler.ts'
    })
  }
});