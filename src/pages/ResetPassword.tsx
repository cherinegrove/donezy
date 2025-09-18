import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validHash, setValidHash] = useState(false);
  const [hashChecking, setHashChecking] = useState(true);
  
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Check if the reset password hash is valid on page load
  useEffect(() => {
    const checkHash = async () => {
      try {
        // Check URL fragments for auth tokens (Supabase puts them there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (type === 'recovery' && accessToken) {
          // We have a valid recovery token in the URL
          setValidHash(true);
          console.log("Valid recovery token found in URL");
        } else {
          // Check if we already have a session (user might have refreshed the page)
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          setValidHash(!!data.session);
        }
      } catch (err) {
        console.error("Error checking reset hash:", err);
        setError("Invalid or expired password reset link. Please request a new one.");
      } finally {
        setHashChecking(false);
      }
    };
    
    checkHash();
  }, []);

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      
      if (error) throw error;
      
      setSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been updated",
      });
      
      // Clean up auth state
      setTimeout(() => {
        cleanupAuthState();
        try {
          supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
          console.log("Error signing out after password reset:", err);
        }
      }, 2000);
      
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
      
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-10 w-10" />
        <h1 className="text-3xl font-bold">donezy</h1>
      </div>
      
      <div className="w-full max-w-md">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground">Create a new password for your account</p>
          </div>

          {hashChecking ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : validHash ? (
            success ? (
              <Alert className="bg-primary/10 border-primary/20">
                <AlertDescription className="text-center py-4">
                  <p className="font-medium">Password reset successfully!</p>
                  <p className="mt-2">You'll be redirected to the login page shortly.</p>
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
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
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Resetting password..." : "Reset Password"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
              </Form>
            )
          ) : (
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertDescription className="text-center py-4">
                <p className="font-medium">Invalid or expired reset link</p>
                <p className="mt-2">Please request a new password reset.</p>
                <Button asChild className="mt-4">
                  <Link to="/login">Return to Login</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} donezy. All rights reserved.</p>
        <p className="mt-1">For support, contact your system administrator.</p>
      </div>
    </div>
  );
}
