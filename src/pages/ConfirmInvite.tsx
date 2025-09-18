import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const passwordSchema = z
  .object({
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ConfirmInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "password-setup" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Step 1: Verify invite link
  useEffect(() => {
    const token = searchParams.get("token");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const email = searchParams.get("email");

    if (!token && !tokenHash) {
      setErrorMessage("Invalid or missing invite link");
      setStatus("error");
      return;
    }

    const verifyInvite = async () => {
      let session = null;
      let error = null;

      if (tokenHash) {
        // Handle token_hash flow (newer Supabase format)
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(tokenHash);
        session = data?.session;
        error = exchangeError;
      } else if (token && type === "invite") {
        // Handle token + type=invite flow (older format)
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "invite",
          email,
        });
        session = data?.session;
        error = verifyError;
      } else {
        setErrorMessage("Invalid invite link format");
        setStatus("error");
        return;
      }

      if (error) {
        console.error("Invite verification error:", error);
        setErrorMessage("Invite verification failed. Please request a new invite.");
        setStatus("error");
        return;
      }

      if (!session) {
        setErrorMessage("Failed to establish session. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("password-setup");
    };

    verifyInvite();
  }, [searchParams]);

  // Step 2: Handle password setup
  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      console.error("Password update error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setStatus("success");
    toast({ title: "Success", description: "Password set successfully!" });
    navigate("/dashboard");
  };

  if (status === "loading") {
    return <p className="text-center mt-10">Verifying your invite…</p>;
  }

  if (status === "error") {
    return <p className="text-center mt-10 text-red-500">{errorMessage}</p>;
  }

  if (status === "success") {
    return <p className="text-center mt-10 text-green-600">Password set successfully! Redirecting…</p>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <Input type="password" {...field} />
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
                    <Input type="password" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Set Password</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}