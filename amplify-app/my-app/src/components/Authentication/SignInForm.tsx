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
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SignInOutput } from "aws-amplify/auth";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const SignInForm: React.FC = () => {
  const router = useRouter();
  const { signIn, confirmSignIn, user } = useAuth();
  
  const [showEmailLogin, setShowEmailLogin] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = React.useState({
    username: "",
    password: ""
  });
  
  // MFA state
  const [signInStep, setSignInStep] = React.useState<string | null>(null);
  const [mfaCode, setMfaCode] = React.useState("");

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

  const handleSignInResult = async (result: SignInOutput) => {
    const { nextStep } = result;
    
    switch (nextStep.signInStep) {
      case 'DONE':
        setLoading(false);
        router.push('/');
        break;
        
      case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
      case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        setSignInStep(nextStep.signInStep);
        setLoading(false);
        break;
        
      case 'CONFIRM_SIGN_UP':
        setError('Please confirm your email address before signing in.');
        setLoading(false);
        router.push('/authentication/confirm-signup');
        break;
        
      default:
        setError('Unexpected authentication step. Please try again.');
        setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await signIn(formData.username, formData.password);
      await handleSignInResult(result);
    } catch (err: any) {
      if (err.name === 'UserNotFoundException') {
        setError("User not found. Please check your email/username.");
      } else if (err.name === 'NotAuthorizedException') {
        setError("Incorrect password. Please try again.");
      } else if (err.name === 'UserNotConfirmedException') {
        setError("Please confirm your email address before signing in.");
        router.push('/authentication/confirm-signup');
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mfaCode) {
      setError("Please enter the verification code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await confirmSignIn(mfaCode);
      await handleSignInResult(result);
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  };

  const toggleEmailLogin = () => {
    setShowEmailLogin(!showEmailLogin);
    setError(null);
  };

  // MFA Verification Screen
  if (signInStep && signInStep.includes('CONFIRM_SIGN_IN')) {
    return (
      <Box
        className="auth-main-wrapper sign-in-area"
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
            <Box className="title">
              <Typography variant="h3" sx={{ mb: "4px", fontSize: "28px" }}>
                Verification Required
              </Typography>
              <Typography sx={{ mb: "30px" }}>
                {signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE' && 'Enter the code sent to your phone'}
                {signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE' && 'Enter the code sent to your email'}
                {signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' && 'Enter the code from your authenticator app'}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleMfaSubmit}>
              <FormControl fullWidth sx={{ mb: "25px" }}>
                <TextField
                  label="Verification Code"
                  variant="filled"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  autoFocus
                  inputProps={{ 
                    style: { 
                      textAlign: 'center', 
                      fontSize: '1.5rem', 
                      letterSpacing: '0.5rem' 
                    } 
                  }}
                />
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !mfaCode}
                sx={{
                  borderRadius: "7px",
                  padding: "15px 48px",
                  fontSize: "16px",
                  fontWeight: "700",
                  textTransform: "capitalize",
                  mb: 2
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setSignInStep(null);
                  setMfaCode('');
                }}
                sx={{ textTransform: 'none' }}
              >
                Back to Sign In
              </Button>
            </form>
          </Box>
        </Box>
      </Box>
    );
  }

  // Main Sign In Screen
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
                  className="title"
                  sx={{
                    paddingLeft: { xs: "0", lg: "30px" },
                  }}
                >
                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: "28px", md: "36px", lg: "42px" },
                      mb: "30px",
                    }}
                  >
                    Welcome back 👋
                  </Typography>
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
                  <Box className="social-btn">
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
                      onClick={toggleEmailLogin}
                    >
                      Sign in with Email
                    </Button>
                  </Box>

                  <Collapse in={showEmailLogin}>
                    <Box sx={{ mt: 3 }}>
                      <form onSubmit={handleFormSubmit}>
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
                            Email or Username
                          </Typography>
                          <TextField
                            variant="filled"
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Enter your email or username"
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
                            Password
                          </Typography>
                          <TextField
                            variant="filled"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Enter your password"
                            InputProps={{
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
                            {loading ? <CircularProgress size={24} /> : 'Sign In'}
                          </Button>
                        </FormControl>
                      </form>
                    </Box>
                  </Collapse>

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
                      <Box sx={{ ml: "8px" }}>Sign in with Google</Box>
                    </Button>
                  </Box>

                  <Typography sx={{ mt: "25px", textAlign: "center" }}>
                    <Link
                      href="/authentication/forgot-password"
                      className="text-primary"
                      style={{ textDecoration: "none", fontWeight: "500" }}
                    >
                      Forgot your password?
                    </Link>
                  </Typography>

                  <Typography sx={{ mt: "20px", textAlign: "center" }}>
                    Don't have an account?{" "}
                    <Link
                      href="/authentication/sign-up"
                      className="text-primary"
                      style={{ textDecoration: "none", fontWeight: "500" }}
                    >
                      Sign up
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

export default SignInForm;