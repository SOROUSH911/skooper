"use client";

import * as React from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  IconButton,
  Slider,
  Stack,
  Chip,
  TextField,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import { list, getUrl } from 'aws-amplify/storage';
import { useAuth } from '@/contexts/AuthContext';

interface VideoItem {
  path: string;
  lastModified?: Date;
  size?: number;
  url?: string;
  title?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const urlFromParams = searchParams.get('url');
  const titleFromParams = searchParams.get('title') || 'Video Player';
  const expires = searchParams.get('expires');

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Player state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showControls, setShowControls] = React.useState(true);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [isPipSupported, setIsPipSupported] = React.useState(false);
  const [isSeeking, setIsSeeking] = React.useState(false);

  // Video source state
  const [currentVideoUrl, setCurrentVideoUrl] = React.useState<string | null>(urlFromParams);
  const [currentVideoTitle, setCurrentVideoTitle] = React.useState(titleFromParams);
  const [tabValue, setTabValue] = React.useState(urlFromParams ? 3 : 0); // Start with player if URL provided

  // Video library state
  const [videos, setVideos] = React.useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = React.useState(false);

  // URL input state
  const [urlInput, setUrlInput] = React.useState('');
  const [titleInput, setTitleInput] = React.useState('');

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [autoplay, setAutoplay] = React.useState(false);

  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Load video library
  React.useEffect(() => {
    if (user) {
      fetchVideos();
    }
  }, [user]);

  // Check PiP support
  React.useEffect(() => {
    if ('pictureInPictureEnabled' in document) {
      setIsPipSupported(true);
    }
  }, []);

  // Load video from URL params
  React.useEffect(() => {
    if (urlFromParams) {
      loadVideoFromUrl(urlFromParams, titleFromParams, expires);
    }
  }, [urlFromParams, titleFromParams, expires]);

  const fetchVideos = async () => {
    if (!user) return;

    try {
      setLoadingVideos(true);
      const result = await list({
        path: `videos/${user.userId}/`,
        options: {
          pageSize: 50
        }
      });

      const videoFiles = result.items.filter(item => {
        const filename = item.path.toLowerCase();
        return (
          !filename.includes('-metadata.json') &&
          !filename.includes('-processed.') &&
          !filename.includes('-thumbnail.') &&
          (filename.endsWith('.webm') ||
           filename.endsWith('.mp4') ||
           filename.endsWith('.mov') ||
           filename.endsWith('.avi') ||
           filename.endsWith('.mkv'))
        );
      });

      const videosWithUrls = await Promise.all(
        videoFiles.slice(0, 20).map(async (item) => {
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
              url: urlResult.url.toString(),
              title: extractFileName(item.path)
            } as VideoItem;
          } catch (error) {
            console.error('Error getting URL for', item.path, error);
            return {
              ...item,
              title: extractFileName(item.path)
            } as VideoItem;
          }
        })
      );

      setVideos(videosWithUrls);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const extractFileName = (path: string) => {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/^\d+-/, '').replace(/\.[^/.]+$/, '');
  };

  const loadVideoFromUrl = (url: string, title: string, expiresParam?: string | null) => {
    setError(null);

    // Check if URL is expired
    if (expiresParam && parseInt(expiresParam) < Date.now()) {
      setError('This video link has expired. Please generate a new link.');
      return;
    }

    try {
      const decodedUrl = decodeURIComponent(url);
      setCurrentVideoUrl(decodedUrl);
      setCurrentVideoTitle(title || 'Video');
      setTabValue(3); // Switch to player tab

      if (videoRef.current) {
        setIsLoading(true);
        videoRef.current.src = decodedUrl;
      }
    } catch (err) {
      setError('Invalid video URL');
    }
  };

  const loadVideoFromLibrary = (video: VideoItem) => {
    // Extract the video ID from the path for the dynamic route
    const pathParts = video.path.split('/');
    const videoId = pathParts[pathParts.length - 1];

    // Navigate to the individual player page
    router.push(`/player/${encodeURIComponent(videoId)}`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    const url = URL.createObjectURL(file);
    loadVideoFromUrl(url, file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    loadVideoFromUrl(urlInput.trim(), titleInput.trim() || 'Video from URL');
    setUrlInput('');
    setTitleInput('');
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;

      console.log('Video metadata loaded:', videoDuration);

      // Set duration if valid, stop loading regardless
      if (isFinite(videoDuration) && !isNaN(videoDuration) && videoDuration > 0) {
        setDuration(videoDuration);
        videoRef.current.playbackRate = playbackRate;
        console.log('Video ready for playback');
      } else {
        console.warn('Invalid video duration:', videoDuration);
        setDuration(0);
      }

      // Loading indicator removed
    }
  };

  const handleError = () => {
    setError('Failed to load video. Please check the video format or URL.');
  };

  // Update video source when currentVideoUrl changes
  React.useEffect(() => {
    if (videoRef.current && currentVideoUrl) {
      const video = videoRef.current;

      // Reset states
      setDuration(0);
      setCurrentTime(0);
      setError(null);

      video.src = currentVideoUrl;
      video.load(); // Force reload of video element

      // Try to load metadata immediately after setting source
      const tryLoadMetadata = () => {
        if (video.readyState >= 1) {
          const videoDuration = video.duration;
          if (isFinite(videoDuration) && videoDuration > 0) {
            console.log('Metadata loaded immediately:', videoDuration);
            setDuration(videoDuration);
            setIsLoading(false);
          }
        }
      };

      // Check immediately
      tryLoadMetadata();

      // If not loaded immediately, set up interval to keep checking
      const metadataInterval = setInterval(() => {
        if (video.readyState >= 1 && video.duration > 0) {
          console.log('Metadata loaded via interval:', video.duration);
          setDuration(video.duration);
          setIsLoading(false);
          clearInterval(metadataInterval);
        }
      }, 100);

      // Clear interval after 10 seconds to prevent infinite checking
      const timeout = setTimeout(() => {
        clearInterval(metadataInterval);
        if (duration === 0) {
          console.warn('Could not load video metadata after 10 seconds');
          setIsLoading(false);
        }
      }, 10000);

      return () => {
        clearInterval(metadataInterval);
        clearTimeout(timeout);
      };
    }
  }, [currentVideoUrl]);

  const handleSeek = (event: Event, newValue: number | number[]) => {
    const time = newValue as number;
    if (isFinite(time)) {
      setCurrentTime(time); // Update immediately for smooth visual feedback
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    }
  };

  const handleSeekStart = () => {
    // Disable automatic time updates while seeking
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    // Re-enable automatic time updates after seeking is complete
    setTimeout(() => {
      setIsSeeking(false);
    }, 100); // Small delay to prevent conflicts
  };

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const vol = newValue as number;
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current || !isPipSupported) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (tabValue !== 3) return; // Only work in player tab

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [tabValue, volume]);

  const formatTime = (seconds: number) => {
    // Handle invalid numbers
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);

    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Hide controls after 3 seconds of inactivity
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const calculateTimeLeft = () => {
    if (!expires) return null;
    const expiresAt = parseInt(expires);
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) return 'Expired';

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Expires soon';
  };

  // Main render
  if (!currentVideoUrl && tabValue === 3) {
    // If no video loaded but trying to show player, show video selection
    setTabValue(0);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: tabValue === 3 ? 'black' : 'background.default' }}>
      {tabValue !== 3 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            🎬 Enhanced Video Player
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>
            Load videos from your library, upload files, or enter a URL
          </Typography>

          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab icon={<VideoLibraryIcon />} label="My Videos" />
              <Tab icon={<CloudUploadIcon />} label="Upload File" />
              <Tab icon={<LinkIcon />} label="From URL" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {!user ? (
                <Alert severity="info">
                  Please sign in to access your video library.
                </Alert>
              ) : loadingVideos ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <LinearProgress sx={{ width: '50%' }} />
                </Box>
              ) : videos.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <VideoLibraryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No videos in your library
                  </Typography>
                  <Typography sx={{ color: 'text.secondary' }}>
                    Upload videos in the main videos page or use other tabs above
                  </Typography>
                </Box>
              ) : (
                <List>
                  {videos.map((video) => (
                    <React.Fragment key={video.path}>
                      <ListItem
                        component="button"
                        onClick={() => loadVideoFromLibrary(video)}
                        sx={{
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <PlayArrowIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {video.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {video.size && (
                              <Chip label={formatFileSize(video.size)} size="small" variant="outlined" />
                            )}
                            {video.lastModified && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {new Date(video.lastModified).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ textAlign: 'center' }}>
                <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Upload Video File
                </Typography>
                <Typography sx={{ color: 'text.secondary', mb: 3 }}>
                  Select a video file from your computer to play
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  size="large"
                  startIcon={<CloudUploadIcon />}
                >
                  Choose Video File
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    hidden
                  />
                </Button>
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                  Supported formats: MP4, WebM, MOV, AVI, MKV
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Load Video from URL
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Video URL"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                  />
                  <TextField
                    fullWidth
                    label="Video Title (optional)"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="My Video"
                  />
                  <Button
                    variant="contained"
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    size="large"
                  >
                    Load Video
                  </Button>
                </Stack>
              </Box>
            </TabPanel>
          </Paper>
        </Box>
      )}

      {/* Video Player */}
      {tabValue === 3 && currentVideoUrl && (
        <Box
          ref={containerRef}
          sx={{
            minHeight: '100vh',
            bgcolor: 'black',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
          onMouseMove={handleMouseMove}
        >
          {/* Header */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
              zIndex: 10,
              opacity: showControls ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                {currentVideoTitle}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Settings">
                  <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: 'white' }}>
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setTabValue(0)}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  Back to Library
                </Button>
              </Box>
            </Box>
            {expires && (
              <Chip
                label={calculateTimeLeft()}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
            )}
          </Box>

          {/* Error Display */}
          {error && (
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20 }}>
              <Alert severity="error" sx={{ maxWidth: 400 }}>
                {error}
                <Button onClick={() => setError(null)} sx={{ ml: 2 }}>Dismiss</Button>
              </Alert>
            </Box>
          )}

          {/* Video */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 'calc(100vh - 120px)',
                objectFit: 'contain'
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleLoadedMetadata}
              onLoadedData={() => {
                // Video data is loaded and ready to play
                if (videoRef.current) {
                  const videoDuration = videoRef.current.duration;

                  console.log('Video data loaded:', videoDuration);

                  if (isFinite(videoDuration) && !isNaN(videoDuration) && videoDuration > 0) {
                    setDuration(videoDuration);
                    console.log('Video fully ready for playback');
                  }
                }
              }}
              onCanPlay={() => {
                // Video can start playing
                if (videoRef.current) {
                  const videoDuration = videoRef.current.duration;

                  if (!isFinite(duration) && isFinite(videoDuration) && videoDuration > 0) {
                    setDuration(videoDuration);
                    console.log('Video can play, duration set');
                  }
                }
              }}
              onWaiting={() => {
                console.log('Video buffering...');
              }}
              onPlay={() => {
                setIsPlaying(true);
                console.log('Video started playing');
              }}
              onPause={() => {
                setIsPlaying(false);
                console.log('Video paused');
              }}
              onError={handleError}
              onClick={handlePlayPause}
              preload="metadata"
              crossOrigin="anonymous"
            />
          </Box>

          {/* Loading indicator removed */}

          {/* Enhanced Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
              p: 2,
              opacity: showControls ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          >
            {/* Progress bar */}
            <Slider
              value={currentTime}
              max={duration || 100}
              onChange={handleSeek}
              onChangeCommitted={handleSeekEnd}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              sx={{
                color: 'primary.main',
                height: 4,
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                  border: '2px solid currentColor',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(96, 93, 255, 0.16)',
                    width: 18,
                    height: 18,
                  },
                  '&:before': {
                    display: 'none',
                  },
                },
                '& .MuiSlider-track': {
                  border: 'none',
                  height: 4,
                },
                '& .MuiSlider-rail': {
                  opacity: 0.28,
                  height: 4,
                },
              }}
            />

            {/* Control buttons - New Layout */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              {/* Left side controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={handlePlayPause} sx={{ color: 'white' }} size="large">
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>

                <Tooltip title="Rewind 10s">
                  <IconButton onClick={() => skip(-10)} sx={{ color: 'white' }}>
                    <Replay10Icon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Forward 10s">
                  <IconButton onClick={() => skip(10)} sx={{ color: 'white' }}>
                    <Forward10Icon />
                  </IconButton>
                </Tooltip>

                {/* Playback speed */}
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={playbackRate}
                    onChange={(e) => changePlaybackRate(e.target.value as number)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)'
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white'
                      }
                    }}
                  >
                    <MenuItem value={0.5}>0.5x</MenuItem>
                    <MenuItem value={0.75}>0.75x</MenuItem>
                    <MenuItem value={1}>1x</MenuItem>
                    <MenuItem value={1.25}>1.25x</MenuItem>
                    <MenuItem value={1.5}>1.5x</MenuItem>
                    <MenuItem value={2}>2x</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Center - Time display */}
              <Typography sx={{ color: 'white', fontWeight: 500, fontSize: '14px' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>

              {/* Right side controls - Volume and Fullscreen */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isPipSupported && (
                  <Tooltip title="Picture in Picture">
                    <IconButton onClick={togglePictureInPicture} sx={{ color: 'white' }}>
                      <PictureInPictureIcon />
                    </IconButton>
                  </Tooltip>
                )}

                <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                  {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>

                <Slider
                  value={isMuted ? 0 : volume}
                  max={1}
                  step={0.1}
                  onChange={handleVolumeChange}
                  sx={{
                    width: 100,
                    color: 'white',
                    '& .MuiSlider-thumb': {
                      width: 12,
                      height: 12,
                    },
                  }}
                />

                <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Player Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />
              }
              label="Autoplay videos"
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Keyboard shortcuts: Space/K (play/pause), ←/→ (seek), ↑/↓ (volume), M (mute), F (fullscreen)
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function Player() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayerContent />
    </Suspense>
  );
}