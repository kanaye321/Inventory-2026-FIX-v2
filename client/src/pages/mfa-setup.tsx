import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Smartphone, Key, Check, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MfaSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'setup' | 'verify'>('intro');
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEnforced, setIsEnforced] = useState(false);

  // Check if MFA is already enabled
  const { data: mfaStatus } = useQuery({
    queryKey: ['/api/mfa/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/mfa/status');
      return response.json();
    }
  });

  // Check if user has MFA enabled, if not mark as enforced
  useEffect(() => {
    if (mfaStatus && !mfaStatus.enabled) {
      setIsEnforced(true);
    }
  }, [mfaStatus]);

  // Prevent navigation away if MFA is not set up (enforced mode)
  useEffect(() => {
    if (isEnforced) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You must complete MFA setup to continue';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isEnforced]);

  // Setup MFA
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/mfa/setup');
      return response.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('setup');
    },
    onError: () => {
      toast({
        title: "Setup failed",
        description: "Could not initialize MFA setup",
        variant: "destructive"
      });
    }
  });

  // Enable MFA
  const enableMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest('POST', '/api/mfa/enable', { token });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mfa/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "MFA enabled",
        description: "Two-factor authentication has been enabled successfully"
      });
      // Redirect to dashboard if enforced, otherwise to settings
      setLocation(isEnforced ? '/' : '/settings');
    },
    onError: () => {
      toast({
        title: "Verification failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleStartSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      enableMutation.mutate(verificationCode);
    }
  };

  if (mfaStatus?.enabled) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Check className="h-6 w-6 mr-2 text-green-500" />
              MFA Already Enabled
            </CardTitle>
            <CardDescription>
              Two-factor authentication is already set up for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/settings')}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      {isEnforced && (
        <Alert className="mb-6 bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>MFA Setup Required:</strong> You must complete Two-Factor Authentication setup to access the system.
          </AlertDescription>
        </Alert>
      )}
      {step === 'intro' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-6 w-6 mr-2" />
              Enable Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account using Microsoft Authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Install Microsoft Authenticator</h3>
                  <p className="text-sm text-muted-foreground">
                    Download the Microsoft Authenticator app on your mobile device from the App Store or Google Play
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Key className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the app to scan the QR code we'll provide to link your account
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Verify Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from the app to complete setup
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStartSetup} 
              className="w-full"
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? "Setting up..." : "Start Setup"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle>Register Your Device with Microsoft Authenticator</CardTitle>
            <CardDescription>
              Follow these steps to register your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open the Microsoft Authenticator app on your mobile device</li>
                <li>Tap the "+" button or "Add Account"</li>
                <li>Scan the QR code below with your camera</li>
                <li>Your device will be registered to this account</li>
              </ol>
            </div>

            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code for Microsoft Authenticator" className="w-64 h-64 border-4 border-primary/20 rounded-lg" />
            </div>

            <div className="space-y-2">
              <Label>Manual Entry Key (if camera doesn't work)</Label>
              <Input 
                value={secret} 
                readOnly 
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter this key manually in your Microsoft Authenticator app if you cannot scan the QR code
              </p>
            </div>

            <Button 
              onClick={() => setStep('verify')} 
              className="w-full"
            >
              I've Registered My Device
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'verify' && (
        <Card>
          <CardHeader>
            <CardTitle>Verify Your Device Registration</CardTitle>
            <CardDescription>
              Complete the setup by entering the code from Microsoft Authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Final Step:</h3>
              <p className="text-sm">
                Open your Microsoft Authenticator app and enter the 6-digit code from SRPH-MIS to verify your device is properly registered.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                maxLength={6}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono h-14"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>

            <p className="text-xs text-center text-muted-foreground">
              The code changes every 30 seconds. Enter the current code from your Microsoft Authenticator app.
            </p>

            <Button 
              onClick={handleVerify} 
              className="w-full"
              disabled={verificationCode.length !== 6 || enableMutation.isPending}
            >
              {enableMutation.isPending ? "Verifying Device..." : "Verify and Enable MFA"}
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setStep('setup')} 
              className="w-full"
            >
              Back to QR Code
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}