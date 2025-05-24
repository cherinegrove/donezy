
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the session after email confirmation
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setStatus('error');
          return;
        }

        if (session) {
          setStatus('success');
          toast({
            title: "Email confirmed!",
            description: "Your account has been verified successfully.",
          });

          // Redirect to login after a short delay
          setTimeout(() => {
            navigate('/login?confirmed=true');
          }, 1500);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
      }
    };

    handleEmailConfirmation();
  }, [navigate, toast]);

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
          <p className="text-muted-foreground">Your account has been verified successfully. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm text-center">
        <XCircle className="h-12 w-12 mx-auto text-red-500" />
        <h1 className="text-2xl font-bold">Confirmation Failed</h1>
        <p className="text-muted-foreground">Unable to confirm your email. Please try signing up again.</p>
        <Button onClick={() => navigate('/signup')} className="w-full">
          Back to Sign Up
        </Button>
      </div>
    </div>
  );
}
