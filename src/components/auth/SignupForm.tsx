
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
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
import { ArrowRight, UserPlus } from "lucide-react";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export function SignupForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    setSignupError(null);
    setSignupSuccess(false);
    setUserEmail(values.email);
    
    try {
      console.log("Signup attempt for:", values.email);
      
      // Clean up any existing auth state to prevent issues
      cleanupAuthState();
      
      try {
        // Try a global sign out just in case
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log("Global sign out during signup failed, continuing:", err);
      }
      
      // Create the user in Supabase auth - first user is always admin
      const redirectUrl = `${window.location.origin}/email-confirmation`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            role: "admin", // First user is admin
          },
          emailRedirectTo: redirectUrl
        }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        console.log("Supabase signup success for:", authData.user.email);
        
        // Note: profiles table doesn't exist in current schema
        // User will be created automatically via the handle_new_user trigger
        
        // User record will be created automatically via the handle_new_user trigger
        console.log("User record will be created automatically via trigger");

        // If email confirmation is disabled or user is already confirmed
        if (authData.session) {
          console.log("User is already confirmed, redirecting to dashboard");
          
          toast({
            title: "Account created successfully",
            description: "Welcome to donezy! You now have admin access.",
          });
          
          // Redirect to main dashboard - user is already logged in
          navigate("/");
        } else {
          // Email verification required
          console.log("Email verification required");
          setSignupSuccess(true);
          
          toast({
            title: "Verification email sent",
            description: "Please check your email to complete signup",
          });
        }
        
        // Reset the form
        form.reset();
      }
    } catch (error) {
      console.error("Signup error:", error);
      
      // Check if user already exists
      const errorMessage = error instanceof Error ? error.message : "An error occurred during signup. Please try again.";
      
      if (errorMessage.includes("already been registered") || errorMessage.includes("already exists") || errorMessage.includes("User already registered")) {
        setSignupError("It looks like you already have an account with this email address. Please try logging in or use the forgot password option if you need to reset your password.");
        toast({
          title: "Account already exists",
          description: "Try logging in or use forgot password if needed.",
          variant: "destructive",
        });
      } else {
        setSignupError(errorMessage);
        toast({
          title: "Error creating account",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (signupSuccess) {
    return (
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center space-y-2">
          <div className="rounded-full bg-primary/10 p-3">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
        </div>
        
        <Alert className="bg-primary/10 text-foreground border-primary/20">
          <AlertDescription className="text-center py-4">
            <p className="mb-4">We've sent a verification email to:</p>
            <p className="font-medium text-lg mb-4">{userEmail}</p>
            <p>Please check your inbox and click the verification link to complete your registration.</p>
            <p className="mt-2 text-sm text-muted-foreground">You will have admin access once verified.</p>
          </AlertDescription>
        </Alert>
        
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Didn't receive an email?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto" 
              onClick={() => setSignupSuccess(false)}
            >
              Try again
            </Button>
          </p>
        </div>
        
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center space-y-2">
        <div className="rounded-full bg-primary/10 p-3">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-muted-foreground">Enter your details to get started</p>
        <p className="text-xs text-muted-foreground">First user gets admin access</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {signupError && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">
              {signupError}
            </div>
          )}
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
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
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Sign Up"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
