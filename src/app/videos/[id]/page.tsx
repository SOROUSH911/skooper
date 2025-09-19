"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { getUrl } from 'aws-amplify/storage';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Avatar,
  TextField,
  Divider,
  Chip,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Collapse,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  Grid,
} from "@mui/material";
import {
  ThumbUp,
  ThumbUpOutlined,
  ThumbDown,
  ThumbDownOutlined,
  Share,
  Download,
  MoreVert,
  PlayArrow,
  Pause,
  VolumeUp,
  Fullscreen,
  Settings,
  ClosedCaption,
  Speed,
  ContentCopy,
  Flag,
  Bookmark,
  BookmarkBorder,
} from "@mui/icons-material";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: Comment[];
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
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [videoUrl, setVideoUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [liked, setLiked] = React.useState(false);
  const [disliked, setDisliked] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [showDescription, setShowDescription] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  // Mock video data
  const videoData = {
    title: decodeURIComponent(params.id as string).replace(/^\d+-/, ''),
    views: '1.2K',
    uploadDate: new Date().toLocaleDateString(),
    likes: 89,
    author: user?.username || 'Demo User',
    subscribers: '5.2K',
    description: `This is an amazing video that showcases incredible content. 

In this video, you'll learn:
• Key concepts and fundamentals
• Best practices and tips
• Real-world applications
• Advanced techniques

Don't forget to like and subscribe for more content!

Links and Resources:
📚 Documentation: https://example.com/docs
💻 Source Code: https://github.com/example
🐦 Twitter: @example

Timestamps:
00:00 Introduction
02:30 Main Content
15:45 Advanced Topics
22:10 Conclusion

#video #tutorial #learning #coding`,
    tags: ['Tutorial', 'Technology', 'Educational', 'Programming'],
  };

  // Mock transcription data
  const transcriptionData = [
    { time: '00:00', text: 'Welcome to this comprehensive tutorial where we explore amazing concepts.' },
    { time: '00:15', text: 'Today we will be covering several important topics that will help you understand the fundamentals.' },
    { time: '00:30', text: 'Let\'s start with the basics and gradually move to more advanced concepts.' },
    { time: '01:00', text: 'The first thing you need to understand is how this technology works under the hood.' },
    { time: '01:30', text: 'As you can see on the screen, we have a demonstration of the key features.' },
    { time: '02:00', text: 'Now, let\'s dive deeper into the implementation details.' },
    { time: '02:30', text: 'This section covers the main content of our tutorial.' },
    { time: '03:00', text: 'Pay attention to these important points as they will be crucial for your understanding.' },
  ];

  // Mock comments data
  const [comments, setComments] = React.useState<Comment[]>([
    {
      id: '1',
      author: 'John Doe',
      avatar: 'J',
      content: 'Great video! This really helped me understand the concepts better. Keep up the good work!',
      timestamp: '2 hours ago',
      likes: 45,
      replies: [
        {
          id: '1-1',
          author: videoData.author,
          avatar: 'D',
          content: 'Thanks for watching! Glad it helped!',
          timestamp: '1 hour ago',
          likes: 12,
          replies: [],
        },
      ],
    },
    {
      id: '2',
      author: 'Sarah Smith',
      avatar: 'S',
      content: 'Could you make a follow-up video on advanced techniques?',
      timestamp: '5 hours ago',
      likes: 23,
      replies: [],
    },
    {
      id: '3',
      author: 'Mike Johnson',
      avatar: 'M',
      content: 'The explanation at 15:45 was particularly helpful. Thanks for the clear breakdown!',
      timestamp: '1 day ago',
      likes: 67,
      replies: [
        {
          id: '3-1',
          author: 'Emma Wilson',
          avatar: 'E',
          content: 'I agree! That part clarified a lot for me too.',
          timestamp: '12 hours ago',
          likes: 8,
          replies: [],
        },
      ],
    },
  ]);

  React.useEffect(() => {
    const loadVideo = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Construct the full path with user ID
        const videoPath = `videos/${user.userId}/${params.id}`;
        const urlResult = await getUrl({
          path: videoPath,
          options: {
            validateObjectExistence: false,
            expiresIn: 3600
          }
        });
        setVideoUrl(urlResult.url.toString());
      } catch (error) {
        console.error('Error loading video:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id && user) {
      loadVideo();
    }
  }, [params.id, user]);

  const handleLike = () => {
    if (disliked) setDisliked(false);
    setLiked(!liked);
  };

  const handleDislike = () => {
    if (liked) setLiked(false);
    setDisliked(!disliked);
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      author: user?.username || 'You',
      avatar: user?.username?.[0].toUpperCase() || 'Y',
      content: commentText,
      timestamp: 'Just now',
      likes: 0,
      replies: [],
    };
    
    setComments([newComment, ...comments]);
    setCommentText('');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading video...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Full-width Video Player - Auto-sizing container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'black',
          maxHeight: '80vh', // Limit maximum height
        }}
      >
        <video
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '80vh',
            display: 'block',
            objectFit: 'contain'
          }}
          controls
          autoPlay
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </Box>

      {/* Content below video */}
      <Box sx={{ flex: 1, overflow: 'auto', maxWidth: '1800px', mx: 'auto', width: '100%', p: { xs: 2, md: 3 } }}>
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Video Title and Actions */}
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              {videoData.title}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {videoData.views} views • {videoData.uploadDate}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  startIcon={liked ? <ThumbUp /> : <ThumbUpOutlined />}
                  onClick={handleLike}
                  sx={{ textTransform: 'none' }}
                  variant={liked ? 'contained' : 'outlined'}
                  size="small"
                >
                  {videoData.likes + (liked ? 1 : 0)}
                </Button>
                
                <Button
                  startIcon={disliked ? <ThumbDown /> : <ThumbDownOutlined />}
                  onClick={handleDislike}
                  sx={{ textTransform: 'none' }}
                  variant={disliked ? 'contained' : 'outlined'}
                  size="small"
                >
                  Dislike
                </Button>
                
                <Button
                  startIcon={<Share />}
                  onClick={handleShare}
                  sx={{ textTransform: 'none' }}
                  variant="outlined"
                  size="small"
                >
                  Share
                </Button>
                
                <Button
                  startIcon={<Download />}
                  sx={{ textTransform: 'none' }}
                  variant="outlined"
                  size="small"
                  href={videoUrl}
                  download
                >
                  Download
                </Button>
                
                <IconButton onClick={handleSave} size="small">
                  {saved ? <Bookmark /> : <BookmarkBorder />}
                </IconButton>
                
                <IconButton onClick={handleMenuClick} size="small">
                  <MoreVert />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleMenuClose}>
                    <Flag sx={{ mr: 1 }} /> Report
                  </MenuItem>
                  <MenuItem onClick={handleMenuClose}>
                    <ContentCopy sx={{ mr: 1 }} /> Copy link
                  </MenuItem>
                </Menu>
              </Box>
            </Box>

            {/* Channel Info and Description */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 48, height: 48 }}>
                      {videoData.author[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {videoData.author}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {videoData.subscribers} subscribers
                      </Typography>
                    </Box>
                  </Box>
                  <Button variant="contained" sx={{ textTransform: 'none' }}>
                    Subscribe
                  </Button>
                </Box>

                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-line',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: showDescription ? 'unset' : 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {videoData.description}
                  </Typography>
                  <Button 
                    onClick={() => setShowDescription(!showDescription)}
                    sx={{ textTransform: 'none', mt: 1 }}
                    size="small"
                  >
                    {showDescription ? 'Show less' : 'Show more'}
                  </Button>
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {videoData.tags.map((tag) => (
                    <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Tabs for Transcription and Comments */}
            <Paper sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                <Tab label="Comments" />
                <Tab label="Transcription" />
              </Tabs>
              
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 2 }}>
                  {/* Add Comment */}
                  {user && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <Avatar>{user.username?.[0].toUpperCase()}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          variant="outlined"
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                          <Button onClick={() => setCommentText('')}>Cancel</Button>
                          <Button 
                            variant="contained" 
                            onClick={handleAddComment}
                            disabled={!commentText.trim()}
                          >
                            Comment
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Comments List */}
                  <List>
                    {comments.map((comment) => (
                      <React.Fragment key={comment.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar>{comment.avatar}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box>
                                <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>
                                  {comment.author}
                                </Typography>
                                <Typography variant="caption" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                                  {comment.timestamp}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box component="span" sx={{ display: 'block' }}>
                                <Typography component="span" variant="body2" sx={{ display: 'block', mt: 1 }}>
                                  {comment.content}
                                </Typography>
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                  <IconButton size="small">
                                    <ThumbUpOutlined fontSize="small" />
                                  </IconButton>
                                  <Typography variant="caption" component="span">{comment.likes}</Typography>
                                  <Button 
                                    size="small" 
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  >
                                    Reply
                                  </Button>
                                </Box>
                                
                                {/* Replies */}
                                {comment.replies.length > 0 && (
                                  <Box component="span" sx={{ display: 'block', ml: 6, mt: 2 }}>
                                    {comment.replies.map((reply) => (
                                      <Box key={reply.id} component="span" sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                                          {reply.avatar}
                                        </Avatar>
                                        <Box component="span" sx={{ display: 'block' }}>
                                          <Typography variant="caption" component="span" sx={{ fontWeight: 600 }}>
                                            {reply.author}
                                          </Typography>
                                          <Typography variant="caption" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                                            {reply.timestamp}
                                          </Typography>
                                          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                                            {reply.content}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Video Transcription
                  </Typography>
                  <List>
                    {transcriptionData.map((item, index) => (
                      <ListItem key={index} sx={{ py: 1 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            minWidth: 60, 
                            color: 'primary.main',
                            fontWeight: 600,
                            mr: 2 
                          }}
                        >
                          {item.time}
                        </Typography>
                        <Typography variant="body2">
                          {item.text}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2, display: 'block' }}>
                    Note: This is an auto-generated transcription and may contain errors.
                  </Typography>
                </Box>
              </TabPanel>
            </Paper>
        </Grid>

        {/* Sidebar - Related Videos */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ px: { xs: 2, md: 0 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Related Videos
            </Typography>
            
            {/* Mock related videos */}
            {[1, 2, 3, 4, 5].map((i) => (
              <Card
                key={i}
                sx={{
                  display: 'flex',
                  mb: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <Box
                  sx={{
                    width: 168,
                    height: 94,
                    bgcolor: 'grey.300',
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    {Math.floor(Math.random() * 30)}:{String(Math.floor(Math.random() * 60)).padStart(2, '0')}
                  </Box>
                </Box>
                <CardContent sx={{ p: 1.5, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Related Video {i} - Amazing Content
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Channel Name
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {Math.floor(Math.random() * 100)}K views • {Math.floor(Math.random() * 30)} days ago
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>
      </Grid>
      </Box>
    </Box>
  );
}

