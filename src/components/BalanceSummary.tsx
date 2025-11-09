'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, subMonths } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type Deposit = { cash: number; bank: number };
type MonthlyDepositDoc = {
  deposits?: Deposit[];
};

type Loan = {
  carryFwd: number;
  changeType: 'new' | 'increase' | 'decrease';
  changeCash: number;
  changeBank: number;
};

type MonthlyLoanDoc = {
  loans?: Loan[];
};

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

const calculateClosingBalance = (loan: Loan) => {
  const changeTotal = (loan.changeCash || 0) + (loan.changeBank || 0);
  let adjustment = 0;
  if (loan.changeType === 'new' || loan.changeType === 'increase') {
    adjustment = changeTotal;
  } else if (loan.changeType === 'decrease') {
    adjustment = -changeTotal;
  }
  return (loan.carryFwd || 0) + adjustment;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function BalanceSummary({ selectedDate }: { selectedDate: Date }) {
  const firestore = useFirestore();
  const [summary, setSummary] = useState({
    prevBalance: { cash: 0, bank: 0 },
    currentDeposits: { cash: 0, bank: 0 },
    loanGiven: { cash: 0, bank: 0 },
    loanRepaid: { cash: 0, bank: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!firestore || !selectedDate) return;
      setIsLoading(true);

      const prevMonth = subMonths(selectedDate, 1);
      const prevMonthId = getMonthId(prevMonth);
      const currentMonthId = getMonthId(selectedDate);

      const prevDepositRef = doc(firestore, 'monthlyDeposits', prevMonthId);
      const prevLoanRef = doc(firestore, 'monthlyLoans', prevMonthId);
      const currentDepositRef = doc(
        firestore,
        'monthlyDeposits',
        currentMonthId
      );
      const currentLoanRef = doc(firestore, 'monthlyLoans', currentMonthId);

      try {
        const [
          prevDepositSnap,
          prevLoanSnap,
          currentDepositSnap,
          currentLoanSnap,
        ] = await Promise.all([
          getDoc(prevDepositRef),
          getDoc(prevLoanRef),
          getDoc(currentDepositRef),
          getDoc(currentLoanRef),
        ]);

        const prevDepositsData = prevDepositSnap.exists()
          ? (prevDepositSnap.data() as MonthlyDepositDoc)
          : null;
        const prevLoansData = prevLoanSnap.exists()
          ? (prevLoanSnap.data() as MonthlyLoanDoc)
          : null;
        const currentDepositsData = currentDepositSnap.exists()
          ? (currentDepositSnap.data() as MonthlyDepositDoc)
          : null;
        const currentLoansData = currentLoanSnap.exists()
          ? (currentLoanSnap.data() as MonthlyLoanDoc)
          : null;

        const prevTotalDeposits =
          prevDepositsData?.deposits?.reduce(
            (totals, d) => {
              totals.cash += d.cash || 0;
              totals.bank += d.bank || 0;
              return totals;
            },
            { cash: 0, bank: 0 }
          ) ?? { cash: 0, bank: 0 };

        const prevOutstandingLoans =
          prevLoansData?.loans?.reduce(
            (sum, l) => sum + calculateClosingBalance(l),
            0
          ) ?? 0;
        
        // Assuming previous loan balance affects cash balance
        const prevBalance = {
            cash: prevTotalDeposits.cash - prevOutstandingLoans,
            bank: prevTotalDeposits.bank,
        };

        const currentDeposits =
          currentDepositsData?.deposits?.reduce(
            (totals, d) => {
              totals.cash += d.cash || 0;
              totals.bank += d.bank || 0;
              return totals;
            },
            { cash: 0, bank: 0 }
          ) ?? { cash: 0, bank: 0 };
        
        const loanChanges =
          currentLoansData?.loans?.reduce(
            (totals, l) => {
              if (l.changeType === 'new' || l.changeType === 'increase') {
                totals.given.cash += l.changeCash || 0;
                totals.given.bank += l.changeBank || 0;
              } else if (l.changeType === 'decrease') {
                totals.repaid.cash += l.changeCash || 0;
                totals.repaid.bank += l.changeBank || 0;
              }
              return totals;
            },
            {
              given: { cash: 0, bank: 0 },
              repaid: { cash: 0, bank: 0 },
            }
          ) ?? {
            given: { cash: 0, bank: 0 },
            repaid: { cash: 0, bank: 0 },
          };


        setSummary({
          prevBalance,
          currentDeposits,
          loanGiven: loanChanges.given,
          loanRepaid: loanChanges.repaid,
        });
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, [selectedDate, firestore]);
  
  const liveCashBalance = summary.prevBalance.cash + summary.currentDeposits.cash - summary.loanGiven.cash + summary.loanRepaid.cash;
  const liveBankBalance = summary.prevBalance.bank + summary.currentDeposits.bank - summary.loanGiven.bank + summary.loanRepaid.bank;
  const liveTotalBalance = liveCashBalance + liveBankBalance;


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            For {format(selectedDate, 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>
          Live balance for {format(selectedDate, 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right text-red-600">Loan Given (-)</TableHead>
                <TableHead className="text-right text-green-600">Loan Repaid (+)</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Cash</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.prevBalance.cash)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.currentDeposits.cash)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(summary.loanGiven.cash)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(summary.loanRepaid.cash)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(liveCashBalance)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Bank</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.prevBalance.bank)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.currentDeposits.bank)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(summary.loanGiven.bank)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(summary.loanRepaid.bank)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(liveBankBalance)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.prevBalance.cash + summary.prevBalance.bank)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.currentDeposits.cash + summary.currentDeposits.bank)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(summary.loanGiven.cash + summary.loanGiven.bank)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(summary.loanRepaid.cash + summary.loanRepaid.bank)}</TableCell>
                    <TableCell className="text-right text-primary text-lg">{formatCurrency(liveTotalBalance)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
