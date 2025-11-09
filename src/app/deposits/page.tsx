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
  updateDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
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
  Save,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Customer } from '@/lib/data';
import { AppShell } from '@/components/AppShell';

type Deposit = {
  customerId: string;
  cash: number;
  bank: number;
};

type Session = {
  id: 'status';
  status: 'active' | 'closed';
};

type MonthlyDepositDoc = {
  id: string;
  date: Timestamp;
  deposits?: Deposit[] | null;
  draft?: Deposit[] | null;
  createdAt: Timestamp;
  submittedAt?: Timestamp;
};

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

function Deposits() {
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const { toast } = useToast();

  const sessionDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'session', 'status');
  }, [firestore]);

  const { data: session } = useDoc<Session>(sessionDocRef);
  const isSessionActive = session?.status === 'active';

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('sortOrder'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } =
    useCollection<Customer>(customersQuery);

  const monthlyDepositsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'monthlyDeposits'),
      orderBy('date', 'desc')
    );
  }, [firestore]);

  const { data: pastEntries, isLoading: pastEntriesLoading } =
    useCollection<MonthlyDepositDoc>(monthlyDepositsQuery);

  const initializeNewMonth = useCallback(
    (date: Date) => {
      if (!customers) return;
      setDeposits(
        customers.map((c) => ({
          customerId: c.id,
          cash: 0,
          bank: 0,
        }))
      );
    },
    [customers]
  );
  
  const loadSubmittedDataForMonth = useCallback(
    async (date: Date) => {
      if (!firestore || !customers) return;
      setIsLoading(true);
      setIsDraftSaved(false);
      setIsSubmitted(false);
      const monthId = getMonthId(date);
      const docRef = doc(firestore, 'monthlyDeposits', monthId);
      try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as MonthlyDepositDoc;
          const dataToLoad = data.draft || data.deposits;
          const dataSource = data.draft ? 'draft' : 'submitted';

          if (dataToLoad) {
            const allCustomerDeposits = customers.map((customer) => {
              const savedDeposit = dataToLoad.find(
                (d) => d.customerId === customer.id
              );
              return (
                savedDeposit || { customerId: customer.id, cash: 0, bank: 0 }
              );
            });
            setDeposits(allCustomerDeposits);
            setIsDraftSaved(dataSource === 'draft' && isSessionActive);
            setIsSubmitted(dataSource === 'submitted');

            toast({
              title: `Loaded ${dataSource} data`,
              description: `Showing ${dataSource} data for ${format(
                date,
                'MMMM yyyy'
              )}.`,
            });
          } else {
             initializeNewMonth(date);
          }
        } else {
          toast({
            title: 'New Entry',
            description: `Starting new entry for ${format(date, 'MMMM yyyy')}.`,
          });
          initializeNewMonth(date);
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
    [firestore, toast, customers, isSessionActive, initializeNewMonth]
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      setDeposits([]);
      return;
    }
    const newDate = startOfMonth(date);
    setSelectedDate(newDate);
    loadSubmittedDataForMonth(newDate);
  };

  const handleDepositChange = (
    customerId: string,
    field: keyof Omit<Deposit, 'customerId'>,
    value: string
  ) => {
    setIsDraftSaved(false);
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

  const handleSaveDraft = async () => {
    if (!selectedDate || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Date Not Selected',
        description: 'Please select a date before saving.',
      });
      return;
    }
    if (!isSessionActive) {
      toast({
        variant: 'destructive',
        title: 'Session is Not Active',
        description:
          'You cannot save entries when a session is closed or not started.',
      });
      return;
    }

    setIsLoading(true);
    const monthId = getMonthId(selectedDate);
    const docRef = doc(firestore, 'monthlyDeposits', monthId);
    const dataToSave: Partial<MonthlyDepositDoc> = {
      id: monthId,
      date: Timestamp.fromDate(startOfMonth(selectedDate)),
      draft: deposits,
      createdAt: serverTimestamp(),
    };

    setDoc(docRef, dataToSave, { merge: true })
      .then(() => {
        toast({
          title: 'Draft Saved',
          description: `Draft for ${format(
            selectedDate,
            'MMMM yyyy'
          )} has been saved.`,
        });
        setIsDraftSaved(true);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleSubmit = async () => {
    if (!selectedDate || !firestore || !isDraftSaved) {
      toast({
        variant: 'destructive',
        title: 'Cannot Submit',
        description: 'Please save a draft before submitting.',
      });
      return;
    }

    setIsLoading(true);
    const monthId = getMonthId(selectedDate);
    const docRef = doc(firestore, 'monthlyDeposits', monthId);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || !docSnap.data()?.draft) {
       toast({ variant: 'destructive', title: 'Error', description: 'No draft found to submit.'});
       setIsLoading(false);
       return;
    }
    
    const draftData = docSnap.data()?.draft;

    const dataToSubmit: Partial<MonthlyDepositDoc> = {
      deposits: draftData,
      submittedAt: serverTimestamp(),
    };

    updateDoc(docRef, { ...dataToSubmit, draft: null })
      .then(() => {
        toast({
          title: 'Success',
          description: `Deposits for ${format(
            selectedDate,
            'MMMM yyyy'
          )} have been submitted.`,
        });
        setIsDraftSaved(false);
        setIsSubmitted(true);
        router.push(`/loans?month=${monthId}`);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToSubmit,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const confirmRevert = async () => {
    if (!selectedDate || !firestore) return;
    setIsLoading(true);
    const monthId = getMonthId(selectedDate);
    const docRef = doc(firestore, 'monthlyDeposits', monthId);

    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || !docSnap.data()?.deposits) {
        throw new Error('No submitted data found to revert.');
      }
      const submittedData = docSnap.data()?.deposits;
      const dataToRevert: Partial<MonthlyDepositDoc> = {
        draft: submittedData,
        submittedAt: undefined,
        deposits: undefined,
      };

      await updateDoc(docRef, { ...dataToRevert });
      toast({
        title: 'Reverted to Draft',
        description: `Entry for ${format(selectedDate, 'MMMM yyyy')} is now editable.`,
      });
      setIsSubmitted(false);
      setIsDraftSaved(true); // It's now a draft
      setIsReverting(false);
    } catch (error: any) {
       const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { draft: '...data', deposits: null },
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsLoading(false);
    }
  };


  const handlePastEntryClick = (date: Date) => {
    setSelectedDate(date);
    loadSubmittedDataForMonth(date);
  };

  const pageLoading = customersLoading;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
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
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 5}
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
            ) : selectedDate && customers ? (
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
                              disabled={!isSessionActive || isSubmitted}
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
                              disabled={!isSessionActive || isSubmitted}
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
                  {isSessionActive
                    ? 'Please pick a month to manage deposits or view the submission history.'
                    : 'A session is not active. Please start a new session to make entries. You can still view past submissions.'}
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
               {isSubmitted && isSessionActive && (
                  <Button variant="secondary" onClick={() => setIsReverting(true)} disabled={isLoading}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Submitted
                  </Button>
                )}
              <Button variant="secondary" onClick={handleSaveDraft} disabled={isLoading || !isSessionActive || isSubmitted}>
                 {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !isSessionActive || !isDraftSaved || isSubmitted}
              >
                {isLoading && !isDraftSaved ? (
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
    
      {/* Revert Confirmation Dialog */}
      <AlertDialog open={isReverting} onOpenChange={setIsReverting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to edit this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the submitted entry for {selectedDate && format(selectedDate, 'MMMM yyyy')} back to a draft. You will be able to make changes and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevert} className={buttonVariants({ variant: 'destructive' })}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function DepositsPage() {
  return (
    <AppShell>
      <Deposits />
    </AppShell>
  );
}
