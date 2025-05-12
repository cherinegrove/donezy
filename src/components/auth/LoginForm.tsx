
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
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
import { Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      const success = await login(values.email, values.password);
      if (success) {
        toast({
          title: "Login successful",
          description: "Welcome back!",
          variant: "default",
        });
        navigate("/", { replace: true });
      } else {
        setLoginError("Invalid email or password");
      }
    } catch (error) {
      setLoginError("An error occurred during login");
      console.error("Login error:", error);
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Forgot your password? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
