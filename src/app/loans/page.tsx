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
import {
  Printer,
  Send,
  CalendarIcon,
  Info,
  Loader2,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { customers } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format, startOfMonth, subMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type LoanChangeType = 'new' | 'increase' | 'decrease';

type Loan = {
  customerId: string;
  carryFwd: number;
  changeType: LoanChangeType;
  changeCash: number;
  changeBank: number;
  interestCash: number;
  interestBank: number;
  interestTotal: number;
};

type MonthlyLoanDoc = {
  id: string;
  date: Timestamp;
  loans: Loan[];
  createdAt: Timestamp;
};

const ANNUAL_INTEREST_RATE = 0.12;

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

const calculateClosingBalance = (loan: Loan) => {
  const changeTotal =
    (Number(loan.changeCash) || 0) + (Number(loan.changeBank) || 0);
  let adjustment = 0;
  if (loan.changeType === 'new' || loan.changeType === 'increase') {
    adjustment = changeTotal;
  } else if (loan.changeType === 'decrease') {
    adjustment = -changeTotal;
  }
  return (Number(loan.carryFwd) || 0) + adjustment;
};

export default function LoansPage() {
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const monthlyLoansQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'monthlyLoans'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: pastEntries, loading: pastEntriesLoading } =
    useCollection<MonthlyLoanDoc>(monthlyLoansQuery);

  const loadSubmittedDataForMonth = useCallback(
    async (date: Date) => {
      if (!firestore) return;
      setIsLoading(true);
      const monthId = getMonthId(date);
      const docRef = doc(firestore, 'monthlyLoans', monthId);
      try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as MonthlyLoanDoc;
          const allCustomerLoans = customers.map((customer) => {
            const savedLoan = data.loans.find(
              (d) => d.customerId === customer.id
            );
            return (
              savedLoan || {
                customerId: customer.id,
                carryFwd: 0,
                changeType: 'new' as LoanChangeType,
                changeCash: 0,
                changeBank: 0,
                interestCash: 0,
                interestBank: 0,
                interestTotal: 0,
              }
            );
          });
          setLoans(allCustomerLoans);
          toast({
            title: 'Data Loaded',
            description: `Showing submitted data for ${format(
              date,
              'MMMM yyyy'
            )}.`,
          });
        } else {
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
  
  const initializeNewMonth = useCallback(async (date: Date) => {
    if (!firestore) return;
    setIsLoading(true);
    const prevMonth = subMonths(date, 1);
    const prevMonthId = getMonthId(prevMonth);
    const prevDocRef = doc(firestore, 'monthlyLoans', prevMonthId);
    
    try {
      const prevDocSnap = await getDoc(prevDocRef);
      let initialLoans: Loan[] = [];
      if (prevDocSnap.exists()) {
        const prevData = prevDocSnap.data() as MonthlyLoanDoc;
        initialLoans = customers.map((c) => {
          const prevLoan = prevData.loans.find((l) => l.customerId === c.id);
          const carryFwd = prevLoan ? calculateClosingBalance(prevLoan) : 0;
          const interestTotal = (carryFwd * ANNUAL_INTEREST_RATE) / 12;
          return {
            customerId: c.id,
            carryFwd: carryFwd,
            changeType: 'new' as LoanChangeType,
            changeCash: 0,
            changeBank: 0,
            interestCash: interestTotal,
            interestBank: 0,
            interestTotal: interestTotal,
          };
        });
        toast({
          title: 'New Month Initialized',
          description: `Carry forward balances from ${format(
            prevMonth,
            'MMMM yyyy'
          )} have been loaded.`,
        });
      } else {
        initialLoans = customers.map((c) => ({
          customerId: c.id,
          carryFwd: 0,
          changeType: 'new' as LoanChangeType,
          changeCash: 0,
          changeBank: 0,
          interestCash: 0,
          interestBank: 0,
          interestTotal: 0,
        }));
        toast({
          title: 'New Month',
          description: `No data found for ${format(
            date,
            'MMMM yyyy'
          )}. Starting fresh.`,
        });
      }
      setLoans(initialLoans);
    } catch (error) {
       console.error('Error initializing new month:', error);
        toast({
          variant: 'destructive',
          title: 'Initialization Error',
          description: 'Could not initialize new month data.',
        });
    } finally {
      setIsLoading(false);
    }

  }, [firestore, toast]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
        setSelectedDate(undefined);
        setLoans([]);
        return;
    }
    const newDate = startOfMonth(date);
    setSelectedDate(newDate);
    initializeNewMonth(newDate);
  }

  const handleLoanChange = (
    customerId: string,
    field: keyof Omit<Loan, 'customerId' | 'interestTotal'>,
    value: string | number
  ) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.customerId === customerId) {
          const newLoan = { ...loan };
          let numericValue =
            typeof value === 'string' ? parseFloat(value) || 0 : value;

          if (field === 'changeType') {
            newLoan.changeType = value as LoanChangeType;
          } else if (field === 'interestCash') {
            newLoan.interestCash = numericValue;
            newLoan.interestBank = (newLoan.interestTotal || 0) - numericValue;
          } else if (field === 'interestBank') {
            newLoan.interestBank = numericValue;
            newLoan.interestCash = (newLoan.interestTotal || 0) - numericValue;
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
    const docRef = doc(firestore, 'monthlyLoans', monthId);
    const dataToSubmit = {
      id: monthId,
      date: Timestamp.fromDate(startOfMonth(selectedDate)),
      loans,
      createdAt: serverTimestamp(),
    };

    setDoc(docRef, dataToSubmit, { merge: true })
      .then(() => {
        toast({
          title: 'Success',
          description: `Loans for ${format(
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
        interestTotal: 0,
      }
    );
  }, [loans]);

  const handlePastEntryClick = (date: Date) => {
    setSelectedDate(date);
    loadSubmittedDataForMonth(date);
  };

  const totalChange = totals.changeCash + totals.changeBank;

  if (!isClient) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Loans &amp; Interest</CardTitle>
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
                      <TableHead rowSpan={2} className="w-[50px]">
                        Sr.
                      </TableHead>
                      <TableHead rowSpan={2}>Customer</TableHead>
                      <TableHead rowSpan={2} className="w-[150px]">
                        Carry Fwd
                      </TableHead>
                      <TableHead colSpan={4} className="text-center">
                        New Loan / Change
                      </TableHead>
                      <TableHead colSpan={3} className="text-center">
                        Interest
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="w-[150px]">Type</TableHead>
                      <TableHead className="w-[150px] text-right">
                        Cash
                      </TableHead>
                      <TableHead className="w-[150px] text-right">
                        Bank
                      </TableHead>
                      <TableHead className="w-[150px] text-right">
                        Total
                      </TableHead>
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
                      const loan = loans.find(
                        (l) => l.customerId === customer.id
                      );
                      if (!loan) return null;
                      const changeTotal = getChangeTotal(loan);

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
                              value={loan.carryFwd || ''}
                              disabled
                              className="w-full text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={loan.changeType}
                              onValueChange={(value: LoanChangeType) =>
                                handleLoanChange(
                                  customer.id,
                                  'changeType',
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New Loan</SelectItem>
                                <SelectItem value="increase">
                                  Increase
                                </SelectItem>
                                <SelectItem value="decrease">
                                  Decrease
                                </SelectItem>
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
                              className="w-full text-right"
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
                              className="w-full text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{changeTotal.toFixed(2)}
                          </TableCell>
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
                              className="w-full text-right"
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
                              className="w-full text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{loan.interestTotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <UiTableFooter>
                    <TableRow className="bg-muted/50 text-right font-bold">
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
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Select a Date</AlertTitle>
                <AlertDescription>
                  Please pick a month to view and manage loans, or select one
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
