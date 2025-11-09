'use client';
import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Landmark } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuthError = (error: AuthError) => {
    let title = 'An error occurred';
    let description = error.message;

    if (error.code === 'auth/invalid-credential') {
        title = 'Login Failed';
        description = 'The email or password you entered is incorrect. Please try again.';
    } else if (error.code === 'auth/email-already-in-use') {
        title = 'Sign Up Failed';
        description = 'An account with this email address already exists.';
    }

    toast({
        variant: 'destructive',
        title: title,
        description: description,
    });
  }

  const onLoginSubmit = (data: LoginValues) => {
    setIsLoading(true);
    signInWithEmailAndPassword(auth, data.email, data.password)
      .catch((error: AuthError) => {
        handleAuthError(error);
      })
      .finally(() => {
        // onAuthStateChanged (via useUser) will handle success and redirect, so we only need to stop loading here
        setIsLoading(false);
      });
  };

  const onSignupSubmit = (data: SignupValues) => {
    setIsLoading(true);
    createUserWithEmailAndPassword(auth, data.email, data.password)
      .catch((error: AuthError) => {
        handleAuthError(error);
      })
      .finally(() => {
        // onAuthStateChanged (via useUser) will handle success and redirect
        setIsLoading(false);
      });
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2">
        <Landmark className="size-8 text-primary" />
        <span className="font-headline text-2xl font-semibold">
          Bachat Bank
        </span>
      </div>
      <Tabs defaultValue="login" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="m@example.com" {...loginForm.register('email')} />
                  {loginForm.formState.errors.email && <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" {...loginForm.register('password')} />
                  {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create a new account to get started.
              </CardDescription>
            </CardHeader>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="m@example.com" {...signupForm.register('email')} />
                  {signupForm.formState.errors.email && <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" {...signupForm.register('password')} />
                  {signupForm.formState.errors.password && <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
