'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
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
import {
  Printer,
  Send,
  CalendarIcon,
  Info,
  Loader2,
  History,
} from 'lucide-react';
import { customers } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Deposit = {
  customerId: string;
  cash: number;
  bank: number;
};

type MonthlyDepositDoc = {
  id: string;
  date: Timestamp;
  deposits: Deposit[];
  createdAt: Timestamp;
};

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

export default function DepositsPage() {
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const monthlyDepositsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'monthlyDeposits'),
      orderBy('date', 'desc')
    );
  }, [firestore]);

  const { data: pastEntries, loading: pastEntriesLoading } =
    useCollection<MonthlyDepositDoc>(monthlyDepositsQuery);

  const loadSubmittedDataForMonth = useCallback(
    async (date: Date) => {
      if (!firestore) return;
      setIsLoading(true);
      const monthId = getMonthId(date);
      const docRef = doc(firestore, 'monthlyDeposits', monthId);
      try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as MonthlyDepositDoc;
          const allCustomerDeposits = customers.map((customer) => {
            const savedDeposit = data.deposits.find(
              (d) => d.customerId === customer.id
            );
            return (
              savedDeposit || { customerId: customer.id, cash: 0, bank: 0 }
            );
          });
          setDeposits(allCustomerDeposits);
          toast({
            title: 'Data Loaded',
            description: `Showing submitted data for ${format(
              date,
              'MMMM yyyy'
            )}.`,
          });
        } else {
           // This case should ideally not be hit when clicking from history, but as a fallback:
          toast({
            variant: 'destructive',
            title: 'Not Found',
            description: `No submitted data found for ${format(date, 'MMMM yyyy')}.`,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Data',
          description: 'Could not load data from Firestore.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [firestore, toast]
  );
  
  const initializeNewMonth = useCallback((date: Date) => {
     if (!firestore) return;
      setIsLoading(true);
      setDeposits(
        customers.map((c) => ({
          customerId: c.id,
          cash: 0,
          bank: 0,
        }))
      );
      toast({
        title: 'New Entry',
        description: `Started a new entry for ${format(date, 'MMMM yyyy')}.`,
      });
      setIsLoading(false);
  }, [firestore, toast]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
        setSelectedDate(undefined);
        setDeposits([]);
        return;
    }
    const newDate = startOfMonth(date);
    setSelectedDate(newDate);
    initializeNewMonth(newDate);
  }

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

  const handleSubmit = async () => {
    if (!selectedDate || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Date Not Selected',
        description: 'Please select a date before submitting.',
      });
      return;
    }
    setIsLoading(true);
    const monthId = getMonthId(selectedDate);
    const docRef = doc(firestore, 'monthlyDeposits', monthId);
    const dataToSubmit = {
      id: monthId,
      date: Timestamp.fromDate(startOfMonth(selectedDate)),
      deposits,
      createdAt: serverTimestamp(),
    };

    setDoc(docRef, dataToSubmit, { merge: true })
      .then(() => {
        toast({
          title: 'Success',
          description: `Deposits for ${format(
            selectedDate,
            'MMMM yyyy'
          )} have been submitted.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: dataToSubmit,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePastEntryClick = (date: Date) => {
    setSelectedDate(date);
    loadSubmittedDataForMonth(date);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-3">
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
                      format(selectedDate, 'MMMM yyyy')
                    ) : (
                      <span>Pick a month</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedDate ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Sr.</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="w-[150px] text-right">
                        Cash
                      </TableHead>
                      <TableHead className="w-[150px] text-right">
                        Bank
                      </TableHead>
                      <TableHead className="w-[150px] text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => {
                      const deposit =
                        deposits.find((d) => d.customerId === customer.id) ?? {
                          customerId: customer.id,
                          cash: 0,
                          bank: 0,
                        };
                      const depositTotal = getDepositTotal(deposit);

                      return (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>{customer.name}</TableCell>
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
                              className="w-full text-right"
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
                              className="w-full text-right"
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
                    <TableRow className="bg-muted/50 text-right font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell>₹{totals.cash.toFixed(2)}</TableCell>
                      <TableCell>₹{totals.bank.toFixed(2)}</TableCell>
                      <TableCell>₹{totals.total.toFixed(2)}</TableCell>
                    </TableRow>
                  </UiTableFooter>
                </Table>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Select a Date</AlertTitle>
                <AlertDescription>
                  Please pick a month to view and manage deposits, or select one
                  from the submission history.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {selectedDate && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                disabled={isLoading}
              >
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Submission History
            </CardTitle>
            <CardDescription>
              Click a month to view its submitted data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pastEntriesLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pastEntries && pastEntries.length > 0 ? (
              <div className="flex flex-col gap-2">
                {pastEntries.map((entry) => (
                  <Button
                    key={entry.id}
                    variant={
                      getMonthId(entry.date.toDate()) ===
                      (selectedDate && getMonthId(selectedDate))
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => handlePastEntryClick(entry.date.toDate())}
                  >
                    {format(entry.date.toDate(), 'MMMM yyyy')}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No past submissions found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
