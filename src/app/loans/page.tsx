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
          return { ...loan, [field]: value };
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
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
