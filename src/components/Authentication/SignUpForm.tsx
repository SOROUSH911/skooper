"use client";

import * as React from "react";
import {
  Grid,
  Button,
  Box,
  Typography,
  FormControl,
  TextField,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SignUpOutput } from "aws-amplify/auth";
import { Visibility, VisibilityOff, Email, Lock } from "@mui/icons-material";

const SignUpForm: React.FC = () => {
  const router = useRouter();
  const { signUp, confirmSignUp, signIn, user } = useAuth();
  
  const [activeStep, setActiveStep] = React.useState(0);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
    confirmationCode: ""
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password validation
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await signUp(
        formData.email,  // Use email as username
        formData.password,
        formData.email
      );
      
      // Handle sign up result
      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setActiveStep(1); // Move to confirmation step
        setLoading(false);
      } else if (result.nextStep.signUpStep === 'DONE') {
        // Auto sign in if no confirmation needed
        await signIn(formData.email, formData.password);
        router.push('/');
      }
    } catch (err: any) {
      if (err.name === 'UsernameExistsException') {
        setError("An account with this email already exists");
      } else if (err.name === 'InvalidPasswordException') {
        setError("Password does not meet requirements. Use at least 8 characters, including uppercase, lowercase, numbers, and special characters.");
      } else if (err.name === 'InvalidParameterException') {
        setError("Invalid email address format");
      } else {
        setError(err.message || "Failed to sign up. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.confirmationCode) {
      setError("Please enter the confirmation code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await confirmSignUp(formData.email, formData.confirmationCode);
      
      // Auto sign in after confirmation
      await signIn(formData.email, formData.password);
      router.push('/');
    } catch (err: any) {
      if (err.name === 'CodeMismatchException') {
        setError("Invalid confirmation code. Please check and try again.");
      } else if (err.name === 'ExpiredCodeException') {
        setError("Confirmation code has expired. Please request a new one.");
      } else {
        setError(err.message || "Failed to confirm sign up. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setError(null);
      const { resendSignUpCode } = useAuth();
      await resendSignUpCode(formData.email);
      setError("Confirmation code has been resent to your email");
    } catch (err: any) {
      setError(err.message || "Failed to resend code. Please try again.");
    }
  };

  const steps = ['Create Account', 'Verify Email'];

  // Confirmation Step
  if (activeStep === 1) {
    return (
      <Box
        className="auth-main-wrapper sign-up-area"
        sx={{
          py: { xs: "60px", md: "80px", lg: "100px", xl: "135px" },
        }}
      >
        <Box
          sx={{
            maxWidth: "500px",
            mx: "auto !important",
            px: "12px",
          }}
        >
          <Box className="form-content">
            <Box className="title" sx={{ mb: 4 }}>
              <Typography variant="h3" sx={{ mb: "4px", fontSize: "28px" }}>
                Verify Your Email 📧
              </Typography>
              <Typography sx={{ mb: "20px" }}>
                We've sent a verification code to {formData.email}
              </Typography>
              
              <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {error && (
              <Alert 
                severity={error.includes("resent") ? "success" : "error"} 
                sx={{ mb: 2 }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleConfirmSignUp}>
              <FormControl fullWidth sx={{ mb: "25px" }}>
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
                  Confirmation Code
                </Typography>
                <TextField
                  variant="filled"
                  name="confirmationCode"
                  value={formData.confirmationCode}
                  onChange={handleInputChange}
                  placeholder="Enter 6-digit code"
                  autoFocus
                  inputProps={{ 
                    style: { 
                      textAlign: 'center', 
                      fontSize: '1.5rem', 
                      letterSpacing: '0.5rem' 
                    },
                    maxLength: 6
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      border: "1px solid #dfdfdf",
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                    },
                    "& .MuiInputBase-root::before": {
                      display: "none",
                    },
                    "& .MuiInputBase-root::after": {
                      display: "none",
                    },
                  }}
                />
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !formData.confirmationCode}
                sx={{
                  borderRadius: "7px",
                  padding: "15px 48px",
                  fontSize: "16px",
                  fontWeight: "700",
                  textTransform: "capitalize",
                  mb: 2
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify & Continue'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={handleResendCode}
                sx={{ textTransform: 'none', mb: 2 }}
              >
                Resend Confirmation Code
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => setActiveStep(0)}
                sx={{ textTransform: 'none' }}
              >
                Back to Sign Up
              </Button>
            </form>
          </Box>
        </Box>
      </Box>
    );
  }

  // Main Sign Up Form
  return (
    <>
      <Box
        className="auth-main-wrapper sign-up-area"
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
                  src="/images/sign-up.jpg"
                  alt="sign-up-image"
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
                  className="title"
                  sx={{
                    paddingLeft: { xs: "0", lg: "30px" },
                  }}
                >
                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: "28px", md: "36px", lg: "42px" },
                      mb: "20px",
                    }}
                  >
                    Create Account 🚀
                  </Typography>
                  
                  <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {steps.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, mx: { lg: "30px" } }}>
                    {error}
                  </Alert>
                )}

                <Box
                  sx={{
                    paddingLeft: { xs: "0", lg: "30px" },
                    paddingRight: { xs: "0", lg: "30px" },
                  }}
                >
                  <form onSubmit={handleSignUp}>
                    <FormControl fullWidth sx={{ mb: "20px" }}>
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
                        Email Address *
                      </Typography>
                      <TextField
                        variant="filled"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            border: "1px solid #dfdfdf",
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                          },
                          "& .MuiInputBase-root::before": {
                            display: "none",
                          },
                          "& .MuiInputBase-root::after": {
                            display: "none",
                          },
                        }}
                      />
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: "20px" }}>
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
                        Password *
                      </Typography>
                      <TextField
                        variant="filled"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Create a password"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            border: "1px solid #dfdfdf",
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                          },
                          "& .MuiInputBase-root::before": {
                            display: "none",
                          },
                          "& .MuiInputBase-root::after": {
                            display: "none",
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                        At least 8 characters with uppercase, lowercase, numbers, and symbols
                      </Typography>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: "25px" }}>
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
                        Confirm Password *
                      </Typography>
                      <TextField
                        variant="filled"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            border: "1px solid #dfdfdf",
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                          },
                          "& .MuiInputBase-root::before": {
                            display: "none",
                          },
                          "& .MuiInputBase-root::after": {
                            display: "none",
                          },
                        }}
                      />
                    </FormControl>

                    <FormControl fullWidth>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        sx={{
                          borderRadius: "7px",
                          padding: "15px 48px",
                          fontSize: "16px",
                          fontWeight: "700",
                          textTransform: "capitalize",
                          color: "#fff !important",
                        }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Create Account'}
                      </Button>
                    </FormControl>
                  </form>

                  <Box className="social-btn" sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      className="border bg-white"
                      sx={{
                        borderRadius: "8px",
                        padding: "11px 20px",
                        fontSize: "16px",
                        fontWeight: "500",
                        textTransform: "capitalize",
                        borderColor: "#dfdfdf",
                        color: "#64748b",
                      }}
                      disabled
                    >
                      <Image
                        src="/images/google.svg"
                        alt="google"
                        width={25}
                        height={25}
                      />
                      <Box sx={{ ml: "8px" }}>Sign up with Google</Box>
                    </Button>
                  </Box>

                  <Typography sx={{ mt: "20px", textAlign: "center" }}>
                    Already have an account?{" "}
                    <Link
                      href="/authentication/sign-in"
                      className="text-primary"
                      style={{ textDecoration: "none", fontWeight: "500" }}
                    >
                      Sign in
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

export default SignUpForm;