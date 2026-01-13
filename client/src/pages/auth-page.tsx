import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EyeIcon, EyeOffIcon, LockIcon, ShieldCheckIcon, UsersIcon, TrendingUpIcon, BarChart3Icon, BuildingIcon, ServerIcon, MonitorIcon, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";


export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize useQueryClient

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    email: "",
    department: "",
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<number | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresPasswordChange) {
          // Password change required
          toast({
            title: "Password Change Required",
            description: data.message || "You must change your password before continuing",
          });
          
          // Redirect to password change page
          setTimeout(() => {
            setLocation('/profile?changePassword=true');
          }, 100);
        } else if (data.requiresMfa) {
          // MFA verification required
          setMfaRequired(true);
          setMfaUserId(data.userId);
          toast({
            title: "MFA Required",
            description: data.message || "Please enter your verification code",
          });
        } else if (data.requiresMfaSetup) {
          // MFA setup required - ensure user data is loaded before redirect
          // Store user data from login response
          login(data);
          
          toast({
            title: "MFA Setup Required",
            description: "You must set up Two-Factor Authentication before accessing the system",
            variant: "default",
          });
          
          // Invalidate queries to refresh user state
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          // Small delay to ensure session is established
          setTimeout(() => {
            setLocation('/mfa-setup');
          }, 100);
        } else {
          // Login successful
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          toast({
            title: "Login successful",
            description: `Welcome back, ${data.firstName || data.username}!`,
          });
          setLocation('/'); // Changed navigate to setLocation for wouter
        }
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a complete 6-digit code from your SingleID app",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: mfaUserId, token: mfaCode }),
      });

      if (response.ok) {
        const userData = await response.json();
        
        console.log('MFA verification successful, user data received:', userData.user);
        
        // Verify we have complete user data
        if (!userData.user || !userData.user.username || !userData.user.id) {
          console.error('Incomplete user data received:', userData.user);
          throw new Error('Invalid user data received from server');
        }
        
        // Clear all queries first
        queryClient.clear();
        
        // Store user in auth context
        login(userData.user);
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${userData.user.firstName || userData.user.username}!`,
        });
        
        // Verify session is established
        setTimeout(async () => {
          try {
            console.log('Verifying session before redirect...');
            const verifyResponse = await fetch('/api/user', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            
            if (verifyResponse.ok) {
              const verifyUser = await verifyResponse.json();
              console.log('Session verified, user:', verifyUser.username);
              console.log('Redirecting to dashboard after MFA verification');
              window.location.href = '/';
            } else {
              console.error('Session verification failed:', verifyResponse.status);
              throw new Error('Session verification failed');
            }
          } catch (verifyError) {
            console.error('Session verification error:', verifyError);
            toast({
              title: "Session Error",
              description: "Please try logging in again.",
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.href = '/auth';
            }, 2000);
          }
        }, 800);
      } else {
        const errorData = await response.json();
        setMfaCode(""); // Clear the code on error
        toast({
          title: "Verification failed",
          description: errorData.message || "Invalid code from SingleID app",
          variant: "destructive",
        });
      }
    } catch (error) {
      setMfaCode(""); // Clear the code on error
      toast({
        title: "Verification failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          email: registerData.email,
          department: registerData.department,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        login(userData);
        toast({
          title: "Registration successful",
          description: `Welcome, ${userData.firstName || userData.username}!`,
        });
        setLocation('/'); // Changed navigate to setLocation for wouter
      } else {
        const errorData = await response.json();
        toast({
          title: "Registration failed",
          description: errorData.message || "Registration failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // If user is already logged in, redirect to dashboard
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-200/40 rounded-full blur-3xl animate-pulse-slow delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Cg fill-rule=%22evenodd%22%3E%3Cg fill=%22%236366f1%22 fill-opacity=%220.08%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60"></div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Branding and Features */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-20 py-12">
          {/* Company Header */}
          <div className="mb-16 space-y-8 animate-fade-in-up">
            <div className="flex items-center mb-8">
              <div className="relative">
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-pulse-slow"></div>
                <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full opacity-60"></div>
              </div>
              <div className="ml-4 flex items-center space-x-2">
                <ServerIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-600 text-sm font-semibold tracking-wider uppercase">IT Asset Portal</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-slate-800 via-emerald-700 to-teal-800 bg-clip-text text-transparent animate-gradient-shift">
                  SRPH-MIS
                </h1>
                <h2 className="text-3xl lg:text-4xl font-light text-slate-700">
                  Asset Management System
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-expand-width"></div>
              </div>

              <p className="text-slate-600 text-xl max-w-2xl leading-relaxed font-light">
                Comprehensive IT asset tracking and inventory management system.
                Manage hardware, software licenses, virtual machines, and network resources with powerful reporting and automated workflows.
              </p>
            </div>
          </div>

          {/* Enterprise Features Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
            {[
              {
                icon: ServerIcon,
                title: "Hardware Management",
                description: "Track computers, servers, network equipment, and IT accessories with detailed specifications",
                color: "from-emerald-500 to-teal-600",
                delay: "delay-200"
              },
              {
                icon: MonitorIcon,
                title: "Virtual Machine Monitoring",
                description: "Monitor VM performance, resource usage, and automated health checks",
                color: "from-blue-500 to-indigo-600",
                delay: "delay-400"
              },
              {
                icon: UsersIcon,
                title: "Asset Checkout System",
                description: "Streamlined asset assignment, checkout/checkin workflows, and user management",
                color: "from-amber-500 to-orange-600",
                delay: "delay-600"
              },
              {
                icon: BarChart3Icon,
                title: "Comprehensive Reports",
                description: "Asset lifecycle tracking, BitLocker key management, and detailed audit trails",
                color: "from-violet-500 to-purple-600",
                delay: "delay-800"
              }
            ].map((feature, index) => (
              <div key={index} className={`group animate-slide-in-left ${feature.delay}`}>
                <div className="flex items-start space-x-6 p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 hover:bg-white/90 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 shadow-lg shadow-slate-200/50">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center shadow-lg shadow-slate-300/30 group-hover:shadow-xl group-hover:scale-110 transition-all duration-600`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-800 font-semibold text-lg mb-3 group-hover:text-blue-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed group-hover:text-slate-700 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* System Features */}
          <div className="mt-16 flex items-center space-x-8 opacity-70 animate-fade-in delay-1000">
            <div className="flex items-center space-x-2">
              <ServerIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-slate-600">Network Discovery</span>
            </div>
            <div className="flex items-center space-x-2">
              <MonitorIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">VM Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-slate-600">BitLocker Keys</span>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication Form */}
        <div className="w-full lg:w-[600px] flex items-center justify-center px-8 lg:px-16 py-16">
          <div className="w-full max-w-lg">
            <Card className="bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl shadow-slate-200/40 animate-slide-in-right overflow-hidden">
              {/* Card Header with Gradient */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border-b border-slate-200/50">
                <CardHeader className="text-center pb-8 pt-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 animate-float">
                    <LockIcon className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-slate-800 text-3xl font-bold mb-4 bg-gradient-to-r from-slate-800 to-emerald-700 bg-clip-text text-transparent">
                    System Access
                  </h2>
                  <p className="text-slate-600 text-base leading-relaxed">
                    Secure access to SRPH-MIS asset management platform
                  </p>
                </CardHeader>
              </div>

              <CardContent className="space-y-8 px-12 py-10">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 border border-slate-200/60 mb-10 h-14 rounded-xl overflow-hidden backdrop-blur-sm">
                    <TabsTrigger
                      value="login"
                      className="text-slate-600 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:shadow-lg border-r border-slate-200/60 transition-all duration-300 font-medium text-base"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="text-slate-600 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:shadow-lg transition-all duration-300 font-medium text-base"
                    >
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-8 animate-fade-in">
                    {!mfaRequired ? (
                    <form onSubmit={handleLogin} className="space-y-8">
                      <div className="space-y-4">
                        <Label htmlFor="username" className="text-slate-700 text-base font-medium">
                          Username
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          className="bg-slate-50/80 border-slate-200 text-slate-800 placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 h-14 rounded-xl text-base backdrop-blur-sm transition-all duration-300 hover:bg-slate-50 focus:bg-white"
                          value={loginData.username}
                          onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-4">
                        <Label htmlFor="password" className="text-slate-700 text-base font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="bg-slate-50/80 border-slate-200 text-slate-800 placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 pr-14 h-14 rounded-xl text-base backdrop-blur-sm transition-all duration-300 hover:bg-slate-50 focus:bg-white"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 rounded-lg transition-all duration-200"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOffIcon className="h-5 w-5" />
                            ) : (
                              <EyeIcon className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold h-14 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/30 transform hover:scale-105 transition-all duration-300 text-base mt-10"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                            <LockIcon className="mr-3 h-6 w-6" />
                            Access System
                          </>
                        )}
                      </Button>
                    </form>
                    ) : (
                    <form onSubmit={handleMfaVerify} className="space-y-8">
                      <div className="text-center space-y-4">
                        <Shield className="h-12 w-12 mx-auto text-blue-600" />
                        <h3 className="text-xl font-semibold">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter the 6-digit code from your Microsoft Authenticator app
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label htmlFor="mfaCode" className="text-slate-700 text-base font-medium">
                          Verification Code
                        </Label>
                        <Input
                          id="mfaCode"
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          className="bg-slate-50/80 border-slate-200 text-slate-800 text-center text-2xl tracking-widest font-mono h-14 rounded-xl"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold h-14 rounded-xl"
                        disabled={isLoggingIn || mfaCode.length !== 6}
                      >
                        {isLoggingIn ? "Verifying..." : "Verify Code"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setMfaRequired(false);
                          setMfaCode("");
                          setMfaUserId(null);
                        }}
                      >
                        Back to Login
                      </Button>
                    </form>
                    )}
                  </TabsContent>

                  <TabsContent value="register" className="space-y-6 animate-fade-in">
                          <Label><center>Please contact System Administrator</center></Label>
                  </TabsContent>

                </Tabs>

                <div className="text-center pt-6 border-t border-slate-200/60">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    By continuing, you agree to our{" "}
                    <span className="text-blue-600 cursor-pointer hover:text-blue-500 hover:underline transition-colors">Terms of Service</span>{" "}
                    and{" "}
                    <span className="text-blue-600 cursor-pointer hover:text-blue-500 hover:underline transition-colors">Privacy Policy</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}