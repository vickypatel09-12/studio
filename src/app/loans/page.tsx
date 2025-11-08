'use client';
import { useState, useMemo } from 'react';
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
import { Printer, Save, Send } from 'lucide-react';
import Link from 'next/link';
import { customers } from '@/lib/data';

type LoanChangeType = 'new' | 'increase' | 'decrease';

type Loan = {
  customerId: string;
  carryFwd: number | string;
  changeType: LoanChangeType;
  changeCash: number | string;
  changeBank: number | string;
  interestCash: number | string;
  interestBank: number | string;
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>(
    customers.map((c) => ({
      customerId: c.id,
      carryFwd: '',
      changeType: 'new',
      changeCash: '',
      changeBank: '',
      interestCash: '',
      interestBank: '',
    }))
  );

  const handleLoanChange = (
    customerId: string,
    field: keyof Omit<Loan, 'customerId'>,
    value: string | number
  ) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.customerId === customerId) {
          const newLoan = { ...loan, [field]: value };

          // Recalculate totals if the change type affects it
          if (field === 'changeType' && value === 'decrease') {
            newLoan.changeCash = Math.abs(Number(newLoan.changeCash)) * -1;
            newLoan.changeBank = Math.abs(Number(newLoan.changeBank)) * -1;
          } else if (field === 'changeType' && (value === 'new' || value === 'increase')) {
            newLoan.changeCash = Math.abs(Number(newLoan.changeCash));
            newLoan.changeBank = Math.abs(Number(newLoan.changeBank));
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
    return (Number(loan.interestCash) || 0) + (Number(loan.interestBank) || 0);
  };

  const totals = useMemo(() => {
    return loans.reduce(
      (acc, loan) => {
        acc.carryFwd += Number(loan.carryFwd) || 0;
        acc.changeCash += Number(loan.changeCash) || 0;
        acc.changeBank += Number(loan.changeBank) || 0;
        acc.interestCash += Number(loan.interestCash) || 0;
        acc.interestBank += Number(loan.interestBank) || 0;
        return acc;
      },
      {
        carryFwd: 0,
        changeCash: 0,
        changeBank: 0,
        interestCash: 0,
        interestBank: 0,
      }
    );
  }, [loans]);

  const totalChange = totals.changeCash + totals.changeBank;
  const totalInterest = totals.interestCash + totals.interestBank;


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
          <Select defaultValue="july-2024">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="july-2024">July 2024</SelectItem>
              <SelectItem value="june-2024">June 2024</SelectItem>
              <SelectItem value="may-2024">May 2024</SelectItem>
            </SelectContent>
          </Select>
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
                <TableHead className="w-[150px]">Cash</TableHead>
                <TableHead className="w-[150px]">Bank</TableHead>
                <TableHead className="w-[150px]">Total</TableHead>
                <TableHead className="w-[150px]">Cash</TableHead>
                <TableHead className="w-[150px]">Bank</TableHead>
                <TableHead className="w-[150px]">Total</TableHead>
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
                        value={loan.carryFwd}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'carryFwd',
                            e.target.value
                          )
                        }
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
                        value={loan.changeCash}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'changeCash',
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.changeBank}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'changeBank',
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex h-10 items-center rounded-md border border-input bg-background px-3">
                        <span className="text-sm font-medium">
                          ₹{changeTotal.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Interest Section */}
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.interestCash}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'interestCash',
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={loan.interestBank}
                        onChange={(e) =>
                          handleLoanChange(
                            customer.id,
                            'interestBank',
                            e.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex h-10 items-center rounded-md border border-input bg-background px-3">
                        <span className="text-sm font-medium">
                          ₹{interestTotal.toFixed(2)}
                        </span>
                      </div>
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
                    <TableCell>₹{totalInterest.toFixed(2)}</TableCell>
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
