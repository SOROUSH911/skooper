"use client";

import * as React from "react";
import {
  Grid,
  Button,
  Box,
  Typography,
  FormControl,
  TextField,
  Collapse,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const SignInForm: React.FC = () => {
  const router = useRouter();
  const [showEmailLogin, setShowEmailLogin] = React.useState(false);

  // Mock login handler for social buttons
  const handleSocialLogin = () => {
    // Store mock user
    localStorage.setItem("mockUser", JSON.stringify({
      name: "Johnny",
      email: "johnny@example.com",
      avatar: "J"
    }));
    
    // Set authentication in localStorage (like Amplify does)
    localStorage.setItem("isAuthenticated", "true");
    
    // Redirect to home
    router.push("/");
  };

  // Mock login handler for form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store mock user
    localStorage.setItem("mockUser", JSON.stringify({
      name: "Johnny",
      email: "johnny@example.com",
      avatar: "J"
    }));
    
    // Set authentication in localStorage (like Amplify does)
    localStorage.setItem("isAuthenticated", "true");
    
    // Redirect to home
    router.push("/");
  };

  const toggleEmailLogin = () => {
    setShowEmailLogin(!showEmailLogin);
  };
  return (
    <>
      <Box
        className="auth-main-wrapper sign-in-area"
        sx={{
          py: { xs: "60px", md: "80px", lg: "100px", xl: "135px" },
        }}
      >
        <Box
          sx={{
            maxWidth: { sm: "500px", md: "1255px" },
            mx: "auto !important",
            px: "12px",
          }}
        >
          <Grid
            container
            alignItems="center"
            columnSpacing={{ xs: 1, sm: 2, md: 4, lg: 3 }}
          >
            <Grid size={{ xs: 12, md: 6, lg: 6, xl: 7 }}>
              <Box
                sx={{
                  display: { xs: "none", md: "block" },
                }}
              >
                <Image
                  src="/images/sign-in.jpg"
                  alt="sign-in-image"
                  width={646}
                  height={804}
                  style={{
                    borderRadius: "24px",
                  }}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 6, xl: 5 }}>
              <Box
                className="form-content"
                sx={{
                  paddingLeft: { xs: "0", lg: "10px" },
                }}
              >
                <Box
                  className="logo"
                  sx={{
                    mb: "23px",
                  }}
                >
                  <Image
                    src="/images/logo-big.svg"
                    alt="logo"
                    width={142}
                    height={38}
                  />
                  <Image
                    src="/images/white-logo.svg"
                    className="d-none"
                    alt="logo"
                    width={142}
                    height={38}
                  />
                </Box>

                <Box
                  className="title"
                  sx={{
                    mb: "23px",
                  }}
                >
                  <Typography
                    variant="h1"
                    className="text-black"
                    sx={{
                      fontSize: { xs: "22px", sm: "25px", lg: "28px" },
                      mb: "7px",
                      fontWeight: "600",
                    }}
                  >
                    Welcome back to Chill App!
                  </Typography>

                  <Typography sx={{ fontWeight: "500", fontSize: "16px" }}>
                    Sign In with social account or enter your details
                  </Typography>
                </Box>

                <Box
                  className="with-socials"
                  sx={{
                    mb: "20px",
                  }}
                >
                  <Button
                    variant="outlined"
                    className="border bg-white"
                    onClick={handleSocialLogin}
                    sx={{
                      width: "100%",
                      borderRadius: "8px",
                      padding: "10.5px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <Image
                      src="/images/icons/google.svg"
                      alt="google"
                      width={25}
                      height={25}
                    />
                    <Typography sx={{ fontWeight: 500, color: "#757575" }}>
                      Sign in with Google
                    </Typography>
                  </Button>
                </Box>

                {/* Divider with OR text */}
                <Box sx={{ my: 3, textAlign: "center" }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "text.secondary",
                      fontSize: "14px",
                      mb: 2
                    }}
                  >
                    ──── OR ────
                  </Typography>
                  
                  {/* Toggle link for email login */}
                  <Button
                    onClick={toggleEmailLogin}
                    sx={{
                      textTransform: "none",
                      color: "#605dff",
                      fontSize: "14px",
                      fontWeight: 500,
                      "&:hover": {
                        backgroundColor: "transparent",
                        textDecoration: "underline"
                      }
                    }}
                    startIcon={
                      <Typography sx={{ fontSize: "16px" }}>
                        {showEmailLogin ? "▲" : "▼"}
                      </Typography>
                    }
                  >
                    Use email instead
                  </Button>
                </Box>

                {/* Collapsible email form */}
                <Collapse in={showEmailLogin}>
                <Box 
                  component="form" 
                  onSubmit={handleFormSubmit}
                >
                  <Box mb="15px">
                    <FormControl fullWidth>
                      <Typography
                        component="label"
                        sx={{
                          fontWeight: "500",
                          fontSize: "14px",
                          mb: "10px",
                          display: "block",
                        }}
                        className="text-black"
                      >
                        Email Address
                      </Typography>

                      <TextField
                        label="example&#64;trezo.com"
                        variant="filled"
                        id="email"
                        name="email"
                        sx={{
                          "& .MuiInputBase-root": {
                            border: "1px solid #D5D9E2",
                            backgroundColor: "#fff",
                            borderRadius: "7px",
                          },
                          "& .MuiInputBase-root::before": {
                            border: "none",
                          },
                          "& .MuiInputBase-root:hover::before": {
                            border: "none",
                          },
                          "& .MuiInputBase-root:hover:hover:not(.Mui-disabled, .Mui-error)::before":
                            {
                              border: "none",
                            },
                        }}
                      />
                    </FormControl>
                  </Box>

                  <Box mb="15px">
                    <FormControl fullWidth>
                      <Typography
                        component="label"
                        sx={{
                          fontWeight: "500",
                          fontSize: "14px",
                          mb: "10px",
                          display: "block",
                        }}
                        className="text-black"
                      >
                        Password
                      </Typography>

                      <TextField
                        label="Type Password"
                        variant="filled"
                        type="password"
                        id="password"
                        name="password"
                        sx={{
                          "& .MuiInputBase-root": {
                            border: "1px solid #D5D9E2",
                            backgroundColor: "#fff",
                            borderRadius: "7px",
                          },
                          "& .MuiInputBase-root::before": {
                            border: "none",
                          },
                          "& .MuiInputBase-root:hover::before": {
                            border: "none",
                          },
                          "& .MuiInputBase-root:hover:hover:not(.Mui-disabled, .Mui-error)::before":
                            {
                              border: "none",
                            },
                        }}
                      />
                    </FormControl>
                  </Box>

                  <Box mb="20px">
                    <Link
                      href="/authentication/forgot-password/"
                      className="text-primary"
                      style={{
                        fontWeight: "500",
                      }}
                    >
                      Forgot Password?
                    </Link>
                  </Box>

                  <Box mb="20px">
                    <Button
                      type="submit"
                      variant="contained" 
                      sx={{
                        textTransform: "capitalize",
                        borderRadius: "6px",
                        fontWeight: "500",
                        fontSize: { xs: "13px", sm: "16px" },
                        padding: { xs: "10px 20px", sm: "10px 24px" },
                        color: "#fff !important",
                        boxShadow: "none",
                        width: "100%",

                        // Disabled state styles
                        "&.Mui-disabled": {
                          backgroundColor: "#000", // Light gray background
                          color: "#9e9e9e !important", // Darker gray text
                          cursor: "not-allowed",
                        },
                      }}
                    >
                      <i className="material-symbols-outlined mr-5">login</i>
                      Sign In
                    </Button>
                  </Box>

                  <Typography>
                    Don't have an account.{" "}
                    <Link
                      href="/authentication/sign-up/"
                      className="text-primary"
                      style={{
                        fontWeight: "500",
                      }}
                    >
                      Sign Up
                    </Link>
                  </Typography>
                </Box>
                </Collapse>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

export default SignInForm;
