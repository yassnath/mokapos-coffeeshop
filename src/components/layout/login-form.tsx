"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const passwordSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

const pinSchema = z.object({
  identifier: z.string().min(2),
  pin: z.string().min(4).max(8),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type PinValues = z.infer<typeof pinSchema>;

type PinUser = {
  id: string;
  name: string;
  username: string | null;
  role: string;
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState("password");
  const [pinIdentifier, setPinIdentifier] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const pinForm = useForm<PinValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      identifier: "",
      pin: "",
    },
  });

  const staffQuery = useQuery<{ users: PinUser[] }>({
    queryKey: ["pin-users"],
    queryFn: async () => {
      const response = await fetch("/api/staff/pin-users");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const handlePasswordLogin = passwordForm.handleSubmit(async (values) => {
    const identifier = values.identifier.trim();
    const password = values.password;

    const result = await signIn("credentials", {
      redirect: false,
      mode: "password",
      identifier,
      password,
    });

    if (result?.error) {
      toast.error("Invalid credentials.");
      return;
    }

    toast.success("Welcome back");
    router.push("/app");
    router.refresh();
  });

  const handlePinLogin = pinForm.handleSubmit(async (values) => {
    const identifier = values.identifier.trim();
    const pin = values.pin.trim();

    const result = await signIn("credentials", {
      redirect: false,
      mode: "pin",
      identifier,
      pin,
    });

    if (result?.error) {
      toast.error("Invalid PIN login.");
      return;
    }

    toast.success("PIN login successful");
    router.push("/app");
    router.refresh();
  });

  return (
    <Card className="border-border bg-card w-full max-w-md rounded-3xl shadow-[0_20px_52px_rgba(28,28,28,0.12)]">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Sign in to Solvix POS</CardTitle>
        <CardDescription>
          Use account credentials or quick PIN login for shift handoff.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="mb-6 grid w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="password">Account</TabsTrigger>
            <TabsTrigger value="pin">PIN Quick Login</TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <form className="space-y-4" onSubmit={handlePasswordLogin}>
              <div className="space-y-2">
                <Label htmlFor="identifier">Email / Username</Label>
                <Input
                  id="identifier"
                  placeholder="Masukkan email anda"
                  {...passwordForm.register("identifier")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-[0.35rem]">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password anda"
                    className="pr-10"
                    {...passwordForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full rounded-2xl"
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="pin">
            <form className="space-y-4" onSubmit={handlePinLogin}>
              <div className="space-y-2">
                <Label>Staff Account</Label>
                <Select
                  onValueChange={(value) => {
                    setPinIdentifier(value);
                    pinForm.setValue("identifier", value, { shouldValidate: true });
                  }}
                  value={pinIdentifier}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {(staffQuery.data?.users ?? []).map((user) => (
                      <SelectItem key={user.id} value={user.username ?? user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <div className="relative mt-[0.35rem]">
                  <Input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Masukkan pin anda"
                    className="pr-10"
                    {...pinForm.register("pin")}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                    onClick={() => setShowPin((value) => !value)}
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full rounded-2xl"
                type="submit"
                disabled={pinForm.formState.isSubmitting || staffQuery.isLoading}
              >
                {pinForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Login with PIN"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
