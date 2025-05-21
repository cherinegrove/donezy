import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
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
import { ArrowRight, UserPlus } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - this will use the environment variables set by the Supabase integration
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

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
  const { inviteUser } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
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
    
    try {
      // First, create the user in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            role: "developer", // Default role
          }
        }
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Create the user in our app context as well to keep local functionality
        inviteUser(values.email, values.name, "developer", {
          // Default options for new users
          employmentType: "full-time",
          billingType: "hourly",
          hourlyRate: 50,
          currency: "USD",
        });
        
        // Store any additional user metadata in Supabase
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            { 
              user_id: authData.user.id,
              name: values.name,
              email: values.email,
              role: "developer",
              employment_type: "full-time",
              billing_type: "hourly",
              hourly_rate: 50,
              currency: "USD"
            }
          ]);
        
        if (profileError) {
          console.error("Error saving user profile:", profileError);
        }

        // Show success message
        toast({
          title: "Account created successfully",
          description: "You can now log in with your credentials",
        });
        
        // Reset the form
        form.reset();
        
        // Redirect to login page
        navigate("/login");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Error creating account",
        description: error instanceof Error ? error.message : "An error occurred during signup. Please try again.",
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
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-muted-foreground">Enter your details to get started</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
