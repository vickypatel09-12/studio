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
  TableFooter as UiTableFooter
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Printer, Save, Send, CalendarIcon } from 'lucide-react';
import { customers } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type Deposit = {
  customerId: string;
  cashAmount: number;
  bankAmount: number;
};

export default function DepositsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deposits, setDeposits] = useState<Deposit[]>(
    customers.map((c) => ({
      customerId: c.id,
      cashAmount: 0,
      bankAmount: 0,
    }))
  );
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  if (!isClient) {
    return null;
  }

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
