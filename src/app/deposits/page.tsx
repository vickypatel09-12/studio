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
import { customers, type Customer } from '@/lib/data';

type Deposit = {
  customerId: string;
  depositAmount: number | string;
  paymentMethod: 'cash' | 'bank' | 'split';
  cashAmount: number | string;
  bankAmount: number | string;
};

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>(
    customers.map((c) => ({
      customerId: c.id,
      depositAmount: '',
      paymentMethod: 'cash',
      cashAmount: '',
      bankAmount: '',
    }))
  );

  const handleDepositChange = (
    customerId: string,
    field: keyof Omit<Deposit, 'customerId'>,
    value: string | number
  ) => {
    setDeposits((prev) =>
      prev.map((deposit) => {
        if (deposit.customerId === customerId) {
          const newDeposit = { ...deposit, [field]: value };

          if (
            (field === 'cashAmount' || field === 'bankAmount') &&
            newDeposit.paymentMethod === 'split'
          ) {
            const cash = Number(newDeposit.cashAmount) || 0;
            const bank = Number(newDeposit.bankAmount) || 0;
            newDeposit.depositAmount = cash + bank;
          }

          if (field === 'paymentMethod' && value !== 'split') {
            newDeposit.cashAmount = '';
            newDeposit.bankAmount = '';
          }
          
          if (field === 'paymentMethod' && value === 'split') {
             const cash = Number(newDeposit.cashAmount) || 0;
            const bank = Number(newDeposit.bankAmount) || 0;
            newDeposit.depositAmount = cash + bank;
          }


          return newDeposit;
        }
        return deposit;
      })
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Monthly Deposits</CardTitle>
          <CardDescription>
            Enter monthly deposit details for the selected period.
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
                <TableHead className="w-[80px]">Sr. No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead className="w-[200px]">Payment Method</TableHead>
                <TableHead className="w-[300px]">Deposit Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => {
                const deposit = deposits.find(
                  (d) => d.customerId === customer.id
                )!;
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>
                      <Select
                        value={deposit.paymentMethod}
                        onValueChange={(value) =>
                          handleDepositChange(
                            customer.id,
                            'paymentMethod',
                            value
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
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
                        {deposit.paymentMethod === 'split' ? (
                          <>
                            <Input
                              type="number"
                              placeholder="Cash"
                              value={deposit.cashAmount}
                              onChange={(e) =>
                                handleDepositChange(
                                  customer.id,
                                  'cashAmount',
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              type="number"
                              placeholder="Bank"
                              value={deposit.bankAmount}
                              onChange={(e) =>
                                handleDepositChange(
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
                                  value={deposit.depositAmount}
                                  readOnly
                                  className="border-none focus-visible:ring-0"
                                />
                              </div>
                          </>
                        ) : (
                          <div className="flex items-center rounded-md border border-input bg-background px-3">
                             <span className="text-sm text-muted-foreground capitalize">{deposit.paymentMethod}:</span>
                            <Input
                              type="number"
                              placeholder="₹0.00"
                              value={deposit.depositAmount}
                              onChange={(e) =>
                                handleDepositChange(
                                  customer.id,
                                  'depositAmount',
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
