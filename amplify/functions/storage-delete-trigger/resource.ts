import { defineFunction } from '@aws-amplify/backend';

export const storageDeleteTrigger = defineFunction({
  name: 'storage-delete-trigger',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: 'storage',
});