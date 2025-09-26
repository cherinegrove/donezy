
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCodeProcessed, setIsCodeProcessed] = useState(false);

  useEffect(() => {
    const confirmUser = async () => {
      try {
        // Get the code from URL parameters (new Supabase auth flow)
        const code = searchParams.get('code');

        if (!code && isCodeProcessed) {
          return;
        }

        if (!code) {
          throw new Error('Invalid confirmation link');
        }

        setIsCodeProcessed(true);

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        if (data.user) {
          console.log('Email confirmed successfully for user:', data.user.email);
          
          // Update user record to ensure admin role is set
          const { error: userError } = await supabase
            .from('users')
            .update({
              role: 'admin' // Ensure first user gets admin role
            })
            .eq('auth_user_id', data.user.id);

          if (userError) {
            console.error('Error updating user role:', userError);
          }

          setStatus('success');
          
          toast({
            title: "Email confirmed!",
            description: "Your account has been verified. You now have admin access.",
          });

          // Redirect to password setup page after a short delay
          setTimeout(() => {
            navigate('/set-password');
          }, 2000);
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to confirm email');
        
        toast({
          title: "Confirmation failed",
          description: error instanceof Error ? error.message : 'Failed to confirm email',
          variant: "destructive",
        });
      }
    };

    confirmUser();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <FileText className="h-10 w-10" />
        <h1 className="text-3xl font-bold">donezy</h1>
      </div>
      
      <div className="w-full max-w-md">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center space-y-2">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <h1 className="text-2xl font-bold">Confirming Email</h1>
                <p className="text-muted-foreground text-center">Please wait while we verify your email address...</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold">Email Confirmed!</h1>
                <p className="text-muted-foreground text-center">
                  Your account has been successfully verified. You now have admin access and will be redirected to the dashboard.
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="rounded-full bg-red-100 p-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold">Confirmation Failed</h1>
                <Alert className="bg-destructive/10 border-destructive/20">
                  <AlertDescription className="text-center">
                    <p className="font-medium">Unable to confirm your email</p>
                    <p className="mt-2">{errorMessage}</p>
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate('/signup')} className="mt-4">
                  Try Signing Up Again
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} donezy. All rights reserved.</p>
      </div>
    </div>
  );
}
