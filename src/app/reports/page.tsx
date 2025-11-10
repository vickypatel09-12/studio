'use client';
import { useState } from 'react';
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
import { format, startOfMonth } from 'date-fns';
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

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

function Reports() {
  const firestore = useFirestore();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const [generatedReport, setGeneratedReport] = useState<MonthlyReportRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const handleGenerateReport = async () => {
    if (!firestore || !customers) {
      toast({ variant: 'destructive', title: 'Error', description: 'Customer data not loaded yet.' });
      return;
    }
    setIsLoading(true);
    setGeneratedReport(null);

    if (reportType === 'monthly') {
      const monthId = getMonthId(selectedDate);
      const depositDocRef = doc(firestore, 'monthlyDeposits', monthId);
      const loanDocRef = doc(firestore, 'monthlyLoans', monthId);

      try {
        const [depositDocSnap, loanDocSnap] = await Promise.all([
          getDoc(depositDocRef),
          getDoc(loanDocRef),
        ]);

        const depositData = depositDocSnap.exists() ? (depositDocSnap.data() as MonthlyDepositDoc).deposits || (depositDocSnap.data() as MonthlyDepositDoc).draft : [];
        const loanData = loanDocSnap.exists() ? (loanDocSnap.data() as MonthlyLoanDoc).loans || (loanDocSnap.data() as MonthlyLoanDoc).draft : [];

        if (!depositData || depositData.length === 0 || !loanData || loanData.length === 0) {
           toast({
            variant: 'destructive',
            title: 'No Data Found',
            description: `No submitted or draft data found for ${format(selectedDate, 'MMMM yyyy')}.`
          });
          setIsLoading(false);
          return;
        }

        const reportRows: MonthlyReportRow[] = customers.map(customer => {
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

        setGeneratedReport(reportRows);

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
        acc.loanChangeCash += item.loanChangeCash;
        acc.loanChangeBank += item.loanChangeBank;
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

    const formatAmount = (value: number) => `₹${value.toFixed(2)}`;

  return (
    <Card>
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

        {isLoading ? (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
        ) : generatedReport ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className='w-[50px]'>Sr.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Deposit</TableHead>
                    <TableHead className="text-right">Carry Fwd Loan</TableHead>
                    <TableHead className="text-right">New / Changed Loan</TableHead>
                    <TableHead className="text-right">Closing Loan</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReport.map((item, index) => (
                  <TableRow key={item.customerId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell className="text-right">
                      {item.depositCash > 0 && <div>c: {formatAmount(item.depositCash)}</div>}
                      {item.depositBank > 0 && <div>b: {formatAmount(item.depositBank)}</div>}
                    </TableCell>
                    <TableCell className="text-right">{formatAmount(item.carryFwdLoan)}</TableCell>
                    <TableCell className="text-right">
                       <div><span className='capitalize'>{item.loanChangeType}</span></div>
                       {item.loanChangeCash > 0 && <div>c: {formatAmount(item.loanChangeCash)}</div>}
                       {item.loanChangeBank > 0 && <div>b: {formatAmount(item.loanChangeBank)}</div>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatAmount(item.closingLoan)}</TableCell>
                    <TableCell className="text-right">
                      {item.interestCash > 0 && <div>c: {formatAmount(item.interestCash)}</div>}
                      {item.interestBank > 0 && <div>b: {formatAmount(item.interestBank)}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <UiTableFooter>
                <TableRow className="font-bold bg-muted/50 text-right">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell>
                      {totals.depositCash > 0 && <div>c: {formatAmount(totals.depositCash)}</div>}
                      {totals.depositBank > 0 && <div>b: {formatAmount(totals.depositBank)}</div>}
                  </TableCell>
                  <TableCell>{formatAmount(totals.carryFwdLoan)}</TableCell>
                  <TableCell>
                      {totals.loanChangeCash > 0 && <div>c: {formatAmount(totals.loanChangeCash)}</div>}
                      {totals.loanChangeBank > 0 && <div>b: {formatAmount(totals.loanChangeBank)}</div>}
                  </TableCell>
                  <TableCell>{formatAmount(totals.closingLoan)}</TableCell>
                  <TableCell>
                      {totals.interestCash > 0 && <div>c: {formatAmount(totals.interestCash)}</div>}
                      {totals.interestBank > 0 && <div>b: {formatAmount(totals.interestBank)}</div>}
                  </TableCell>
                </TableRow>
              </UiTableFooter>
            </Table>
          </div>
        ) : (
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Report Generated</AlertTitle>
                <AlertDescription>
                   Select a month and click "Generate Report" to view data.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
      {generatedReport && (
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <AppShell>
      <Reports />
    </AppShell>
  );
}
