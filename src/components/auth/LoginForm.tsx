
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
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
import { Lock, ArrowRight, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAppContext();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Check if user just confirmed their email
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      toast({
        title: "Email confirmed!",
        description: "Your email has been verified. You can now log in.",
      });
    }
  }, [searchParams, toast]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    console.log("Starting login process...");
    setIsLoading(true);
    setLoginError(null);
    
    try {
      console.log("Attempting login with:", values.email);
      
      // Use app context login method which should handle everything
      const success = await login(values.email, values.password);
      
      if (success) {
        console.log("Login successful, redirecting...");
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        navigate("/", { replace: true });
      } else {
        throw new Error("Login failed - invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Invalid email or password. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please verify your email before logging in. Check your inbox for a confirmation link.";
        } else if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setLoginError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log("Login process completed, setting loading to false");
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    setResetEmail(values.email);
    
    try {
      // Generate recovery link using Supabase
      const { data, error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `https://app.donezy.io/set-password?email=${encodeURIComponent(values.email)}`,
      });
      
      if (error) throw error;
      
      setForgotPasswordSuccess(true);
      
      toast({
        title: "Password reset email sent",
        description: `Instructions have been sent to ${values.email}`,
      });
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send password reset email";
      
      if (error instanceof Error) {
        if (error.message.includes("rate")) {
          errorMessage = "Too many requests. Please wait a few minutes before trying again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center space-y-2">
        <div className="rounded-full bg-primary/10 p-3">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="text-muted-foreground">Enter your credentials to continue</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {loginError && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">
              {loginError}
            </div>
          )}
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="you@example.com" 
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </Form>

      <div className="flex flex-col space-y-2 text-center text-sm">
        <button 
          type="button" 
          onClick={() => setShowForgotPassword(true)} 
          className="text-primary hover:underline focus:outline-none"
          disabled={isLoading}
        >
          Forgot password?
        </button>
        <p className="mt-4 text-sm text-center">
          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot your password?
          </a>
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          {forgotPasswordSuccess ? (
            <Alert className="bg-primary/10 border-primary/20">
              <AlertDescription className="text-center py-2 flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-base mb-2">Password reset email sent!</p>
                  <p className="mb-2">We've sent reset instructions to:</p>
                  <p className="font-medium">{resetEmail}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordSuccess(false);
                    forgotPasswordForm.reset();
                  }}
                  className="mt-2"
                >
                  Return to login
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="you@example.com" 
                          autoComplete="email" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
