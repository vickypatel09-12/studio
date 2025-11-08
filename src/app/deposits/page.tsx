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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Printer, Save, Send, CalendarIcon } from 'lucide-react';
import { customers } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type Deposit = {
  customerId: string;
  cash: number;
  bank: number;
};

const DEPOSITS_STORAGE_KEY = 'deposits-draft';

export default function DepositsPage() {
  const [isClient, setIsClient] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deposits, setDeposits] = useState<Deposit[]>(
    customers.map((c) => ({
      customerId: c.id,
      cash: 0,
      bank: 0,
    }))
  );
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const savedData = localStorage.getItem(DEPOSITS_STORAGE_KEY);
    if (savedData) {
      const { date, data } = JSON.parse(savedData);
      setSelectedDate(new Date(date));
      setDeposits(data);
       toast({ title: 'Draft Loaded', description: 'Your previously saved draft has been loaded.' });
    }
  }, []);


  const handleDepositChange = (
    customerId: string,
    field: keyof Omit<Deposit, 'customerId'>,
    value: string
  ) => {
    setDeposits((prev) =>
      prev.map((deposit) => {
        if (deposit.customerId === customerId) {
          return { ...deposit, [field]: Number(value) || 0 };
        }
        return deposit;
      })
    );
  };
  
  const getDepositTotal = (deposit: Deposit) => {
    return (Number(deposit.cash) || 0) + (Number(deposit.bank) || 0);
  };


  const totals = useMemo(() => {
    return deposits.reduce(
      (acc, deposit) => {
        acc.cash += Number(deposit.cash) || 0;
        acc.bank += Number(deposit.bank) || 0;
        acc.total += getDepositTotal(deposit);
        return acc;
      },
      {
        cash: 0,
        bank: 0,
        total: 0,
      }
    );
  }, [deposits]);
  
  const handleSaveDraft = () => {
    const dataToSave = {
      date: selectedDate.toISOString(),
      data: deposits,
    };
    localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(dataToSave));
    toast({
      title: 'Draft Saved',
      description: 'Your deposits data has been saved locally.',
    });
  };

  if (!isClient) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Monthly Deposits</CardTitle>
          <CardDescription>
            Manage customer deposits for the selected period.
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
                <TableHead className="w-[50px]">
                  Sr.
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[150px] text-right">Cash</TableHead>
                <TableHead className="w-[150px] text-right">Bank</TableHead>
                <TableHead className="w-[150px] text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => {
                const deposit = deposits.find((d) => d.customerId === customer.id)!;
                const depositTotal = getDepositTotal(deposit);

                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{customer.name}</TableCell>

                    {/* Deposit Section */}
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="₹0.00"
                        value={deposit.cash || ''}
                        onChange={(e) =>
                          handleDepositChange(
                            customer.id,
                            'cash',
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
                        value={deposit.bank || ''}
                        onChange={(e) =>
                          handleDepositChange(
                            customer.id,
                            'bank',
                            e.target.value
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        ₹{depositTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
             <UiTableFooter>
                <TableRow className="font-bold bg-muted/50 text-right">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell>₹{totals.cash.toFixed(2)}</TableCell>
                    <TableCell>₹{totals.bank.toFixed(2)}</TableCell>
                    <TableCell>₹{totals.total.toFixed(2)}</TableCell>
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
            <Button variant="secondary" onClick={handleSaveDraft}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button>
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
      </CardFooter>
    </Card>
  );
}
