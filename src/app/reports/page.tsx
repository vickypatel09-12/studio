'use client';
import { useState, useEffect } from 'react';
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
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { Printer, CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, subMonths } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc, getDoc, getDocs, orderBy } from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import { AppShell } from '@/components/AppShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type ReportType = 'monthly' | 'all-time';

type MonthlyDepositData = {
  customerId: string;
  cash: number;
  bank: number;
};
type MonthlyLoanData = {
  customerId: string;
  carryFwd: number;
  changeType: 'new' | 'increase' | 'decrease';
  changeCash: number;
  changeBank: number;
  interestCash: number;
  interestBank: number;
  interestTotal: number;
};

type MonthlyDepositDoc = {
    deposits?: MonthlyDepositData[];
    draft?: MonthlyDepositData[];
}
type MonthlyLoanDoc = {
    loans?: MonthlyLoanData[];
    draft?: MonthlyLoanData[];
}

type MonthlyReportRow = {
  customerId: string;
  customerName: string;
  depositCash: number;
  depositBank: number;
  carryFwdLoan: number;
  loanChangeType: string;
  loanChangeCash: number;
  loanChangeBank: number;
  closingLoan: number;
  interestCash: number;
  interestBank: number;
};

type AllTimeReportRow = {
  customerId: string;
  customerName: string;
  totalDeposit: number;
  totalLoanGiven: number;
  totalLoanRepaid: number;
  netLoanChange: number;
  latestClosingLoan: number;
  totalInterest: number;
};


type ReportSummary = {
    totalDeposit: number;
    totalCarryFwdLoan: number;
    totalNewIncDec: number;
    totalOutstandingLoan: number;
    totalInterest: number;
    closingBalance: number;
}

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

function Reports() {
  const firestore = useFirestore();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const [generatedReport, setGeneratedReport] = useState<MonthlyReportRow[] | AllTimeReportRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [currentMonthSummary, setCurrentMonthSummary] = useState<ReportSummary | null>(null);
  const [previousMonthSummary, setPreviousMonthSummary] = useState<ReportSummary | null>(null);


  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('sortOrder'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

    const calculateSummary = (reportRows: MonthlyReportRow[] | null): ReportSummary => {
        if (!reportRows) return {
            totalDeposit: 0,
            totalCarryFwdLoan: 0,
            totalNewIncDec: 0,
            totalOutstandingLoan: 0,
            totalInterest: 0,
            closingBalance: 0,
        };

        const summary = reportRows.reduce((acc, item) => {
            acc.totalDeposit += (item.depositCash + item.depositBank);
            acc.totalCarryFwdLoan += item.carryFwdLoan;
            
            const loanChangeTotal = item.loanChangeCash + item.loanChangeBank;
            if (item.loanChangeType === 'new' || item.loanChangeType === 'increase') {
                acc.totalNewIncDec += loanChangeTotal;
            } else if (item.loanChangeType === 'decrease') {
                acc.totalNewIncDec -= loanChangeTotal;
            }

            acc.totalOutstandingLoan += item.closingLoan;
            acc.totalInterest += (item.interestCash + item.interestBank);
            return acc;
        }, {
            totalDeposit: 0,
            totalCarryFwdLoan: 0,
            totalNewIncDec: 0,
            totalOutstandingLoan: 0,
            totalInterest: 0,
            closingBalance: 0,
        });

        return {
            ...summary,
            closingBalance: summary.totalDeposit - summary.totalOutstandingLoan + summary.totalInterest,
        };
    };

  const handleGenerateReport = async () => {
    if (!firestore || !customers) {
      toast({ variant: 'destructive', title: 'Error', description: 'Customer data not loaded yet.' });
      return;
    }
    setIsLoading(true);
    setGeneratedReport(null);
    setCurrentMonthSummary(null);
    setPreviousMonthSummary(null);

    if (reportType === 'monthly') {
        const fetchMonthData = async (date: Date) => {
            const monthId = getMonthId(date);
            const depositDocRef = doc(firestore, 'monthlyDeposits', monthId);
            const loanDocRef = doc(firestore, 'monthlyLoans', monthId);
            
            const [depositDocSnap, loanDocSnap] = await Promise.all([
                getDoc(depositDocRef),
                getDoc(loanDocRef),
            ]);

            const depositData = depositDocSnap.exists() ? (depositDocSnap.data() as MonthlyDepositDoc).deposits || (depositDocSnap.data() as MonthlyDepositDoc).draft : [];
            const loanData = loanDocSnap.exists() ? (loanDocSnap.data() as MonthlyLoanDoc).loans || (loanDocSnap.data() as MonthlyLoanDoc).draft : [];

            if ((!depositData || depositData.length === 0) && (!loanData || loanData.length === 0)) {
                return null;
            }

            return customers.map(customer => {
                const dep = depositData?.find(d => d.customerId === customer.id);
                const loan = loanData?.find(l => l.customerId === customer.id);
                const changeTotal = (loan?.changeCash || 0) + (loan?.changeBank || 0);
                let adjustment = 0;
                if (loan?.changeType === 'new' || loan?.changeType === 'increase') {
                    adjustment = changeTotal;
                } else if (loan?.changeType === 'decrease') {
                    adjustment = -changeTotal;
                }
                const closingLoan = (loan?.carryFwd || 0) + adjustment;
                return {
                    customerId: customer.id,
                    customerName: customer.name,
                    depositCash: dep?.cash || 0,
                    depositBank: dep?.bank || 0,
                    carryFwdLoan: loan?.carryFwd || 0,
                    loanChangeType: loan?.changeType || 'N/A',
                    loanChangeCash: loan?.changeCash || 0,

                    loanChangeBank: loan?.changeBank || 0,
                    closingLoan: closingLoan,
                    interestCash: loan?.interestCash || 0,
                    interestBank: loan?.interestBank || 0,
                };
            });
        };
      
      try {
        const currentMonthData = await fetchMonthData(selectedDate);
        const prevMonthDate = subMonths(selectedDate, 1);
        const previousMonthData = await fetchMonthData(prevMonthDate);

        if (!currentMonthData) {
            toast({
                variant: 'destructive',
                title: 'No Data Found',
                description: `No submitted or draft data found for ${format(selectedDate, 'MMMM yyyy')}.`
            });
             setGeneratedReport([]);
        } else {
            setGeneratedReport(currentMonthData);
        }

        setCurrentMonthSummary(calculateSummary(currentMonthData));
        setPreviousMonthSummary(calculateSummary(previousMonthData));


      } catch (error) {
        toast({ variant: 'destructive', title: 'Error Generating Report', description: 'Could not fetch report data.' });
        console.error("Error generating report:", error);
      }
    } else if (reportType === 'all-time') {
        try {
            const depositsCollectionRef = collection(firestore, 'monthlyDeposits');
            const loansCollectionRef = collection(firestore, 'monthlyLoans');

            const [depositDocs, loanDocs] = await Promise.all([
                getDocs(depositsCollectionRef),
                getDocs(loansCollectionRef),
            ]);

            const allDeposits = depositDocs.docs.flatMap(doc => (doc.data() as MonthlyDepositDoc).deposits || []);
            const allLoans = loanDocs.docs.flatMap(doc => (doc.data() as MonthlyLoanDoc).loans || []);
            
            const latestMonthId = loanDocs.docs.map(doc => doc.id).sort().pop();
            const latestLoansData = latestMonthId ? (await getDoc(doc(loansCollectionRef, latestMonthId))).data() as MonthlyLoanDoc : null;
            const latestLoans = latestLoansData?.loans || latestLoansData?.draft || [];

            const report: AllTimeReportRow[] = customers.map(customer => {
                const customerDeposits = allDeposits.filter(d => d.customerId === customer.id);
                const customerLoans = allLoans.filter(l => l.customerId === customer.id);

                const totalDeposit = customerDeposits.reduce((sum, d) => sum + (d.cash || 0) + (d.bank || 0), 0);
                const totalInterest = customerLoans.reduce((sum, l) => sum + (l.interestTotal || 0), 0);

                const loanGiven = customerLoans
                    .filter(l => l.changeType === 'new' || l.changeType === 'increase')
                    .reduce((sum, l) => sum + (l.changeCash || 0) + (l.changeBank || 0), 0);
                
                const loanRepaid = customerLoans
                    .filter(l => l.changeType === 'decrease')
                    .reduce((sum, l) => sum + (l.changeCash || 0) + (l.changeBank || 0), 0);

                const latestLoanForCustomer = latestLoans.find(l => l.customerId === customer.id);
                let latestClosingLoan = 0;
                if (latestLoanForCustomer) {
                    const changeTotal = (latestLoanForCustomer.changeCash || 0) + (latestLoanForCustomer.changeBank || 0);
                    let adjustment = 0;
                    if (latestLoanForCustomer.changeType === 'new' || latestLoanForCustomer.changeType === 'increase') {
                        adjustment = changeTotal;
                    } else if (latestLoanForCustomer.changeType === 'decrease') {
                        adjustment = -changeTotal;
                    }
                    latestClosingLoan = (latestLoanForCustomer.carryFwd || 0) + adjustment;
                }

                return {
                    customerId: customer.id,
                    customerName: customer.name,
                    totalDeposit,
                    totalLoanGiven: loanGiven,
                    totalLoanRepaid: loanRepaid,
                    netLoanChange: loanGiven - loanRepaid,
                    latestClosingLoan: latestClosingLoan,
                    totalInterest,
                };
            });
            setGeneratedReport(report);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error Generating All-Time Report', description: 'Could not fetch all-time data.' });
            console.error("Error generating all-time report:", error);
        }
    }
    
    setIsLoading(false);
  };
  
    const totals = generatedReport && reportType === 'monthly' ? (generatedReport as MonthlyReportRow[]).reduce(
      (acc, item) => {
        acc.depositCash += item.depositCash;
        acc.depositBank += item.depositBank;
        acc.carryFwdLoan += item.carryFwdLoan;

        const loanChange = item.loanChangeCash + item.loanChangeBank;
        if (item.loanChangeType === 'new' || item.loanChangeType === 'increase') {
             acc.loanChangeCash += item.loanChangeCash;
             acc.loanChangeBank += item.loanChangeBank;
        } else if (item.loanChangeType === 'decrease') {
             acc.loanChangeCash -= item.loanChangeCash;
             acc.loanChangeBank -= item.loanChangeBank;
        }
        
        acc.closingLoan += item.closingLoan;
        acc.interestCash += item.interestCash;
        acc.interestBank += item.interestBank;
        return acc;
      },
      { 
        depositCash: 0, depositBank: 0, carryFwdLoan: 0, loanChangeCash: 0, 
        loanChangeBank: 0, closingLoan: 0, interestCash: 0, interestBank: 0 
      }
    ) : null;
    
    const allTimeTotals = generatedReport && reportType === 'all-time' ? (generatedReport as AllTimeReportRow[]).reduce(
      (acc, item) => {
          acc.totalDeposit += item.totalDeposit;
          acc.totalLoanGiven += item.totalLoanGiven;
          acc.totalLoanRepaid += item.totalLoanRepaid;
          acc.netLoanChange += item.netLoanChange;
          acc.latestClosingLoan += item.latestClosingLoan;
          acc.totalInterest += item.totalInterest;
          return acc;
      },
      { totalDeposit: 0, totalLoanGiven: 0, totalLoanRepaid: 0, netLoanChange: 0, latestClosingLoan: 0, totalInterest: 0 }
    ) : null;


    const formatAmount = (value: number) => `₹${Math.abs(value).toFixed(2)}`;

    const renderBreakdown = (items: {label: string, value: number, isCurrency?: boolean}[]) => {
        const parts = items
          .filter(i => (i.isCurrency === false && i.label !== 'N/A') || (i.isCurrency !== false && i.value !== 0))
          .map(i => {
              if (i.isCurrency === false) return i.label;
              return `${i.label}: ${formatAmount(i.value)}`;
          });
        
        if (parts.length === 0) return null;
        
        return <div className="text-xs text-muted-foreground whitespace-nowrap">({parts.join(' ')})</div>;
    };
    
    const grandTotalSummary = (current: ReportSummary | null, prev: ReportSummary | null): ReportSummary => {
        const summary = {
            totalDeposit: (current?.totalDeposit || 0) + (prev?.totalDeposit || 0),
            totalCarryFwdLoan: (prev?.totalOutstandingLoan || 0),
            totalNewIncDec: current?.totalNewIncDec || 0,
            totalOutstandingLoan: current?.totalOutstandingLoan || 0,
            totalInterest: (current?.totalInterest || 0) + (prev?.totalInterest || 0),
            closingBalance: 0
        };
        return {
            ...summary,
            closingBalance: summary.totalDeposit - summary.totalOutstandingLoan + summary.totalInterest,
        }
    }
    
  return (
    <>
      <div>
        <Card className="printable animate-fade-in-up">
          <div className="no-print">
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>
                Select a report type and date range to generate financial reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="grid gap-2">
                  <label>Report Type</label>
                  <Select
                    value={reportType}
                    onValueChange={(value: ReportType) => setReportType(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[240px]">
                      <SelectValue placeholder="Select a report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Report</SelectItem>
                      <SelectItem value="all-time">All-Time Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reportType === 'monthly' && (
                  <div className="grid gap-2">
                    <label>Month</label>
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
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(startOfMonth(date))}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={2020}
                          toYear={new Date().getFullYear() + 5}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <Button onClick={handleGenerateReport} disabled={isLoading || customersLoading}>
                  {isLoading || customersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </div>

          {isLoading ? (
              <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin"/>
              </div>
          ) : generatedReport ? (
            <>
               <div className="hidden print-only p-6">
                <h1 className="text-2xl font-bold text-center">
                    {reportType === 'monthly' 
                        ? `Monthly Report for ${selectedDate ? format(selectedDate, 'MMMM yyyy') : 'N/A'}`
                        : 'All-Time Report'
                    }
                </h1>
              </div>
              <CardContent>
                <div className="overflow-x-auto">
                  {reportType === 'monthly' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                          <TableHead>Sr.</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Deposit</TableHead>
                          <TableHead className="text-right">Carry Fwd Loan</TableHead>
                          <TableHead className="text-right">New / Changed Loan</TableHead>
                          <TableHead className="text-right">Closing Loan</TableHead>
                          <TableHead className="text-right">Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(generatedReport as MonthlyReportRow[]).map((item, index) => {
                         const depositTotal = item.depositCash + item.depositBank;
                         const loanChangeTotal = item.loanChangeCash + item.loanChangeBank;
                         const interestTotal = item.interestCash + item.interestBank;

                         const renderTwoLevel = (total: number, breakdown: {label: string, value: number, isCurrency?: boolean}[]) => {
                             if (total === 0) return <span>-</span>;
                             return (
                              <div className="flex flex-col items-end">
                                  <div>{formatAmount(total)}</div>
                                  {renderBreakdown(breakdown)}
                              </div>
                             );
                         };

                         const renderLoanChange = () => {
                             if (loanChangeTotal === 0) return <span>-</span>;
                             
                             const sign = item.loanChangeType === 'new' || item.loanChangeType === 'increase' ? '+' : '-';

                             return (
                                 <div className="flex flex-col items-end">
                                      <div>{sign}{formatAmount(loanChangeTotal)}</div>
                                      {renderBreakdown([
                                          {label: item.loanChangeType, value: 0, isCurrency: false},
                                          {label: 'c', value: item.loanChangeCash},
                                          {label: 'b', value: item.loanChangeBank}
                                      ])}
                                  </div>
                             )
                         }

                         return (
                            <TableRow key={item.customerId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap customer-name-cell">{item.customerName}</TableCell>
                              <TableCell className="text-right">
                                  {renderTwoLevel(depositTotal, [{label: 'c', value: item.depositCash}, {label: 'b', value: item.depositBank}])}
                              </TableCell>
                              <TableCell className="text-right">{item.carryFwdLoan === 0 ? '-' : formatAmount(item.carryFwdLoan)}</TableCell>
                               <TableCell className="text-right">
                                 {renderLoanChange()}
                              </TableCell>
                              <TableCell className="text-right font-medium">{item.closingLoan === 0 ? '-' : formatAmount(item.closingLoan)}</TableCell>
                               <TableCell className="text-right">
                                {renderTwoLevel(interestTotal, [{label: 'c', value: item.interestCash}, {label: 'b', value: item.interestBank}])}
                              </TableCell>
                            </TableRow>
                          )
                      })}
                      {totals && (
                       <TableRow className="font-bold bg-muted/50 text-right">
                          <TableCell colSpan={2} className="text-left">Total</TableCell>
                          <TableCell>
                              <div className="flex flex-col items-end">
                                  <div>{formatAmount(totals.depositCash + totals.depositBank)}</div>
                                  {renderBreakdown([{label: 'c', value: totals.depositCash}, {label: 'b', value: totals.depositBank}])}
                              </div>
                          </TableCell>
                          <TableCell>{totals.carryFwdLoan === 0 ? '-' : formatAmount(totals.carryFwdLoan)}</TableCell>
                          <TableCell className="text-right">
                               <div className="flex flex-col items-end">
                                  <div>{`${totals.loanChangeCash + totals.loanChangeBank >= 0 ? '+' : '-'}${formatAmount(totals.loanChangeCash + totals.loanChangeBank)}`}</div>
                                  {renderBreakdown([{label: 'c', value: totals.loanChangeCash}, {label: 'b', value: totals.loanChangeBank}])}
                              </div>
                          </TableCell>
                          <TableCell>{totals.closingLoan === 0 ? '-' : formatAmount(totals.closingLoan)}</TableCell>
                          <TableCell>
                             <div className="flex flex-col items-end">
                                <div>{formatAmount(totals.interestCash + totals.interestBank)}</div>
                                {renderBreakdown([{label: 'c', value: totals.interestCash}, {label: 'b', value: totals.interestBank}])}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sr.</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Total Deposit</TableHead>
                                <TableHead className="text-right">Total Loan Given</TableHead>
                                <TableHead className="text-right">Total Loan Repaid</TableHead>
                                <TableHead className="text-right">Outstanding Loan</TableHead>
                                <TableHead className="text-right">Total Interest</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(generatedReport as AllTimeReportRow[]).map((item, index) => (
                                <TableRow key={item.customerId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium whitespace-nowrap customer-name-cell">{item.customerName}</TableCell>
                                    <TableCell className="text-right">{formatAmount(item.totalDeposit)}</TableCell>
                                    <TableCell className="text-right">{formatAmount(item.totalLoanGiven)}</TableCell>
                                    <TableCell className="text-right">{formatAmount(item.totalLoanRepaid)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatAmount(item.latestClosingLoan)}</TableCell>
                                    <TableCell className="text-right">{formatAmount(item.totalInterest)}</TableCell>
                                </TableRow>
                            ))}
                            {allTimeTotals && (
                                <TableRow className="font-bold bg-muted/50 text-right">
                                    <TableCell colSpan={2} className="text-left">Grand Total</TableCell>
                                    <TableCell>{formatAmount(allTimeTotals.totalDeposit)}</TableCell>
                                    <TableCell>{formatAmount(allTimeTotals.totalLoanGiven)}</TableCell>
                                    <TableCell>{formatAmount(allTimeTotals.totalLoanRepaid)}</TableCell>
                                    <TableCell>{formatAmount(allTimeTotals.latestClosingLoan)}</TableCell>
                                    <TableCell>{formatAmount(allTimeTotals.totalInterest)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
              
              {reportType === 'monthly' && (
              <div className="px-6 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                      
                      <div className="border p-2 rounded-lg">
                            <h3 className="font-bold text-center mb-2">Previous Month</h3>
                            <Table>
                                <TableBody>
                                <TableRow>
                                    <td colSpan={2} className="py-1 px-2 font-bold text-center bg-muted/50">Deposit Section</td>
                                </TableRow>
                                <TableRow><TableCell className="py-1 px-2 font-medium">Total Deposit</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(previousMonthSummary?.totalDeposit || 0)}</TableCell></TableRow>
                                <TableRow><TableCell className="py-1 px-2 font-medium">Total Interest</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(previousMonthSummary?.totalInterest || 0)}</TableCell></TableRow>
                                <TableRow>
                                    <td colSpan={2} className="py-1 px-2 font-bold text-center bg-muted/50">Loan Section</td>
                                </TableRow>
                                <TableRow><TableCell className="py-1 px-2 font-medium">Total Carry Fwd Loan</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(previousMonthSummary?.totalCarryFwdLoan || 0)}</TableCell></TableRow>
                                <TableRow><TableCell className="py-1 px-2 font-medium">New/Inc./Dec.</TableCell><TableCell className="py-1 px-2 text-right">{`${(previousMonthSummary?.totalNewIncDec || 0) >= 0 ? '+' : ''}${formatAmount(previousMonthSummary?.totalNewIncDec || 0)}`}</TableCell></TableRow>
                                <TableRow><TableCell className="py-1 px-2 font-medium">Total Outstanding Loan</TableCell><TableCell className="py-1 px-2 text-right">-{formatAmount(previousMonthSummary?.totalOutstandingLoan || 0)}</TableCell></TableRow>
                                <TableRow className="font-bold bg-muted/20"><TableCell className="py-1 px-2 font-medium">Closing Balance</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(previousMonthSummary?.closingBalance || 0)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                      </div>
                      
                       <div className="border p-2 rounded-lg">
                            <h3 className="font-bold text-center mb-2">Current Month</h3>
                             <Table>
                                <TableBody>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Carry Fwd Closing Balance</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(previousMonthSummary?.closingBalance || 0)}</TableCell></TableRow>
                                    <TableRow>
                                        <td colSpan={2} className="py-1 px-2 font-bold text-center bg-muted/50">Deposit Section</td>
                                    </TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Deposit</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(currentMonthSummary?.totalDeposit || 0)}</TableCell></TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Interest</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(currentMonthSummary?.totalInterest || 0)}</TableCell></TableRow>
                                    <TableRow>
                                        <td colSpan={2} className="py-1 px-2 font-bold text-center bg-muted/50">Loan Section</td>
                                    </TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Carry Fwd Loan</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(currentMonthSummary?.totalCarryFwdLoan || 0)}</TableCell></TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">New/Inc./Dec.</TableCell><TableCell className="py-1 px-2 text-right">{`${(currentMonthSummary?.totalNewIncDec || 0) >= 0 ? '+' : ''}${formatAmount(currentMonthSummary?.totalNewIncDec || 0)}`}</TableCell></TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Outstanding Loan</TableCell><TableCell className="py-1 px-2 text-right">-{formatAmount(currentMonthSummary?.totalOutstandingLoan || 0)}</TableCell></TableRow>
                                    <TableRow className="font-bold bg-muted/20"><TableCell className="py-1 px-2 font-medium">Closing Balance</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(currentMonthSummary?.closingBalance || 0)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                       </div>

                        <div className="border p-2 rounded-lg">
                            <h3 className="font-bold text-center mb-2">Grand Total</h3>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <td colSpan={2} className="py-1 px-2 font-bold text-center bg-muted/50">Deposit Section</td>
                                    </TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Deposit</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(grandTotalSummary(currentMonthSummary, previousMonthSummary).totalDeposit)}</TableCell></TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Interest</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(grandTotalSummary(currentMonthSummary, previousMonthSummary).totalInterest)}</TableCell></TableRow>
                                    <TableRow>
                                        <td colSpan={2} className="py-1 px-2 font-bold text-center bg-muted/50">Loan Section</td>
                                    </TableRow>
                                    <TableRow><TableCell className="py-1 px-2 font-medium">Total Outstanding Loan</TableCell><TableCell className="py-1 px-2 text-right">-{formatAmount(grandTotalSummary(currentMonthSummary, previousMonthSummary).totalOutstandingLoan)}</TableCell></TableRow>
                                    <TableRow className="font-bold bg-muted/20"><TableCell className="py-1 px-2 font-medium">Net Balance</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(grandTotalSummary(currentMonthSummary, previousMonthSummary).closingBalance)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </div>
                  </div>
              </div>
              )}
               <CardFooter className="flex justify-end gap-2 no-print">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </CardFooter>

            </>
          ) : (
              <CardContent>
                <Alert className="no-print">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Report Generated</AlertTitle>
                    <AlertDescription>
                      Select a report type and click "Generate Report" to view data.
                    </AlertDescription>
                </Alert>
              </CardContent>
          )}
        </Card>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <AppShell>
      <Reports />
    </AppShell>
  );
}
