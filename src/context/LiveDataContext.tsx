'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export type Deposit = {
  customerId: string;
  cash: number;
  bank: number;
};

export type LoanChangeType = 'new' | 'increase' | 'decrease';

export type Loan = {
  customerId: string;
  carryFwd: number;
  changeType: LoanChangeType;
  changeCash: number;
  changeBank: number;
  interestCash: number;
  interestBank: number;
  interestTotal: number;
};


interface LiveDataContextType {
  liveMonthId: string | null;
  setLiveMonthId: (id: string | null) => void;
  deposits: Deposit[];
  setDeposits: React.Dispatch<React.SetStateAction<Deposit[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const LiveDataProvider = ({ children }: { children: ReactNode }) => {
  const [liveMonthId, setLiveMonthId] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  return (
    <LiveDataContext.Provider value={{ liveMonthId, setLiveMonthId, deposits, setDeposits, loans, setLoans }}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (context === undefined) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return context;
};
