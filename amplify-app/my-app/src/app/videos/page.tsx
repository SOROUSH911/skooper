"use client";

import * as React from "react";
import { list, uploadData, remove } from 'aws-amplify/storage';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent,
  CardMedia,
  CardActions, 
  Button,
  Grid,
  LinearProgress,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Avatar,
  Skeleton
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { getUrl } from 'aws-amplify/storage';

interface VideoItem {
  path: string;
  lastModified?: Date;
  size?: number;
  url?: string;
}

export default function Videos() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = React.useState<VideoItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadingFileName, setUploadingFileName] = React.useState<string>('');
  const [uploadingFileSize, setUploadingFileSize] = React.useState<number>(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchVideos = React.useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const result = await list({
        path: `videos/${user.userId}/`,
        options: {
          pageSize: 100
        }
      });
      
      // Get URLs for all videos
      const videosWithUrls = await Promise.all(
        result.items.map(async (item) => {
          try {
            const urlResult = await getUrl({
              path: item.path,
              options: {
                validateObjectExistence: false,
                expiresIn: 3600
              }
            });
            return {
              ...item,
              url: urlResult.url.toString()
            } as VideoItem;
          } catch (error) {
            console.error('Error getting URL for', item.path, error);
            return item as VideoItem;
          }
        })
      );
      
      setVideos(videosWithUrls);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle uploads from Chrome extension
  React.useEffect(() => {
    const handleExtensionUpload = async () => {
      // Check if we have a pending upload from the extension
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          const data = await chrome.storage.local.get('pendingVideoUpload');
          if (data.pendingVideoUpload && user) {
            console.log('Found pending video from extension');
            
            // Convert base64 to blob
            const base64Response = await fetch(data.pendingVideoUpload.base64data);
            const blob = await base64Response.blob();
            
            // Create File object
            const file = new File([blob], data.pendingVideoUpload.fileName, {
              type: data.pendingVideoUpload.type || 'video/webm'
            });
            
            // Upload using existing upload logic
            setUploading(true);
            setUploadProgress(0);
            setUploadingFileName(file.name);
            setUploadingFileSize(file.size);
            
            const timestamp = Date.now();
            const fileName = `${timestamp}-${file.name}`;
            const filePath = `videos/${user.userId}/${fileName}`;
            
            await uploadData({
              path: filePath,
              data: file,
              options: {
                contentType: file.type,
                onProgress: ({ transferredBytes, totalBytes }) => {
                  if (totalBytes) {
                    const progress = Math.round((transferredBytes / totalBytes) * 100);
                    setUploadProgress(progress);
                  }
                }
              }
            }).result;
            
            // Clear the pending upload
            await chrome.storage.local.remove('pendingVideoUpload');
            console.log('Extension video uploaded successfully');
            
            // Refresh videos
            await fetchVideos();
            
            setUploading(false);
            setUploadProgress(0);
            setUploadingFileName('');
            setUploadingFileSize(0);
          }
        } catch (error) {
          console.error('Error handling extension upload:', error);
        }
      }
    };

    // Check for extension upload when component mounts or user changes
    if (user) {
      handleExtensionUpload();
    }
  }, [user, fetchVideos]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadingFileName(file.name);
      setUploadingFileSize(file.size);

      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `videos/${user.userId}/${fileName}`;
      
      await uploadData({
        path: filePath,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const progress = Math.round((transferredBytes / totalBytes) * 100);
              setUploadProgress(progress);
            }
          }
        }
      }).result;

      await fetchVideos();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFileName('');
      setUploadingFileSize(0);
    }
  };

  const handleDelete = async (videoPath: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await remove({ path: videoPath });
      await fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    }
  };

  const extractFileName = (path: string) => {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    // Remove timestamp prefix if present
    return fileName.replace(/^\d+-/, '');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Redirect to sign in if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/authentication/sign-in');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          🎬 My Videos
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Upload and manage your video collection
        </Typography>
      </Box>

      {/* Upload Section */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          mb: 4,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <CloudUploadIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Upload New Video
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Supported formats: MP4, WebM, MOV
              </Typography>
            </Box>
          </Box>

          {!uploading ? (
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ textTransform: 'none', py: 1.5 }}
            >
              Choose Video to Upload
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleUpload}
                hidden
              />
            </Button>
          ) : (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                  Uploading: {uploadingFileName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  File size: {formatFileSize(uploadingFileSize)}
                </Typography>
              </Box>
              
              <Box sx={{ position: 'relative' }}>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ 
                    height: 12, 
                    borderRadius: 6,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 6,
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                    }
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600, 
                      color: uploadProgress > 50 ? 'white' : 'text.primary',
                      fontSize: '0.75rem'
                    }}
                  >
                    {uploadProgress}%
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                </Typography>
                {uploadProgress === 100 && (
                  <CircularProgress size={16} />
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Videos Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Skeleton variant="rectangular" height={180} />
                <CardContent>
                  <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : videos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.default'
          }}
        >
          <VideoLibraryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            No videos yet
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Upload your first video to get started!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {videos.map((video) => {
            // Extract just the filename part from the path for the URL
            const videoId = video.path.split('/').pop() || video.path;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={video.path}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  <Link 
                    href={`/videos/${encodeURIComponent(videoId)}`} 
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Box sx={{ position: 'relative', paddingTop: '56.25%', bgcolor: 'black' }}>
                  {video.url ? (
                    <video
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      controls
                      preload="metadata"
                    >
                      <source src={video.url + '#t=0.1'} type="video/mp4" />
                    </video>
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <PlayCircleOutlineIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                    </Box>
                  )}
                </Box>
                <CardContent>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }} noWrap>
                    {extractFileName(video.path)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={formatFileSize(video.size)} 
                      size="small" 
                      variant="outlined"
                    />
                    {video.lastModified && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {new Date(video.lastModified).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                  </Link>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(video.path);
                      }}
                      sx={{ ml: 'auto' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}