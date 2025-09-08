import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For now, we'll just receive the video and return success
    // The actual upload will be handled client-side using Amplify Storage
    
    // Parse the form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const timestamp = formData.get('timestamp') as string;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // For now, just return success with file info
    // The actual S3 upload should be done from the client side
    return NextResponse.json({
      success: true,
      message: 'Video received. Please use the client-side upload for S3.',
      fileName: videoFile.name,
      size: videoFile.size,
      timestamp: timestamp || Date.now(),
      note: 'To properly upload to S3, use the Amplify Storage API from the client side'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process video. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}