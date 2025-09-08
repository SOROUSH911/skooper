import { defineFunction } from '@aws-amplify/backend';

export const videoProcessor = defineFunction({
  name: 'video-processor',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 900, // 15 minutes for video processing
  memoryMB: 3008, // More memory for video processing
  environment: {
    OUTPUT_BUCKET: process.env.OUTPUT_BUCKET || '',
  }
});