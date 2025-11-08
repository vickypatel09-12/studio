'use server';

/**
 * @fileOverview AI-powered tool to calculate customer interest based on loan details.
 *
 * - calculateInterest - Calculates interest owed by a customer based on loan details.
 * - CalculateInterestInput - The input type for the calculateInterest function.
 * - CalculateInterestOutput - The return type for the calculateInterest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateInterestInputSchema = z.object({
  carryFwdLoan: z.number().describe('The carry forward loan amount.'),
  interestRate: z.number().describe('The annual interest rate (e.g., 0.05 for 5%).'),
  periodInMonths: z.number().describe('The period for which interest is to be calculated, in months.'),
});
export type CalculateInterestInput = z.infer<typeof CalculateInterestInputSchema>;

const CalculateInterestOutputSchema = z.object({
  interestOwed: z.number().describe('The calculated interest amount owed for the period.'),
});
export type CalculateInterestOutput = z.infer<typeof CalculateInterestOutputSchema>;

export async function calculateInterest(input: CalculateInterestInput): Promise<CalculateInterestOutput> {
  return calculateInterestFlow(input);
}

const calculateInterestPrompt = ai.definePrompt({
  name: 'calculateInterestPrompt',
  input: {schema: CalculateInterestInputSchema},
  output: {schema: CalculateInterestOutputSchema},
  prompt: `You are a financial assistant tasked with calculating the interest owed on a loan.

  Given the following loan details, calculate the interest owed for the specified period.

  Carry Forward Loan Amount: {{{carryFwdLoan}}}
  Annual Interest Rate: {{{interestRate}}}
  Period (in months): {{{periodInMonths}}}

  Calculate the interest owed using the formula: (Carry Forward Loan Amount) * (Annual Interest Rate / 12) * (Period in months)
  Return only the calculated interest amount.
  `,
});

const calculateInterestFlow = ai.defineFlow(
  {
    name: 'calculateInterestFlow',
    inputSchema: CalculateInterestInputSchema,
    outputSchema: CalculateInterestOutputSchema,
  },
  async input => {
    // No need to call any external services, the prompt provides the calculation.
    const {output} = await calculateInterestPrompt(input);
    return output!;
  }
);
