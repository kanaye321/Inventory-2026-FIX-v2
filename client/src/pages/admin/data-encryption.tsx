
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Lock, 
  Unlock, 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Key,
  Database
} from "lucide-react";

export default function DataEncryptionPage() {
  const [encryptDialogOpen, setEncryptDialogOpen] = useState(false);
  const [decryptDialogOpen, setDecryptDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const { toast } = useToast();

  // Check encryption status on mount
  useEffect(() => {
    // This is a simple client-side check - in production you'd query the server
    // For now, we'll show the warning and let admins proceed
    setEncryptionEnabled(false); // Default to disabled
  }, []);

  // Encrypt data mutation
  const encryptDataMutation = useMutation({
    mutationFn: async (authPassword: string) => {
      // Simulate progress
      let prog = 0;
      const interval = setInterval(() => {
        prog += 10;
        setProgress(Math.min(prog, 90));
        if (prog >= 90) clearInterval(interval);
      }, 200);

      try {
        const response = await apiRequest('POST', '/api/admin/encrypt-data', {
          password: authPassword
        });

        clearInterval(interval);
        setProgress(100);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Encryption failed');
        }

        return await response.json();
      } catch (error) {
        clearInterval(interval);
        setProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Encryption Complete",
        description: `Successfully encrypted ${data.encryptedCount || 0} records across all tables. Page will refresh in 3 seconds.`,
      });
      setEncryptDialogOpen(false);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setProgress(0);
        // Refresh the page to reflect encrypted data
        window.location.reload();
      }, 3000);
    },
    onError: (error: any) => {
      setProgress(0);
      toast({
        title: "Encryption Failed",
        description: error.message || "Failed to encrypt data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Decrypt data mutation
  const decryptDataMutation = useMutation({
    mutationFn: async (authPassword: string) => {
      // Simulate progress
      let prog = 0;
      const interval = setInterval(() => {
        prog += 10;
        setProgress(Math.min(prog, 90));
        if (prog >= 90) clearInterval(interval);
      }, 200);

      try {
        const response = await apiRequest('POST', '/api/admin/decrypt-data', {
          password: authPassword
        });

        clearInterval(interval);
        setProgress(100);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Decryption failed');
        }

        return await response.json();
      } catch (error) {
        clearInterval(interval);
        setProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Decryption Complete",
        description: `Successfully decrypted ${data.decryptedCount || 0} records across all tables. Page will refresh in 3 seconds.`,
      });
      setDecryptDialogOpen(false);
      setPassword('');
      setTimeout(() => {
        setProgress(0);
        // Refresh the page to reflect decrypted data
        window.location.reload();
      }, 3000);
    },
    onError: (error: any) => {
      setProgress(0);
      toast({
        title: "Decryption Failed",
        description: error.message || "Failed to decrypt data. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEncrypt = () => {
    if (password.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    encryptDataMutation.mutate(password);
  };

  const handleDecrypt = () => {
    if (password.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    decryptDataMutation.mutate(password);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Shield className="mr-3 h-8 w-8" />
          Data Encryption Management
        </h1>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>⚠️ Encryption Disabled by Default</AlertTitle>
        <AlertDescription>
          PII encryption is currently <strong>turned OFF</strong>. All sensitive data is stored in plain text.
          <br /><br />
          <strong>To enable encryption:</strong>
          <ol className="list-decimal ml-5 mt-2">
            <li>Set an environment variable named <code className="bg-red-100 px-1">ENCRYPTION_KEY</code></li>
            <li>Generate a strong random value (32+ characters recommended)</li>
            <li>Restart your application</li>
            <li>Use the "Encrypt All Data" button below to encrypt existing data</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          This page allows you to encrypt or decrypt all sensitive data in the database. 
          All operations require password authentication for security.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Encrypt Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Encrypt Data
            </CardTitle>
            <CardDescription>
              Encrypt all sensitive PII data in the database using AES-256-GCM encryption.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What gets encrypted:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• User personal information (email, names, department)</li>
                <li>• Asset data (serial numbers, MAC/IP addresses)</li>
                <li>• BitLocker recovery keys</li>
                <li>• VM inventory data (requestor, IPs, MAC addresses)</li>
                <li>• IAM account information (requestor)</li>
                <li>• IT equipment details (serial numbers)</li>
                <li>• Monitor inventory data (asset numbers, serial numbers)</li>
              </ul>
              <p className="text-sm text-blue-700 mt-2 font-medium">Note: Knox IDs are NOT encrypted</p>
            </div>

            <Button 
              onClick={() => setEncryptDialogOpen(true)}
              className="w-full"
              disabled={encryptDataMutation.isPending}
            >
              {encryptDataMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Encrypt All Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Decrypt Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Unlock className="mr-2 h-5 w-5" />
              Decrypt Data
            </CardTitle>
            <CardDescription>
              Decrypt all encrypted PII data back to plain text format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Decrypting data will store sensitive information in plain text. 
                Only use this if you need to remove encryption or migrate data.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                After decryption, data will be vulnerable until re-encrypted. 
                Make sure you have a backup before proceeding.
              </p>
            </div>

            <Button 
              onClick={() => setDecryptDialogOpen(true)}
              variant="outline"
              className="w-full"
              disabled={decryptDataMutation.isPending}
            >
              {decryptDataMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Decrypt All Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Encryption Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Encryption Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium">Algorithm</h4>
              </div>
              <p className="text-sm text-muted-foreground">AES-256-GCM</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <Key className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="font-medium">Key Length</h4>
              </div>
              <p className="text-sm text-muted-foreground">256 bits</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle2 className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="font-medium">Authentication</h4>
              </div>
              <p className="text-sm text-muted-foreground">GCM Auth Tag</p>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Security Features:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Password-protected encryption/decryption operations</li>
              <li>✓ Authenticated encryption with additional data (AEAD)</li>
              <li>✓ Unique initialization vector (IV) for each field</li>
              <li>✓ Data integrity verification on decryption</li>
              <li>✓ Backward compatibility with unencrypted data</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Encrypt Dialog */}
      <Dialog open={encryptDialogOpen} onOpenChange={(open) => {
        setEncryptDialogOpen(open);
        if (!open) {
          setPassword('');
          setConfirmPassword('');
          setShowPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encrypt All Data</DialogTitle>
            <DialogDescription>
              Enter a password to authorize the encryption operation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Operation</AlertTitle>
              <AlertDescription>
                This will encrypt all unencrypted PII data in the database. 
                Already encrypted data will be skipped.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="encrypt-password">Authorization Password</Label>
              <div className="relative">
                <Input
                  id="encrypt-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 8 characters)"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            {progress > 0 && (
              <div className="space-y-2">
                <Label>Encryption Progress</Label>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {progress < 100 ? "Encrypting data..." : "Encryption completed!"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEncryptDialogOpen(false)}
              disabled={encryptDataMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEncrypt}
              disabled={encryptDataMutation.isPending || !password || !confirmPassword}
            >
              {encryptDataMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Encrypt Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decrypt Dialog */}
      <Dialog open={decryptDialogOpen} onOpenChange={(open) => {
        setDecryptDialogOpen(open);
        if (!open) {
          setPassword('');
          setShowPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decrypt All Data</DialogTitle>
            <DialogDescription>
              Enter a password to authorize the decryption operation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Warning</AlertTitle>
              <AlertDescription>
                This will decrypt all encrypted data to plain text. 
                Ensure you have a backup before proceeding.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="decrypt-password">Authorization Password</Label>
              <div className="relative">
                <Input
                  id="decrypt-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 8 characters)"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {progress > 0 && (
              <div className="space-y-2">
                <Label>Decryption Progress</Label>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {progress < 100 ? "Decrypting data..." : "Decryption completed!"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDecryptDialogOpen(false)}
              disabled={decryptDataMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDecrypt}
              disabled={decryptDataMutation.isPending || !password}
            >
              {decryptDataMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Decrypt Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
