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
  deleteDoc,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { useSearchParams } from 'next/navigation';
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
  Save,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, startOfMonth, subMonths, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Customer } from '@/lib/data';
import { AppShell } from '@/components/AppShell';
import { BalanceSummary } from '@/components/BalanceSummary';
import { Label } from '@/components/ui/label';

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
  loans?: Loan[] | null;
  draft?: Loan[] | null;
  createdAt: Timestamp;
  submittedAt?: Timestamp;
};

type MonthlyDepositDoc = {
    id: string;
    submittedAt?: Timestamp;
    deposits?: any[];
}

type Session = {
  id: 'status';
  status: 'active' | 'closed';
  interestRate?: number;
  interestRateType?: 'monthly' | 'annual';
};

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

function Loans() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<MonthlyLoanDoc | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDepositSubmitted, setIsDepositSubmitted] = useState(false);
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

  const monthlyLoansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'monthlyLoans'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: pastEntries, isLoading: pastEntriesLoading } =
    useCollection<MonthlyLoanDoc>(monthlyLoansQuery);

  const initializeNewMonth = useCallback(
    async (date: Date) => {
      if (!firestore || !customers) return;
      setIsLoading(true);
      const prevMonth = subMonths(date, 1);
      const prevMonthId = getMonthId(prevMonth);
      const prevDocRef = doc(firestore, 'monthlyLoans', prevMonthId);

      const sessionInterestRate = session?.interestRate ? session.interestRate / 100 : 0;
      const monthlyInterestRate = session?.interestRateType === 'annual' ? sessionInterestRate / 12 : sessionInterestRate;


      try {
        const prevDocSnap = await getDoc(prevDocRef);
        let initialLoans: Loan[] = [];
        if (prevDocSnap.exists()) {
          const prevData = prevDocSnap.data() as MonthlyLoanDoc;
          const prevLoansData = prevData.loans || prevData.draft; // Prefer submitted loans, fallback to draft
          if (prevLoansData) {
            initialLoans = customers.map((c) => {
                const prevLoan = prevLoansData.find((l) => l.customerId === c.id);
                const carryFwd = prevLoan ? calculateClosingBalance(prevLoan) : 0;
                const interestTotal = carryFwd * monthlyInterestRate;
                return {
                customerId: c.id,
                carryFwd: carryFwd,
                changeType: carryFwd > 0 ? 'increase' : 'new' as LoanChangeType,
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
          }
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
            description: `No data for previous month. Starting fresh.`,
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
    },
    [firestore, toast, customers, session]
  );
  
  const loadSubmittedDataForMonth = useCallback(
    async (date: Date) => {
      if (!firestore || !customers) return;
      setIsLoading(true);
      setIsDraftSaved(false);
      setIsSubmitted(false);
      setIsDepositSubmitted(false);
      setLoans([]);

      const monthId = getMonthId(date);
      
      // Step 1: Check if the deposit for this month has been submitted
      const depositDocRef = doc(firestore, 'monthlyDeposits', monthId);
      const depositDocSnap = await getDoc(depositDocRef);

      if (depositDocSnap.exists() && (depositDocSnap.data() as MonthlyDepositDoc).submittedAt) {
        setIsDepositSubmitted(true);
      } else {
        setIsLoading(false);
        return; // Stop execution if deposit is not submitted
      }

      // Step 2: Load the loan data if deposit is submitted
      const docRef = doc(firestore, 'monthlyLoans', monthId);
      try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as MonthlyLoanDoc;
          const dataToLoad = data.draft || data.loans;
          const dataSource = data.draft ? 'draft' : 'submitted';
          
          if (dataToLoad) {
             const allCustomerLoans = customers.map((customer) => {
              const savedLoan = dataToLoad.find(
                (d) => d.customerId === customer.id
              );
              
              if (savedLoan) {
                // Enforce the business rule on load
                if (savedLoan.carryFwd > 0 && savedLoan.changeType === 'new') {
                    savedLoan.changeType = 'increase';
                }
                return savedLoan;
              }

              return {
                  customerId: customer.id,
                  carryFwd: 0,
                  changeType: 'new' as LoanChangeType,
                  changeCash: 0,
                  changeBank: 0,
                  interestCash: 0,
                  interestBank: 0,
                  interestTotal: 0,
                };
            });
            setLoans(allCustomerLoans);
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
             await initializeNewMonth(date);
          }
        } else {
          toast({
            title: 'New Entry',
            description: `No data found for ${format(
              date,
              'MMMM yyyy'
            )}. Starting new entry.`,
          });
          await initializeNewMonth(date);
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

  useEffect(() => {
    const monthParam = searchParams.get('month');
    if (monthParam) {
      try {
        const date = parse(monthParam, 'yyyy-MM', new Date());
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          // Check if data for this month already exists (draft or submitted)
          loadSubmittedDataForMonth(date);
        }
      } catch (e) {
        console.error('Invalid date format in URL', e);
      }
    }
  }, [searchParams, loadSubmittedDataForMonth]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      setLoans([]);
      setIsDepositSubmitted(false);
      return;
    }
    const newDate = startOfMonth(date);
    setSelectedDate(newDate);
    loadSubmittedDataForMonth(newDate);
  };

  const handleLoanChange = (
    customerId: string,
    field: keyof Omit<Loan, 'customerId' | 'interestTotal'>,
    value: string | number
  ) => {
    setIsDraftSaved(false);
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
        description: 'You cannot save entries when a session is closed or not started.',
      });
      return;
    }
    setIsLoading(true);
    const monthId = getMonthId(selectedDate);
    const docRef = doc(firestore, 'monthlyLoans', monthId);
    const dataToSave: Partial<MonthlyLoanDoc> = {
      id: monthId,
      date: Timestamp.fromDate(startOfMonth(selectedDate)),
      draft: loans,
      createdAt: serverTimestamp(),
    };

    setDoc(docRef, dataToSave, { merge: true })
      .then(() => {
        toast({
          title: 'Draft Saved',
          description: `Draft for ${format(selectedDate, 'MMMM yyyy')} has been saved.`,
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
    const docRef = doc(firestore, 'monthlyLoans', monthId);
    
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || !docSnap.data()?.draft) {
       toast({ variant: 'destructive', title: 'Error', description: 'No draft found to submit.'});
       setIsLoading(false);
       return;
    }
    
    const draftData = docSnap.data()?.draft;
    
    const dataToSubmit: Partial<MonthlyLoanDoc> = {
      loans: draftData,
      submittedAt: serverTimestamp(),
    };

    await updateDoc(docRef, { ...dataToSubmit, draft: null });
    toast({
        title: 'Success',
        description: `Loans for ${format(
        selectedDate,
        'MMMM yyyy'
        )} have been submitted.`,
    });
    setIsDraftSaved(false);
    setIsSubmitted(true);
    setIsLoading(false);
  };

  const confirmRevert = async () => {
    if (!selectedDate || !firestore) return;
    setIsLoading(true);
    const monthId = getMonthId(selectedDate);
    const docRef = doc(firestore, 'monthlyLoans', monthId);

    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || !docSnap.data()?.loans) {
        throw new Error('No submitted data found to revert.');
      }
      const submittedData = docSnap.data()?.loans;
      const dataToRevert: { draft: any; loans: any; submittedAt: any } = {
        draft: submittedData,
        loans: null,
        submittedAt: null,
      };

      await updateDoc(docRef, dataToRevert);

      toast({
        title: 'Reverted to Draft',
        description: `Entry for ${format(selectedDate, 'MMMM yyyy')} is now editable.`,
      });
      setIsSubmitted(false);
      setIsDraftSaved(true);
      setIsReverting(false);
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { draft: '...data', loans: null },
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deletingEntry || !firestore || !user?.email || !deletePassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password is required to delete.' });
      return;
    }
    if (!user) return;
    setIsLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      const docRef = doc(firestore, 'monthlyLoans', deletingEntry.id);
      await deleteDoc(docRef);
      toast({
        title: 'Entry Deleted',
        description: `Entry for ${format(deletingEntry.date.toDate(), 'MMMM yyyy')} has been deleted.`,
      });
      setDeletingEntry(null);
      setDeletePassword('');

      if (selectedDate && getMonthId(selectedDate) === deletingEntry.id) {
        setSelectedDate(undefined);
        setLoans([]);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Authentication Failed', description: 'Incorrect password. Deletion cancelled.' });
    } finally {
      setIsLoading(false);
    }
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
      <div className="space-y-6">
        <div className="no-print">
          <BalanceSummary selectedDate={selectedDate} currentLoans={loans} />
        </div>

        <Card className="printable">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
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
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 5}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
           <div className="hidden print-only p-6">
                <h1 className="text-2xl font-bold text-center">
                    Loans & Interest for {selectedDate ? format(selectedDate, 'MMMM yyyy') : 'N/A'}
                </h1>
            </div>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedDate && customers && isDepositSubmitted ? (
              <div className="overflow-x-auto">
                <Table id="loans-table">
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
                          <TableCell className="customer-name-cell">{customer.name}</TableCell>
                          <TableCell className="text-right">
                            <span className="print-hide">
                                <Input
                                type="number"
                                placeholder="₹0.00"
                                value={loan.carryFwd || ''}
                                disabled
                                className="w-full text-right"
                                />
                            </span>
                            <span className="hidden print-only float-right">{loan.carryFwd.toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="print-hide">
                                <Select
                                value={loan.changeType}
                                disabled={!isSessionActive || isSubmitted}
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
                                    <SelectItem value="new" disabled={(loan.carryFwd || 0) > 0}>New Loan</SelectItem>
                                    <SelectItem value="increase">
                                    Increase
                                    </SelectItem>
                                    <SelectItem value="decrease">
                                    Decrease
                                    </SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                            <span className="hidden print-only">{loan.changeType}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="print-hide">
                                <Input
                                type="number"
                                placeholder="₹0.00"
                                value={loan.changeCash || ''}
                                disabled={!isSessionActive || isSubmitted}
                                onChange={(e) =>
                                    handleLoanChange(
                                    customer.id,
                                    'changeCash',
                                    e.target.value
                                    )
                                }
                                className="w-full text-right"
                                />
                            </span>
                             <span className="hidden print-only float-right">{loan.changeCash.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="print-hide">
                                <Input
                                type="number"
                                placeholder="₹0.00"
                                value={loan.changeBank || ''}
                                disabled={!isSessionActive || isSubmitted}
                                onChange={(e) =>
                                    handleLoanChange(
                                    customer.id,
                                    'changeBank',
                                    e.target.value
                                    )
                                }
                                className="w-full text-right"
                                />
                            </span>
                             <span className="hidden print-only float-right">{loan.changeBank.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{changeTotal.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="print-hide">
                                <Input
                                type="number"
                                placeholder="₹0.00"
                                value={loan.interestCash || ''}
                                disabled={!isSessionActive || isSubmitted}
                                onChange={(e) =>
                                    handleLoanChange(
                                    customer.id,
                                    'interestCash',
                                    e.target.value
                                    )
                                }
                                className="w-full text-right"
                                />
                            </span>
                            <span className="hidden print-only float-right">{loan.interestCash.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="print-hide">
                                <Input
                                type="number"
                                placeholder="₹0.00"
                                value={loan.interestBank || ''}
                                disabled={!isSessionActive || isSubmitted}
                                onChange={(e) =>
                                    handleLoanChange(
                                    customer.id,
                                    'interestBank',
                                    e.target.value
                                    )
                                }
                                className="w-full text-right"
                                />
                            </span>
                            <span className="hidden print-only float-right">{loan.interestBank.toFixed(2)}</span>
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
            ) : selectedDate && !isDepositSubmitted ? (
                <Alert variant="destructive" className="no-print">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Deposit Entry Not Submitted</AlertTitle>
                    <AlertDescription>
                        You must submit the deposit entry for {format(selectedDate, 'MMMM yyyy')} before you can manage loans.
                        <Button asChild variant="link" className="p-1 h-auto">
                            <Link href={`/deposits?month=${getMonthId(selectedDate)}`}>Go to Deposits</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : (
              <Alert className="no-print">
                <Info className="h-4 w-4" />
                <AlertTitle>Select a Date</AlertTitle>
                <AlertDescription>
                  {isSessionActive
                    ? 'Please pick a month to manage loans or view the submission history.'
                    : 'A session is not active. Please start a new session to make entries. You can still view past submissions.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {selectedDate && isDepositSubmitted && (
            <CardFooter className="flex justify-end gap-2 no-print">
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
              <Button
                variant="outline"
                onClick={() => window.print()}
                disabled={isLoading}
              >
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardFooter>
          )}
        </Card>
        
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5" />
              Submission History
            </CardTitle>
            <CardDescription className="text-xs">
              Click a month to view its submitted data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pastEntriesLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pastEntries && pastEntries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pastEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={
                        getMonthId(entry.date.toDate()) ===
                        (selectedDate && getMonthId(selectedDate))
                          ? 'default'
                          : 'outline'
                      }
                      className="justify-start"
                      onClick={() => handlePastEntryClick(entry.date.toDate())}
                    >
                      {format(entry.date.toDate(), 'MMM yyyy')}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingEntry(entry)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete entry</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No past submissions found.
              </p>
            )}
          </CardContent>
        </Card>

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
      
        {/* Delete Entry Confirmation Dialog */}
        <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the entry for {deletingEntry && format(deletingEntry.date.toDate(), 'MMMM yyyy')}. This action requires password confirmation and cannot be undone.
              </AlertDialogDescription>
              <div className="space-y-2 pt-4">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                />
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteEntry} className={buttonVariants({ variant: 'destructive' })} disabled={isLoading || !deletePassword}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm & Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default function LoansPage() {
  return (
    <>
      <AppShell>
        <Loans />
      </AppShell>
    </>
  );
}
