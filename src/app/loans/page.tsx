'use client';
import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { customers, type Customer } from '@/lib/data';

type Loan = {
  customerId: string;
  carryFwd: number | string;
  newChange: number | string;
  interest: number | string;
  paymentAmount: number | string;
  paymentMethod: 'cash' | 'bank' | 'split';
  cashAmount: number | string;
  bankAmount: number | string;
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>(
    customers.map((c) => ({
      customerId: c.id,
      carryFwd: '',
      newChange: '',
      interest: '',
      paymentAmount: '',
      paymentMethod: 'cash',
      cashAmount: '',
      bankAmount: '',
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
          if (
            (field === 'cashAmount' || field === 'bankAmount') &&
            newLoan.paymentMethod === 'split'
          ) {
            const cash = Number(newLoan.cashAmount) || 0;
            const bank = Number(newLoan.bankAmount) || 0;
            newLoan.paymentAmount = cash + bank;
          }

          if (field === 'paymentMethod' && value !== 'split') {
            newLoan.cashAmount = '';
            newLoan.bankAmount = '';
          }
           if (field === 'paymentMethod' && value === 'split') {
             const cash = Number(newLoan.cashAmount) || 0;
            const bank = Number(newLoan.bankAmount) || 0;
            newLoan.paymentAmount = cash + bank;
          }

          return newLoan;
        }
        return loan;
      })
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Loans & Interest</CardTitle>
          <CardDescription>
            Manage customer loans for the selected period. Use the{' '}
            <Button variant="link" asChild className="p-0 h-auto">
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="secondary" className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button className="w-full">
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sr.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Carry Fwd</TableHead>
                <TableHead>New/Change</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead className="w-[200px]">Payment Method</TableHead>
                <TableHead className="w-[300px]">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => {
                const loan = loans.find((l) => l.customerId === customer.id)!;
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>
                      <Input type="number" placeholder="₹0.00" value={loan.carryFwd} onChange={(e) => handleLoanChange(customer.id, 'carryFwd', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="₹0.00" value={loan.newChange} onChange={(e) => handleLoanChange(customer.id, 'newChange', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="₹0.00" value={loan.interest} onChange={(e) => handleLoanChange(customer.id, 'interest', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={loan.paymentMethod}
                        onValueChange={(value) =>
                          handleLoanChange(customer.id, 'paymentMethod', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="split">Split</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {loan.paymentMethod === 'split' ? (
                          <>
                            <Input
                              type="number"
                              placeholder="Cash"
                              value={loan.cashAmount}
                              onChange={(e) =>
                                handleLoanChange(
                                  customer.id,
                                  'cashAmount',
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              type="number"
                              placeholder="Bank"
                              value={loan.bankAmount}
                              onChange={(e) =>
                                handleLoanChange(
                                  customer.id,
                                  'bankAmount',
                                  e.target.value
                                )
                              }
                            />
                            <div className="flex items-center rounded-md border border-input bg-background px-3">
                               <span className="text-sm text-muted-foreground">Split:</span>
                                <Input
                                  type="number"
                                  placeholder="₹0.00"
                                  value={loan.paymentAmount}
                                  readOnly
                                  className="border-none focus-visible:ring-0"
                                />
                              </div>
                          </>
                        ) : (
                          <div className="flex items-center rounded-md border border-input bg-background px-3">
                            <span className="text-sm text-muted-foreground capitalize">{loan.paymentMethod}:</span>
                            <Input
                              type="number"
                              placeholder="₹0.00"
                              value={loan.paymentAmount}
                              onChange={(e) =>
                                handleLoanChange(
                                  customer.id,
                                  'paymentAmount',
                                  e.target.value
                                )
                              }
                              className="border-none focus-visible:ring-0"
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
