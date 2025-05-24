
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      
      if (type === 'signup' && token) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          });

          if (error) throw error;

          setStatus('success');
          toast({
            title: "Email confirmed!",
            description: "Your account has been verified successfully.",
          });

          // Redirect to login after a short delay
          setTimeout(() => {
            navigate('/login?confirmed=true');
          }, 2000);

        } catch (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'Failed to confirm email');
        }
      } else {
        // No valid confirmation token, redirect to login
        navigate('/login');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate, toast]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Confirming your email...</h1>
          <p className="text-muted-foreground">Please wait while we verify your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
          <h1 className="text-2xl font-bold">Email Confirmed!</h1>
          <p className="text-muted-foreground">Your account has been verified successfully. You will be redirected to the login page shortly.</p>
          <Button onClick={() => navigate('/login?confirmed=true')} className="w-full">
            Continue to Login
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-2xl font-bold">Confirmation Failed</h1>
          <Alert className="bg-destructive/10 border-destructive/20">
            <AlertDescription>
              {errorMessage || 'Failed to confirm your email. The link may be expired or invalid.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/signup')} variant="outline" className="w-full">
            Back to Sign Up
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
