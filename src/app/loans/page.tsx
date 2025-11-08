'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter as UiTableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Printer, Save, Send, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { customers } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type LoanChangeType = 'new' | 'increase' | 'decrease';

type Loan = {
  customerId: string;
  carryFwd: number;
  changeType: LoanChangeType;
  changeCash: number;
  changeBank: number;
  interestCash: number;
  interestBank: number;
  interestTotal: number; // Calculated total interest
};

// Assuming a default annual interest rate from settings, e.g., 12%
const ANNUAL_INTEREST_RATE = 0.12;

export default function LoansPage() {
  const [isClient, setIsClient] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loans, setLoans] = useState<Loan[]>(
    customers.map((c) => ({
      customerId: c.id,
      carryFwd: 10000, // Example carryFwd, should be fetched
      changeType: 'new',
      changeCash: 0,
      changeBank: 0,
      interestCash: 0,
      interestBank: 0,
      interestTotal: (10000 * ANNUAL_INTEREST_RATE) / 12, // Pre-calculate interest
    }))
  );

  // Update interest total whenever carryFwd changes
  useEffect(() => {
    setIsClient(true);
    setLoans((prevLoans) =>
      prevLoans.map((loan) => {
        const monthlyInterest = (loan.carryFwd * ANNUAL_INTEREST_RATE) / 12;
        // Keep user's cash/bank distribution if it's valid, otherwise reset
        const currentInterestSum = loan.interestCash + loan.interestBank;
        if (Math.abs(currentInterestSum - monthlyInterest) > 0.01) {
          return {
            ...loan,
            interestTotal: monthlyInterest,
            interestCash: monthlyInterest, // Default to cash
            interestBank: 0,
          };
        }
        return { ...loan, interestTotal: monthlyInterest };
      })
    );
  }, []); // This should be triggered when carryFwd data is fetched/updated. For now, it runs once.


  const handleLoanChange = (
    customerId: string,
    field: keyof Omit<Loan, 'customerId' | 'interestTotal'>,
    value: string | number
  ) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.customerId === customerId) {
          const newLoan = { ...loan };
          const numericValue = Number(value) || 0;

          if (field === 'changeType') {
            newLoan.changeType = value as LoanChangeType;
            if (value === 'decrease') {
              newLoan.changeCash = -Math.abs(newLoan.changeCash);
              newLoan.changeBank = -Math.abs(newLoan.changeBank);
            } else {
              newLoan.changeCash = Math.abs(newLoan.changeCash);
              newLoan.changeBank = Math.abs(newLoan.changeBank);
            }
          } else if (field === 'interestCash') {
            newLoan.interestCash = numericValue;
            newLoan.interestBank = newLoan.interestTotal - numericValue;
          } else if (field === 'interestBank') {
            newLoan.interestBank = numericValue;
            newLoan.interestCash = newLoan.interestTotal - numericValue;
          } else {
             (newLoan as any)[field] = numericValue;
          }

          return newLoan;
        }
        return loan;
      })
    );
  };
  
  const getChangeTotal = (loan: Loan) => {
    return (Number(loan.changeCash) || 0) + (Number(loan.changeBank) || 0);
  };

  const getInterestTotal = (loan: Loan) => {
    // Return the calculated total, not the sum of inputs
    return loan.interestTotal;
  };

  const totals = useMemo(() => {
    return loans.reduce(
      (acc, loan) => {
        acc.carryFwd += Number(loan.carryFwd) || 0;
        acc.changeCash += Number(loan.changeCash) || 0;
        acc.changeBank += Number(loan.changeBank) || 0;
        acc.interestCash += Number(loan.interestCash) || 0;
        acc.interestBank += Number(loan.interestBank) || 0;
        acc.interestTotal += Number(loan.interestTotal) || 0;
        return acc;
      },
      {
        carryFwd: 0,
        changeCash: 0,
        changeBank: 0,
        interestCash: 0,
        interestBank: 0,
        interestTotal: 0
      }
    );
  }, [loans]);

  const totalChange = totals.changeCash + totals.changeBank;
  
  if (!isClient) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Loans & Interest</CardTitle>
          <CardDescription>
            Manage customer loans for the selected period. Use the{' '}
            <Button variant="link" asChild className="h-auto p-0">
              <Link href="/interest-calculator">Interest Calculator</Link>
            </Button>{' '}
            to compute interest.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal sm:w-[240px]',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="w-[50px]">
                  Sr.
                </TableHead>
                <TableHead rowSpan={2}>Customer</TableHead>
                <TableHead rowSpan={2}>Carry Fwd</TableHead>
                <TableHead colSpan={4} className="text-center">
                  New Loan / Change
                </TableHead>
                <TableHead colSpan={3} className="text-center">
                  Interest
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="w-[200px]">Type</TableHead>
                <TableHead className="w-[150px] text-right">Cash</TableHead>
                <TableHead className="w-[150px] text-right">Bank</TableHead>
                <TableHead className="w-[150px] text-right">Total</TableHead>
                <TableHead className="w-[150px] text-right">Cash</TableHead>
                <TableHead className="w-[150px] text-right">Bank</TableHead>
                <TableHead className="w-[150px] text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => {
                const loan = loans.find((l) => l.customerId === customer.id)!;
                const changeTotal = getChangeTotal(loan);
                const interestTotal = getInterestTotal(loan);

                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.carryFwd || ''}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'carryFwd',
                            e.target.value
                          )
                        }
                        disabled
                        className="text-right"
                      />
                    </TableCell>

                    {/* New Loan / Change Section */}
                    <TableCell>
                      <Select
                        value={loan.changeType}
                        onValueChange={(value: LoanChangeType) =>
                          handleLoanChange(customer.id, 'changeType', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New Loan</SelectItem>
                          <SelectItem value="increase">Increase</SelectItem>
                          <SelectItem value="decrease">Decrease</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.changeCash || ''}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'changeCash',
                            e.target.value
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.changeBank || ''}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'changeBank',
                            e.target.value
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        ₹{changeTotal.toFixed(2)}
                    </TableCell>

                    {/* Interest Section */}
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.interestCash || ''}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'interestCash',
                            e.target.value
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.interestBank || ''}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'interestBank',
                            e.target.value
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                       ₹{interestTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
             <UiTableFooter>
                <TableRow className="font-bold bg-muted/50 text-right">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell>₹{totals.carryFwd.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell>₹{totals.changeCash.toFixed(2)}</TableCell>
                    <TableCell>₹{totals.changeBank.toFixed(2)}</TableCell>
                    <TableCell>₹{totalChange.toFixed(2)}</TableCell>
                    <TableCell>₹{totals.interestCash.toFixed(2)}</TableCell>
                    <TableCell>₹{totals.interestBank.toFixed(2)}</TableCell>
                    <TableCell>₹{totals.interestTotal.toFixed(2)}</TableCell>
                </TableRow>
            </UiTableFooter>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
          <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="secondary">
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button>
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
      </CardFooter>
    </Card>
  );
}
