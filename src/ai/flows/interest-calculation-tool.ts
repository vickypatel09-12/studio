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
  interestRate: z.number().describe('The interest rate (e.g., 12 for 12%).'),
  rateType: z.enum(['monthly', 'annual']).describe("The type of interest rate provided, either 'monthly' or 'annual'."),
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
  Interest Rate: {{{interestRate}}}%
  Rate Type: {{{rateType}}}
  Period (in months): {{{periodInMonths}}}

  First, determine the monthly interest rate. If the rateType is 'annual', divide the interestRate by 12. If it is 'monthly', use the interestRate as is.
  The interest rate should be represented as a decimal (e.g., 12% is 0.12).
  
  Then, calculate the interest owed using the formula: (Carry Forward Loan Amount) * (monthly interest rate as a decimal) * (Period in months)
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
