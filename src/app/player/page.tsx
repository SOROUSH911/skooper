"use client";

import * as React from "react";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  LinearProgress,
  IconButton,
  Slider,
  Stack,
  Chip
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';

function PlayerContent() {
  const searchParams = useSearchParams();
  const videoUrl = searchParams.get('url');
  const title = searchParams.get('title') || 'Video Player';
  const expires = searchParams.get('expires');
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showControls, setShowControls] = React.useState(true);
  
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (!videoUrl) {
      setError('No video URL provided');
      return;
    }

    // Check if URL is expired
    if (expires && parseInt(expires) < Date.now()) {
      setError('This video link has expired. Please generate a new link.');
      return;
    }

    // Decode the URL
    try {
      const decodedUrl = decodeURIComponent(videoUrl);
      if (videoRef.current) {
        videoRef.current.src = decodedUrl;
      }
    } catch (err) {
      setError('Invalid video URL');
    }
  }, [videoUrl, expires]);

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
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (event: Event, newValue: number | number[]) => {
    const time = newValue as number;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
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
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (seconds: number) => {
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

  if (error) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            Error Loading Video
          </Typography>
          <Typography>{error}</Typography>
        </Paper>
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
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
          {decodeURIComponent(title)}
        </Typography>
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
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={handlePlayPause}
        />
      </Box>

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      )}

      {/* Controls */}
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
          max={duration}
          onChange={handleSeek}
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
            },
            '& .MuiSlider-rail': {
              opacity: 0.3,
            },
          }}
        />
        
        {/* Control buttons */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={handlePlayPause} sx={{ color: 'white' }}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          
          <IconButton onClick={() => skip(-10)} sx={{ color: 'white' }}>
            <SkipPreviousIcon />
          </IconButton>
          
          <IconButton onClick={() => skip(10)} sx={{ color: 'white' }}>
            <SkipNextIcon />
          </IconButton>
          
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
          
          <Typography sx={{ color: 'white', ml: 'auto', mr: 2 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
          
          <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Stack>
      </Box>
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