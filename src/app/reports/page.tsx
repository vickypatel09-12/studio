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
import { Printer, CalendarIcon, FileDown } from 'lucide-react';
import { customers } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ReportType = 'monthly' | 'all-time';

// This is placeholder data. In a real application, you would fetch this based on the report type and date.
const reportData = customers.map((c) => ({
  customerId: c.id,
  customerName: c.name,
  deposit: Math.random() * 5000,
  loan: Math.random() * 20000,
  interest: Math.random() * 200,
}));

export default function ReportsPage() {
  const [isClient, setIsClient] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generatedReport, setGeneratedReport] = useState<typeof reportData | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGenerateReport = () => {
    // In a real app, you'd fetch data here based on reportType and selectedDate
    setGeneratedReport(reportData);
  };
  
  const totals = generatedReport?.reduce(
      (acc, item) => {
        acc.deposit += item.deposit;
        acc.loan += item.loan;
        acc.interest += item.interest;
        return acc;
      },
      { deposit: 0, loan: 0, interest: 0 }
    ) || { deposit: 0, loan: 0, interest: 0 };


  if (!isClient) {
    return null;
  }

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
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <Button onClick={handleGenerateReport}>Generate Report</Button>
        </div>

        {generatedReport && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'>Sr.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Deposits</TableHead>
                  <TableHead className="text-right">Total Loans</TableHead>
                  <TableHead className="text-right">Total Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReport.map((item, index) => (
                  <TableRow key={item.customerId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{item.deposit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{item.loan.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{item.interest.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <UiTableFooter>
                <TableRow className="font-bold bg-muted/50 text-right">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell>₹{totals.deposit.toFixed(2)}</TableCell>
                  <TableCell>₹{totals.loan.toFixed(2)}</TableCell>
                  <TableCell>₹{totals.interest.toFixed(2)}</TableCell>
                </TableRow>
              </UiTableFooter>
            </Table>
          </div>
        )}
      </CardContent>
      {generatedReport && (
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button>
            <FileDown className="mr-2 h-4 w-4" /> Download
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
