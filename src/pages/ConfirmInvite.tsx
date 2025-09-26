import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { FileText, Eye, EyeOff } from "lucide-react";

const passwordSchema = z.object({
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

export default function ConfirmInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "password-setup" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Step 1: Verify invite link
  useEffect(() => {
    // First check query parameters (old format)
    const token = searchParams.get("token");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const email = searchParams.get("email");

    // Then check hash parameters (new format)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");
    const expiresAt = hashParams.get("expires_at");

    console.log("Query params:", { token, tokenHash, type, email });
    console.log("Hash params:", { accessToken: accessToken?.substring(0, 20) + "...", refreshToken, hashType, expiresAt });

    if (!token && !tokenHash && !accessToken) {
      setErrorMessage("Invalid or missing invite link");
      setStatus("error");
      return;
    }

    const verifyInvite = async () => {
      let session = null;
      let error = null;

      if (accessToken && refreshToken && hashType === "invite") {
        // Handle hash parameters (new Supabase auth flow)
        console.log("Processing hash-based invite flow");
        try {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          session = data?.session;
          error = setSessionError;
        } catch (err) {
          console.error("Error setting session:", err);
          error = err;
        }
      } else if (tokenHash) {
        // Handle token_hash flow (newer Supabase format)
        console.log("Processing token_hash flow");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(tokenHash);
        session = data?.session;
        error = exchangeError;
      } else if (token && type === "invite") {
        // Handle token + type=invite flow (older format)
        console.log("Processing legacy token flow");
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "invite",
          email,
        });
        session = data?.session;
        error = verifyError;
      } else {
        console.error("No valid parameters found for invite verification");
        setErrorMessage("Invalid invite link format");
        setStatus("error");
        return;
      }

      if (error) {
        console.error("Invite verification error:", error);
        setErrorMessage("Invite verification failed. Please request a new invite.");
        setStatus("error");
        return;
      }

      if (!session) {
        console.error("No session established after verification");
        setErrorMessage("Failed to establish session. Please try again.");
        setStatus("error");
        return;
      }

      console.log("Invite verification successful, session established:", session.user?.email);
      setStatus("password-setup");
    };

    verifyInvite();
  }, [searchParams]); // Keep original dependency, hash parsing happens inside effect

  // Step 2: Handle password setup
  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;

      setStatus("success");
      toast({
        title: "Password set successfully!",
        description: "Your account is now ready to use.",
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate("/");
      }, 2000);
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
  };  // Show loading while verifying invite
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Verifying your invite...</p>
      </div>
    );
  }

  // Show error if invite verification failed
  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
        <div className="mb-8 flex items-center gap-2">
          <FileText className="h-10 w-10" />
          <h1 className="text-3xl font-bold">donezy</h1>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Invite Invalid</CardTitle>
            <CardDescription>
              {errorMessage}
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

  // Show success message
  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
        <div className="mb-8 flex items-center gap-2">
          <FileText className="h-10 w-10" />
          <h1 className="text-3xl font-bold">donezy</h1>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-600">Password Set!</CardTitle>
            <CardDescription>
              Your password has been set successfully. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            Welcome to donezy! Please set a secure password for your account.
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