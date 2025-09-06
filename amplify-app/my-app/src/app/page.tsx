import * as React from "react";
import { Box, Typography, Paper, Button, Card, CardContent } from "@mui/material";

export default function Home() {
  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          🎉 Welcome to Your New App!
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>
          You're all set up and ready to build amazing features with your new component-first template.
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          🚀 Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" size="large">
            Create Something
          </Button>
          <Button variant="outlined" size="large">
            View Dashboard
          </Button>
          <Button variant="outlined" size="large">
            Settings
          </Button>
        </Box>
      </Paper>

      {/* Stats and Getting Started */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                📊 Your Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body1">Items: 0</Typography>
                <Typography variant="body1">Views: 0</Typography>
                <Typography variant="body1">Users: 1</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                📝 Getting Started
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">☐ Set up your profile</Typography>
                <Typography variant="body2">☐ Create your first item</Typography>
                <Typography variant="body2">☐ Explore advanced features</Typography>
                <Typography variant="body2">☐ Invite team members</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Pro Tip */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 4,
          border: '1px solid',
          borderColor: 'warning.light',
          backgroundColor: 'warning.50',
          borderRadius: 2
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          💡 Pro Tip
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Ask AI to add new features! Try saying "Add a contact form" or "Create a user dashboard" and 
          watch the magic happen with our hidden component library.
        </Typography>
      </Paper>
    </Box>
  );
}