import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasStartedVerification, setHasStartedVerification] = useState(false);

  useEffect(() => {
    if (hasStartedVerification) return;
    
    setHasStartedVerification(true);
    const verifyUser = async () => {
      try {
        // Get all query parameters from the current URL
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.toString() === '') {
          throw new Error('Invalid verification link - missing parameters');
        }

        // Your Supabase project URL
        const supabaseProjectUrl = import.meta.env.VITE_SUPABASE_URL;
        const verifyUrl = `${supabaseProjectUrl}/auth/v1/verify?${urlParams.toString()}`;
        
        console.log('Redirecting to Supabase verification URL:', verifyUrl);

        // Simply redirect to the Supabase verification URL
        window.location.href = verifyUrl;

      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to verify account');
        
        toast({
          title: "Verification failed",
          description: error instanceof Error ? error.message : 'Failed to verify account',
          variant: "destructive",
        });
      }
    };

    verifyUser();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <FileText className="h-16 w-16" />
          <h1 className="text-5xl font-bold">donezy</h1>
        </div>
        
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center space-y-4">
              {status === 'loading' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  <h2 className="text-2xl font-bold">Verifying Account</h2>
                  <p className="text-gray-600 text-center">Please wait while we verify your account...</p>
                </>
              )}
              
              {status === 'success' && (
                <>
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold">Account Verified!</h2>
                  <p className="text-gray-600 text-center">
                    Your account has been successfully verified. You will be redirected shortly.
                  </p>
                </>
              )}
              
              {status === 'error' && (
                <>
                  <div className="rounded-full bg-red-100 p-3">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold">Verification Failed</h2>
                  <Alert className="bg-red-50 border-red-200 mt-4">
                    <AlertDescription>
                      <p className="font-medium text-red-800">Unable to verify your account</p>
                      <p className="mt-2 text-red-600 text-sm">{errorMessage}</p>
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => navigate('/login')} className="mt-4">
                    Back to Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}