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
  TableFooter as UiTableFooter
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
import { customers } from '@/lib/data';

type Deposit = {
  customerId: string;
  cashAmount: number;
  bankAmount: number;
};

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>(
    customers.map((c) => ({
      customerId: c.id,
      cashAmount: 0,
      bankAmount: 0,
    }))
  );

  const handleDepositChange = (
    customerId: string,
    field: keyof Omit<Deposit, 'customerId'>,
    value: string
  ) => {
    const numericValue = Number(value) || 0;
    setDeposits((prev) =>
      prev.map((deposit) =>
        deposit.customerId === customerId
          ? { ...deposit, [field]: numericValue }
          : deposit
      )
    );
  };
  
  const totalDeposits = useMemo(() => {
    return deposits.reduce((acc, deposit) => {
      acc.cash += deposit.cashAmount;
      acc.bank += deposit.bankAmount;
      acc.total += deposit.cashAmount + deposit.bankAmount;
      return acc;
    }, { cash: 0, bank: 0, total: 0 });
  }, [deposits]);


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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
               <TableRow>
                <TableHead rowSpan={2} className="w-[80px]">Sr. No.</TableHead>
                <TableHead rowSpan={2}>Customer Name</TableHead>
                <TableHead colSpan={3} className="text-center">Deposit Amount</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="w-[150px] text-right">Cash</TableHead>
                <TableHead className="w-[150px] text-right">Bank</TableHead>
                <TableHead className="w-[150px] text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => {
                const deposit = deposits.find(
                  (d) => d.customerId === customer.id
                )!;
                const total = deposit.cashAmount + deposit.bankAmount;
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>
                       <Input
                          type="number"
                          placeholder="₹0.00"
                          value={deposit.cashAmount || ''}
                          onChange={(e) =>
                            handleDepositChange(
                              customer.id,
                              'cashAmount',
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
                          value={deposit.bankAmount || ''}
                          onChange={(e) =>
                            handleDepositChange(
                              customer.id,
                              'bankAmount',
                              e.target.value
                            )
                          }
                          className="text-right"
                        />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                       ₹{total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
             <UiTableFooter>
              <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{totalDeposits.cash.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{totalDeposits.bank.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{totalDeposits.total.toFixed(2)}
                  </TableCell>
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
