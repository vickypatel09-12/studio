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
import { collection, query, doc, getDoc } from 'firebase/firestore';
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

type ReportSummary = {
    totalDeposit: number;
    totalCarryFwdLoan: number;
    totalNewIncDec: number;
    totalOutstandingLoan: number;
    totalInterest: number;
}

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

function Reports() {
  const firestore = useFirestore();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const [generatedReport, setGeneratedReport] = useState<MonthlyReportRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [currentMonthSummary, setCurrentMonthSummary] = useState<ReportSummary | null>(null);
  const [previousMonthSummary, setPreviousMonthSummary] = useState<ReportSummary | null>(null);


  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

    const calculateSummary = (reportRows: MonthlyReportRow[]): ReportSummary => {
        return reportRows.reduce((acc, item) => {
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
        });
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

            if (!depositData || depositData.length === 0 || !loanData || loanData.length === 0) {
                return null;
            }

            return customers.map(customer => {
                const dep = depositData.find(d => d.customerId === customer.id);
                const loan = loanData.find(l => l.customerId === customer.id);
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

        if (!currentMonthData) {
            toast({
                variant: 'destructive',
                title: 'No Data Found',
                description: `No submitted or draft data found for ${format(selectedDate, 'MMMM yyyy')}.`
            });
            setIsLoading(false);
            return;
        }

        const prevMonthDate = subMonths(selectedDate, 1);
        const previousMonthData = await fetchMonthData(prevMonthDate);

        setGeneratedReport(currentMonthData);
        setCurrentMonthSummary(calculateSummary(currentMonthData));

        if(previousMonthData) {
            setPreviousMonthSummary(calculateSummary(previousMonthData));
        }

      } catch (error) {
        toast({ variant: 'destructive', title: 'Error Generating Report', description: 'Could not fetch report data.' });
        console.error("Error generating report:", error);
      }
    } else {
        // All-time report logic would go here
        toast({ title: 'Not Implemented', description: 'All-time reports are not yet available.' });
    }
    
    setIsLoading(false);
  };
  
    const totals = generatedReport?.reduce(
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
    ) || { 
        depositCash: 0, depositBank: 0, carryFwdLoan: 0, loanChangeCash: 0, 
        loanChangeBank: 0, closingLoan: 0, interestCash: 0, interestBank: 0 
      };

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
        return {
            totalDeposit: (current?.totalDeposit || 0) + (prev?.totalDeposit || 0),
            totalCarryFwdLoan: (prev?.totalOutstandingLoan || 0),
            totalNewIncDec: current?.totalNewIncDec || 0,
            totalOutstandingLoan: current?.totalOutstandingLoan || 0,
            totalInterest: (current?.totalInterest || 0) + (prev?.totalInterest || 0),
        }
    }
    
  return (
    <>
      <div className="printable">
         <div className="print-only text-center my-4">
           {generatedReport && (
            <h2 className="text-lg font-semibold mb-2">
              Report for {format(selectedDate, 'MMMM yyyy')}
            </h2>
          )}
        </div>
        <Card className="card">
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
                      <SelectItem value="all-time" disabled>All-Time Report</SelectItem>
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
              <div className="flex justify-center p-8 no-print">
                  <Loader2 className="h-8 w-8 animate-spin"/>
              </div>
          ) : generatedReport ? (
            <>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                          <TableHead className='w-[50px] py-1'>Sr.</TableHead>
                          <TableHead className='py-1'>Customer</TableHead>
                          <TableHead className="text-right py-1">Deposit</TableHead>
                          <TableHead className="text-right py-1">Carry Fwd Loan</TableHead>
                          <TableHead className="text-right py-1">New / Changed Loan</TableHead>
                          <TableHead className="text-right py-1">Closing Loan</TableHead>
                          <TableHead className="text-right py-1">Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedReport.map((item, index) => {
                         const depositTotal = item.depositCash + item.depositBank;
                         const loanChangeTotal = item.loanChangeCash + item.loanChangeBank;
                         const interestTotal = item.interestCash + item.interestBank;

                         const renderTwoLevel = (total: number, breakdown: {label: string, value: number}[]) => {
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
                              <TableCell className="py-1">{index + 1}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap py-1">{item.customerName}</TableCell>
                              <TableCell className="text-right py-1">
                                  {renderTwoLevel(depositTotal, [{label: 'c', value: item.depositCash}, {label: 'b', value: item.depositBank}])}
                              </TableCell>
                              <TableCell className="text-right py-1">{item.carryFwdLoan === 0 ? '-' : formatAmount(item.carryFwdLoan)}</TableCell>
                               <TableCell className="text-right py-1">
                                 {renderLoanChange()}
                              </TableCell>
                              <TableCell className="text-right font-medium py-1">{item.closingLoan === 0 ? '-' : formatAmount(item.closingLoan)}</TableCell>
                               <TableCell className="text-right py-1">
                                {renderTwoLevel(interestTotal, [{label: 'c', value: item.interestCash}, {label: 'b', value: item.interestBank}])}
                              </TableCell>
                            </TableRow>
                          )
                      })}
                       <TableRow className="font-bold bg-muted/50 text-right">
                          <TableCell colSpan={2} className="text-left py-1">Total</TableCell>
                          <TableCell className="py-1">
                              <div className="flex flex-col items-end">
                                  <div>{formatAmount(totals.depositCash + totals.depositBank)}</div>
                                  {renderBreakdown([{label: 'c', value: totals.depositCash}, {label: 'b', value: totals.depositBank}])}
                              </div>
                          </TableCell>
                          <TableCell className="py-1">{totals.carryFwdLoan === 0 ? '-' : formatAmount(totals.carryFwdLoan)}</TableCell>
                          <TableCell className="text-right py-1">
                               <div className="flex flex-col items-end">
                                  <div>{`${totals.loanChangeCash + totals.loanChangeBank >= 0 ? '+' : '-'}${formatAmount(totals.loanChangeCash + totals.loanChangeBank)}`}</div>
                                  {renderBreakdown([{label: 'c', value: totals.loanChangeCash}, {label: 'b', value: totals.loanChangeBank}])}
                              </div>
                          </TableCell>
                          <TableCell className="py-1">{totals.closingLoan === 0 ? '-' : formatAmount(totals.closingLoan)}</TableCell>
                          <TableCell className="py-1">
                             <div className="flex flex-col items-end">
                                <div>{formatAmount(totals.interestCash + totals.interestBank)}</div>
                                {renderBreakdown([{label: 'c', value: totals.interestCash}, {label: 'b', value: totals.interestBank}])}
                            </div>
                          </TableCell>
                        </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 no-print">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </CardFooter>
              
              <div className="print-only px-6 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                      {(previousMonthSummary || currentMonthSummary) && [
                          {title: 'Previous Month', summary: previousMonthSummary},
                          {title: 'Current Month', summary: currentMonthSummary},
                          {title: 'Grand Total', summary: grandTotalSummary(currentMonthSummary, previousMonthSummary)},
                      ].map((section, index) => section.summary && (
                         <div key={index} className="border p-2 rounded-lg">
                              <h3 className="font-bold text-center mb-2">{section.title}</h3>
                               <Table>
                                  <TableBody>
                                      <TableRow><TableCell className="py-1 px-2 font-medium">Total Deposit</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(section.summary.totalDeposit)}</TableCell></TableRow>
                                      {section.title !== 'Grand Total' && <TableRow><TableCell className="py-1 px-2 font-medium">Total Carry Fwd Loan</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(section.summary.totalCarryFwdLoan)}</TableCell></TableRow>}
                                      <TableRow><TableCell className="py-1 px-2 font-medium">Total New/Inc/Dec</TableCell><TableCell className="py-1 px-2 text-right">{`${section.summary.totalNewIncDec >= 0 ? '+' : '-'}${formatAmount(section.summary.totalNewIncDec)}`}</TableCell></TableRow>
                                      <TableRow><TableCell className="py-1 px-2 font-medium">Total Interest</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(section.summary.totalInterest)}</TableCell></TableRow>
                                      <TableRow><TableCell className="py-1 px-2 font-medium">Closing Balance</TableCell><TableCell className="py-1 px-2 text-right">{formatAmount(section.summary.totalOutstandingLoan)}</TableCell></TableRow>
                                  </TableBody>
                              </Table>
                         </div>
                      ))}
                  </div>
              </div>

            </>
          ) : (
              <CardContent className="no-print">
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Report Generated</AlertTitle>
                    <AlertDescription>
                      Select a month and click "Generate Report" to view data.
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
