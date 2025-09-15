"use client";

import * as React from "react";
import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Slider,
  Stack,
  Chip,
  Button,
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
  Tooltip
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SettingsIcon from '@mui/icons-material/Settings';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getUrl } from 'aws-amplify/storage';
import { useAuth } from '@/contexts/AuthContext';

function IndividualPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const videoId = params.id as string;

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  // Video info state
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [videoTitle, setVideoTitle] = React.useState<string>('');

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [autoplay, setAutoplay] = React.useState(false);

  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Extract filename from path
  const extractFileName = (path: string) => {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/^\d+-/, '').replace(/\.[^/.]+$/, '');
  };

  // Load video data
  React.useEffect(() => {
    const loadVideo = async () => {
      if (!user || !videoId) {
        setError('Please sign in to view videos');
        return;
      }

      try {
        setError(null);

        // Construct the full path with user ID
        const videoPath = `videos/${user.userId}/${decodeURIComponent(videoId)}`;

        const urlResult = await getUrl({
          path: videoPath,
          options: {
            validateObjectExistence: false,
            expiresIn: 3600 // 1 hour
          }
        });

        setVideoUrl(urlResult.url.toString());
        setVideoTitle(extractFileName(videoId));
      } catch (error) {
        console.error('Error loading video:', error);
        setError('Failed to load video. Please check if the video exists.');
      }
      // Don't set isLoading to false here - let video events handle it
    };

    loadVideo();
  }, [videoId, user]);

  // Force load metadata when video URL is set
  React.useEffect(() => {
    if (videoRef.current && videoUrl) {
      const video = videoRef.current;

      // Reset states
      setDuration(0);
      setCurrentTime(0);

      // Force load metadata
      video.load();
    }
  }, [videoUrl]);

  // Check PiP support
  React.useEffect(() => {
    if ('pictureInPictureEnabled' in document) {
      setIsPipSupported(true);
    }
  }, []);

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

      // Loading is now disabled
    }
  };

  const handleError = () => {
    setError('Failed to load video. Please check the video format or try again later.');
  };

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

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
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

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
  }, [volume]);

  // Loading indicator removed - videos load directly

  if (error || !videoUrl) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Alert
          severity="error"
          sx={{ maxWidth: 500 }}
          action={
            <Button color="inherit" size="small" onClick={() => router.back()}>
              Go Back
            </Button>
          }
        >
          {error || 'Video not found'}
        </Alert>
      </Box>
    );
  }

  return (
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => router.back()} sx={{ color: 'white' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
              {videoTitle}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: 'white' }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              onClick={() => router.push('/videos')}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Video Library
            </Button>
          </Box>
        </Box>
      </Box>

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
          src={videoUrl}
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

              // Loading indicator removed
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
  step={0.1} // Smaller step for smoother movement
  onChange={handleSeek}
  onChangeCommitted={handleSeekEnd}
  onMouseDown={handleSeekStart}
  onTouchStart={handleSeekStart}
  valueLabelDisplay="auto" // Optional: Show value while dragging
  sx={{
    color: 'primary.main',
    height: 4,
    '& .MuiSlider-thumb': {
      width: 16,
      height: 16,
      backgroundColor: '#fff',
      border: '2px solid currentColor',
      transition: 'all 0.2s ease', // Smooth thumb movement
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
      transition: 'all 0.2s ease', // Smooth track updates
    },
    '& .MuiSlider-rail': {
      opacity: 0.28,
      height: 4,
      transition: 'all 0.2s ease', // Smooth rail updates
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

export default function IndividualPlayerPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'black' }}>
        <Typography sx={{ color: 'white' }}>Loading...</Typography>
      </Box>
    }>
      <IndividualPlayerContent />
    </Suspense>
  );
}