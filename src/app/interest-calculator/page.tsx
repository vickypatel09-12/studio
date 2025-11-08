'use client';

import { useState, useEffect } from 'react';
import {
  calculateInterest,
  type CalculateInterestOutput,
} from '@/ai/flows/interest-calculation-tool';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';

const formSchema = z.object({
  carryFwdLoan: z.coerce.number().min(0, 'Loan must be a positive number.'),
  interestRate: z.coerce
    .number()
    .min(0, 'Rate must be a positive number.')
    .max(100, 'Rate cannot exceed 100%.'),
  periodInMonths: z.coerce
    .number()
    .int()
    .min(1, 'Period must be at least 1 month.'),
});

function InterestCalculator() {
  const [result, setResult] = useState<CalculateInterestOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carryFwdLoan: 10000,
      interestRate: 12,
      periodInMonths: 1,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await calculateInterest({
        ...values,
        interestRate: values.interestRate / 100, // Convert percentage to decimal for AI tool
      });
      setResult(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error Calculating Interest',
        description:
          'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Interest Calculation Tool</CardTitle>
          <CardDescription>
            Use this AI-powered tool to calculate customer interest due on
            loans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClient && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="carryFwdLoan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carry Forward Loan Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="periodInMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period (in months)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1" {...field} />
                      </FormControl>
                      <FormDescription>
                        The number of months to calculate interest for.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Calculate Interest
                </Button>
              </form>
            </Form>
          )}

          {result && (
            <div className="mt-8 rounded-lg border bg-card p-6">
              <h3 className="text-lg font-medium">Calculation Result</h3>
              <p className="mt-2 text-muted-foreground">
                The calculated interest owed is:
              </p>
              <p className="mt-1 text-4xl font-bold text-primary">
                ₹{result.interestOwed.toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function InterestCalculatorPage() {
  return (
    <AppShell>
      <InterestCalculator />
    </AppShell>
  );
}
