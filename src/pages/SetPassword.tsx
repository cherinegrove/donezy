import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { FileText, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const setPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export default function SetPassword() {
  console.log("🔥 SetPassword: Component STARTING TO MOUNT");
  console.log("🔥 SetPassword: URL on mount:", window.location.href);
  console.log("🔥 SetPassword: Current URL params:", window.location.search);
  console.log("🔥 SetPassword: Current URL hash:", window.location.hash);
  console.log("🔥 SetPassword: Component rendered at:", new Date().toISOString());
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAppContext();
  const isCancelledRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (session) {
      isCancelledRef.current = true;
      return;
    }
  }, [session]);

  // Handle recovery token verification - always check token regardless of session
  useEffect(() => {
    isCancelledRef.current = false;

    const handleRecovery = async () => {
      console.log("🔥 SetPassword: USEEFFECT STARTED - Starting recovery token verification");
      console.log("🔥 SetPassword: Current URL:", window.location.href);
      console.log("🔥 SetPassword: Search params:", window.location.search);
      console.log("🔥 SetPassword: Hash:", window.location.hash);
      
      // Extract token, code, type, and email from URL parameters AND hash fragments
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Supabase can pass tokens/codes in either query params or hash fragments
      const token = urlParams.get("token") || hashParams.get("access_token") || hashParams.get("token");
      const code = urlParams.get("code") || hashParams.get("code");
      const type = urlParams.get("type") || hashParams.get("type") || "recovery";
      const email = urlParams.get("email") || hashParams.get("email");
      
      console.log("SetPassword: Extracted params:", { 
        token: token ? `${token.substring(0, 20)}...` : "missing",
        code: code ? `${code.substring(0, 20)}...` : "missing", 
        type, 
        email,
        hasHash: window.location.hash.length > 0,
        hasQuery: window.location.search.length > 0,
        fullHash: window.location.hash,
        fullQuery: window.location.search
      });

      if (!token && !code) {
        console.error("SetPassword: No recovery token or code found in URL");
        console.log("SetPassword: Full URL breakdown:", {
          href: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          pathname: window.location.pathname
        });
        
        // TEMPORARY: Don't show error immediately, wait a bit longer
        console.log("SetPassword: Waiting 2 seconds for potential redirects...");
        setTimeout(() => {
          console.log("SetPassword: Still no token/code after waiting, showing error");
          setError("Missing recovery token or code. Please use the link from your reset email.");
          setIsCheckingAuth(false);
        }, 2000);
        return;
      }

      console.log("SetPassword: Valid recovery token/code found, verifying...");
      try {
        let error;
        
        if (code) {
          // Handle PKCE flow (newer Supabase auth with code parameter)
          console.log("SetPassword: Using PKCE flow with code");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          error = exchangeError;
        } else if (token) {
          // Handle OTP flow (older Supabase auth with token parameter)
          console.log("SetPassword: Using OTP flow with token");
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as any,
            email: email || undefined,
          });
          error = otpError;
        }

        if (error && !isCancelledRef.current) {
          console.error("SetPassword: Recovery verification failed:", error.message);
          setError("Invalid or expired reset link. Please request a new password reset.");
          setIsCheckingAuth(false);
        } else {
          console.log("SetPassword: Recovery verification successful");
          setIsCheckingAuth(false); // allow form to render
        }
      } catch (error) {
        console.error("SetPassword: Verification error:", error);
        setError("Error verifying reset link. Please try again.");
        setIsCheckingAuth(false);
      }
    };

    handleRecovery();
  }, []);

  const form = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SetPasswordFormData) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) throw error;

      toast({
        title: "Password set successfully!",
        description: "Your account is now ready to use.",
      });

      // Redirect to dashboard
      navigate('/');
    } catch (error) {
      console.error('Error setting password:', error);
      toast({
        title: "Error setting password",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking recovery token
  if (isCheckingAuth) {
    console.log("🔥 SetPassword: RENDERING LOADING STATE");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  // Show error if recovery verification failed
  if (error) {
    console.log("🔥 SetPassword: RENDERING ERROR STATE:", error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
        <div className="mb-8 flex items-center gap-2">
          <FileText className="h-10 w-10" />
          <h1 className="text-3xl font-bold">donezy</h1>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Reset Link Invalid</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("🔥 SetPassword: RENDERING MAIN FORM");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-10 w-10" />
        <h1 className="text-3xl font-bold">donezy</h1>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            Your email has been confirmed! Please set a secure password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your new password"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-sm text-muted-foreground">
                <p className="mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>At least 8 characters long</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Setting Password..." : "Set Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} donezy. All rights reserved.</p>
      </div>
    </div>
  );
}