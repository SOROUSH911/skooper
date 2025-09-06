import * as React from "react";
import { Box, Typography, Paper, Card, CardContent, Chip, Avatar } from "@mui/material";

export default function News() {
  const newsItems = [
    {
      id: 1,
      title: "New Features Released!",
      description: "We've just launched amazing new capabilities that will revolutionize your workflow.",
      date: "2 hours ago",
      category: "Product",
      author: "Product Team",
      avatar: "P"
    },
    {
      id: 2,
      title: "System Maintenance Scheduled",
      description: "Planned maintenance window this weekend for performance improvements.",
      date: "5 hours ago",
      category: "System",
      author: "DevOps Team",
      avatar: "D"
    },
    {
      id: 3,
      title: "Welcome New Team Members",
      description: "We're excited to announce three new additions to our growing team.",
      date: "1 day ago",
      category: "Team",
      author: "HR Team",
      avatar: "H"
    },
    {
      id: 4,
      title: "Q4 Roadmap Preview",
      description: "Get a sneak peek at what we're building for the last quarter of the year.",
      date: "2 days ago",
      category: "Product",
      author: "Leadership",
      avatar: "L"
    }
  ];

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'Product': return 'primary';
      case 'System': return 'warning';
      case 'Team': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          📰 News & Updates
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Stay up to date with the latest announcements and updates
        </Typography>
      </Box>

      {/* News Feed */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {newsItems.map((item) => (
          <Card
            key={item.id}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                transform: 'translateX(4px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '14px' }}>
                    {item.avatar}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {item.author}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.date}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={item.category} 
                  size="small" 
                  color={getCategoryColor(item.category) as any}
                />
              </Box>
              
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {item.title}
              </Typography>
              
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Load More */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Load More Updates
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}