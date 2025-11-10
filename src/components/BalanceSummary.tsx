'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, subMonths, startOfMonth } from 'date-fns';
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

type Deposit = { customerId: string; cash: number; bank: number };
type MonthlyDepositDoc = {
  deposits?: Deposit[];
  draft?: Deposit[];
};

type Loan = {
  customerId: string;
  carryFwd: number;
  changeType: 'new' | 'increase' | 'decrease';
  changeCash: number;
  changeBank: number;
};

type MonthlyLoanDoc = {
  loans?: Loan[];
  draft?: Loan[];
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

export function BalanceSummary({ 
  selectedDate: dateProp,
  currentDeposits: liveDeposits,
  currentLoans: liveLoans,
}: { 
  selectedDate?: Date,
  currentDeposits?: Deposit[],
  currentLoans?: Loan[],
}) {
  const firestore = useFirestore();
  const [date, setDate] = useState(() => startOfMonth(dateProp || new Date()));
  const [summary, setSummary] = useState({
    openingBalance: { cash: 0, bank: 0 },
    currentDeposits: { cash: 0, bank: 0 },
    loanGiven: { cash: 0, bank: 0 },
    loanRepaid: { cash: 0, bank: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setDate(startOfMonth(dateProp || new Date()));
  }, [dateProp]);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!firestore) return;
      setIsLoading(true);

      const prevMonth = subMonths(date, 1);
      const prevMonthId = getMonthId(prevMonth);

      const prevDepositRef = doc(firestore, 'monthlyDeposits', prevMonthId);
      const prevLoanRef = doc(firestore, 'monthlyLoans', prevMonthId);
      
      const twoMonthsAgo = subMonths(date, 2);
      const twoMonthsAgoId = getMonthId(twoMonthsAgo);
      const twoMonthsAgoDepositRef = doc(firestore, 'monthlyDeposits', twoMonthsAgoId);
      const twoMonthsAgoLoanRef = doc(firestore, 'monthlyLoans', twoMonthsAgoId);

      try {
        const [
          prevDepositSnap,
          prevLoanSnap,
          twoMonthsAgoDepositSnap,
          twoMonthsAgoLoanSnap,
        ] = await Promise.all([
          getDoc(prevDepositRef),
          getDoc(prevLoanRef),
          getDoc(twoMonthsAgoDepositRef),
          getDoc(twoMonthsAgoLoanRef)
        ]);
        
        let currentDeposits: Deposit[] = liveDeposits || [];
        let currentLoans: Loan[] = liveLoans || [];

        // If live data is not passed, fetch from Firestore
        if (!liveDeposits) {
          const currentDepositSnap = await getDoc(doc(firestore, 'monthlyDeposits', getMonthId(date)));
          if (currentDepositSnap.exists()) {
             const data = currentDepositSnap.data() as MonthlyDepositDoc;
             currentDeposits = data.deposits || data.draft || [];
          }
        }
        if (!liveLoans) {
          const currentLoanSnap = await getDoc(doc(firestore, 'monthlyLoans', getMonthId(date)));
           if (currentLoanSnap.exists()) {
             const data = currentLoanSnap.data() as MonthlyLoanDoc;
             currentLoans = data.loans || data.draft || [];
          }
        }
        
        const prevDepositsData = prevDepositSnap.exists() ? (prevDepositSnap.data() as MonthlyDepositDoc) : null;
        const prevLoansData = prevLoanSnap.exists() ? (prevLoanSnap.data() as MonthlyLoanDoc) : null;
        const twoMonthsAgoDepositsData = twoMonthsAgoDepositSnap.exists() ? (twoMonthsAgoDepositSnap.data() as MonthlyDepositDoc) : null;
        const twoMonthsAgoLoansData = twoMonthsAgoLoanSnap.exists() ? (twoMonthsAgoLoanSnap.data() as MonthlyLoanDoc) : null;

        const prevDeposits = prevDepositsData?.deposits || prevDepositsData?.draft || [];
        const prevLoans = prevLoansData?.loans || prevLoansData?.draft || [];
        const twoMonthsAgoDeposits = twoMonthsAgoDepositsData?.deposits || twoMonthsAgoDepositsData?.draft || [];
        const twoMonthsAgoLoans = twoMonthsAgoLoansData?.loans || twoMonthsAgoLoansData?.draft || [];

        const twoMonthsAgoTotalDeposits = twoMonthsAgoDeposits.reduce((acc, d) => ({cash: acc.cash + (d.cash || 0), bank: acc.bank + (d.bank || 0)}), {cash: 0, bank: 0});
        const twoMonthsAgoOutstandingLoans = twoMonthsAgoLoans.reduce((sum, l) => sum + calculateClosingBalance(l), 0);
        const twoMonthsAgoTotalBalance = (twoMonthsAgoTotalDeposits.cash + twoMonthsAgoTotalDeposits.bank) - twoMonthsAgoOutstandingLoans;
        const prevMonthOpeningBalance = { cash: twoMonthsAgoTotalBalance, bank: 0 };

        const prevMonthDeposits = prevDeposits.reduce((acc, d) => ({cash: acc.cash + (d.cash || 0), bank: acc.bank + (d.bank || 0)}), {cash: 0, bank: 0});
        const prevMonthLoanChanges = prevLoans.reduce((acc, l) => {
            if (l.changeType === 'new' || l.changeType === 'increase') {
                acc.given.cash += l.changeCash || 0;
                acc.given.bank += l.changeBank || 0;
            } else if (l.changeType === 'decrease') {
                acc.repaid.cash += l.changeCash || 0;
                acc.repaid.bank += l.changeBank || 0;
            }
            return acc;
        }, { given: { cash: 0, bank: 0 }, repaid: { cash: 0, bank: 0 } });
        
        const prevClosingCash = prevMonthOpeningBalance.cash + prevMonthDeposits.cash + prevMonthLoanChanges.repaid.cash - prevMonthLoanChanges.given.cash;
        const prevClosingBank = prevMonthOpeningBalance.bank + prevMonthDeposits.bank + prevMonthLoanChanges.repaid.bank - prevMonthLoanChanges.given.bank;
        
        const openingBalance = {
            cash: prevClosingCash,
            bank: prevClosingBank,
        };

        const currentMonthDeposits = currentDeposits.reduce(
            (totals, d) => {
              totals.cash += d.cash || 0;
              totals.bank += d.bank || 0;
              return totals;
            }, { cash: 0, bank: 0 }
        );
        
        const loanChanges = currentLoans.reduce(
            (totals, l) => {
              if (l.changeType === 'new' || l.changeType === 'increase') {
                totals.given.cash += l.changeCash || 0;
                totals.given.bank += l.changeBank || 0;
              } else if (l.changeType === 'decrease') {
                totals.repaid.cash += l.changeCash || 0;
                totals.repaid.bank += l.changeBank || 0;
              }
              return totals;
            }, {
              given: { cash: 0, bank: 0 },
              repaid: { cash: 0, bank: 0 },
            }
          );

        setSummary({
          openingBalance,
          currentDeposits: currentMonthDeposits,
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
  }, [date, firestore, liveDeposits, liveLoans]);
  
  const totalCredited = {
    cash: summary.currentDeposits.cash + summary.loanRepaid.cash,
    bank: summary.currentDeposits.bank + summary.loanRepaid.bank,
    total: summary.currentDeposits.cash + summary.loanRepaid.cash + summary.currentDeposits.bank + summary.loanRepaid.bank
  };

  const totalDebit = {
      cash: summary.loanGiven.cash,
      bank: summary.loanGiven.bank,
      total: summary.loanGiven.cash + summary.loanGiven.bank
  };

  const availableBalance = {
    cash: summary.openingBalance.cash + totalCredited.cash - totalDebit.cash,
    bank: summary.openingBalance.bank + totalCredited.bank - totalDebit.bank,
    total: summary.openingBalance.cash + totalCredited.cash - totalDebit.cash + summary.openingBalance.bank + totalCredited.bank - totalDebit.bank
  };


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            For {format(date, 'MMMM yyyy')}
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
          Live balance for {format(date, 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-muted-foreground">Total Credited</h3>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(totalCredited.total)}</p>
                <p className="text-sm text-muted-foreground">Cash: {formatCurrency(totalCredited.cash)}</p>
                <p className="text-sm text-muted-foreground">Bank: {formatCurrency(totalCredited.bank)}</p>
            </div>
             <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-muted-foreground">Total Debit</h3>
                <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalDebit.total)}</p>
                <p className="text-sm text-muted-foreground">Cash: {formatCurrency(totalDebit.cash)}</p>
                <p className="text-sm text-muted-foreground">Bank: {formatCurrency(totalDebit.bank)}</p>
            </div>
             <div className="rounded-lg border bg-primary/10 p-4">
                <h3 className="font-semibold text-primary">Available Balance for Loan</h3>
                <p className="mt-1 text-2xl font-bold text-primary">{formatCurrency(availableBalance.total)}</p>
                <p className="text-sm text-primary/80">Cash: {formatCurrency(availableBalance.cash)}</p>
                <p className="text-sm text-primary/80">Bank: {formatCurrency(availableBalance.bank)}</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
