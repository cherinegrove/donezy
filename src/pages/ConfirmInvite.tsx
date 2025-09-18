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

  // Step 1: Verify invite token
  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");

    if (!token || type !== "invite") {
      setErrorMessage("Invalid or missing invite token");
      setStatus("error");
      return;
    }

    const verifyInvite = async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "invite" });

      if (error) {
        console.error("Error verifying invite:", error);
        setErrorMessage("Invite verification failed. Please request a new invite.");
        setStatus("error");
      } else {
        setStatus("password-setup");
      }
    };

    verifyInvite();
  }, [searchParams]);

  // Step 2: Handle password setup
  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      setStatus("success");
      toast({ title: "Success", description: "Password set successfully!" });
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Password setup error:", err);
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    }
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