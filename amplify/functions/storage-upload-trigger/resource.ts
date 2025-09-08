import { defineFunction } from '@aws-amplify/backend';

export const storageUploadTrigger = defineFunction({
  name: 'storage-upload-trigger',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: 'storage',
});