import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const passwordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ConfirmInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'password-setup' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const handleInviteConfirmation = async () => {
      try {
        // Get the token/code from URL parameters
        const token = searchParams.get('token');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        console.log('Invite confirmation parameters:', { token, tokenHash, type });

        if (!token && !tokenHash) {
          throw new Error('Invalid invitation link - missing token');
        }

        // For invited users, they need to set up their password
        if (type === 'invite' || type === 'signup') {
          // For Supabase invitations, we have tokenHash and type
          if (tokenHash && type) {
            console.log('Processing invitation with tokenHash:', tokenHash, 'type:', type);
            
            // Don't verify here - just set up for password creation
            // The verification will happen when they set their password
            if (type === 'signup') {
              // Get user email from search params or try to extract from any available data
              const emailParam = searchParams.get('email');
              setUserEmail(emailParam || 'your account');
              setStatus('password-setup');
              return;
            }
            
            // For type=invite, verify the token first
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as any
            });

            if (error) {
              console.error('Token verification error:', error);
              throw new Error('Invalid or expired invitation link');
            }

            if (data.user) {
              setUserEmail(data.user.email || '');
              setStatus('password-setup');
              return;
            }
          }
        }

        // If we have a code, exchange it for a session (regular confirmation flow)
        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) throw error;

          if (data.user) {
            setStatus('success');
            toast({
              title: "Account confirmed!",
              description: "Welcome to Donezy! You can now access your account.",
            });

            setTimeout(() => {
              navigate('/');
            }, 2000);
          }
        } else {
          throw new Error('Invalid confirmation link');
        }
      } catch (error) {
        console.error('Invitation confirmation error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to process invitation');
        
        toast({
          title: "Confirmation failed",
          description: error instanceof Error ? error.message : 'Failed to process invitation',
          variant: "destructive",
        });
      }
    };

    handleInviteConfirmation();
  }, [searchParams, navigate, toast]);

  const onSetPassword = async (values: z.infer<typeof passwordSchema>) => {
    setIsSettingPassword(true);
    
    try {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || !type) {
        throw new Error('Invalid invitation parameters');
      }

      // Verify the OTP and set the password
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });

      if (error) {
        console.error('OTP verification error:', error);
        throw new Error('Invalid or expired invitation link');
      }

      console.log('OTP verified successfully, user:', data.user?.email);

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }

      console.log('Password set successfully for user');

      setStatus('success');
      
      toast({
        title: "Password set successfully!",
        description: "Your account is now active. Welcome to Donezy!",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Password setup error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to set password');
      
      toast({
        title: "Password setup failed",
        description: error instanceof Error ? error.message : 'Failed to set password',
        variant: "destructive",
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-10 w-10" />
        <h1 className="text-3xl font-bold">donezy</h1>
      </div>
      
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
                <CardTitle>Processing Invitation</CardTitle>
                <CardDescription>Please wait while we verify your invitation...</CardDescription>
              </>
            )}
            
            {status === 'password-setup' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <UserPlus className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle>Set Your Password</CardTitle>
                <CardDescription>
                  Welcome to Donezy! Please create a password for your account: {userEmail}
                </CardDescription>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <CardTitle>Welcome to Donezy!</CardTitle>
                <CardDescription>
                  Your account is now active. You will be redirected to the dashboard.
                </CardDescription>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-red-100 p-3">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <CardTitle>Invitation Error</CardTitle>
                <CardDescription>
                  There was a problem processing your invitation.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {status === 'password-setup' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSetPassword)} className="space-y-4">
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

                  <Button type="submit" className="w-full" disabled={isSettingPassword}>
                    {isSettingPassword ? "Setting up account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert className="bg-destructive/10 border-destructive/20">
                  <AlertDescription>
                    <p className="font-medium">Unable to process invitation</p>
                    <p className="mt-2">{errorMessage}</p>
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate('/login')} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} donezy. All rights reserved.</p>
      </div>
    </div>
  );
}