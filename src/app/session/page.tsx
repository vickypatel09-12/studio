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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useDoc,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import {
  Loader2,
  Play,
  StopCircle,
  Undo2,
  Calendar as CalendarIcon,
  Percent,
  Trash2,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';

type Session = {
  id: 'status';
  status: 'active' | 'closed';
  startDate?: Timestamp;
  endDate?: Timestamp;
  interestRate?: number;
  interestRateType?: 'monthly' | 'annual';
  firstMonthDeposit?: number;
  furtherMonthDeposit?: number;
};

function SessionManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] =
    useState(false);
  const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = useState(false);
  const [isEndSessionDialogOpen, setIsEndSessionDialogOpen] = useState(false);
  const [isRevertSessionDialogOpen, setIsRevertSessionDialogOpen] =
    useState(false);
  const [isDeleteSessionDialogOpen, setIsDeleteSessionDialogOpen] =
    useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [interestRateType, setInterestRateType] = useState<'monthly' | 'annual'>('annual');
  const [firstMonthDeposit, setFirstMonthDeposit] = useState<number | ''>('');
  const [furtherMonthDeposit, setFurtherMonthDeposit] = useState<number | ''>('');


  const sessionDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'session', 'status');
  }, [firestore]);

  const { data: session, isLoading } = useDoc<Session>(sessionDocRef);

  useEffect(() => {
    if (session && isEditSessionDialogOpen) {
        setInterestRate(session.interestRate || '');
        setInterestRateType(session.interestRateType || 'annual');
        setFirstMonthDeposit(session.firstMonthDeposit || '');
        setFurtherMonthDeposit(session.furtherMonthDeposit || '');
    }
  }, [session, isEditSessionDialogOpen]);

  const handleStartSession = () => {
    if (!firestore || !sessionDocRef) return;
    if (session?.status === 'active') {
      toast({
        variant: 'destructive',
        title: 'Session Already Active',
        description: 'An active session is already in progress.',
      });
      return;
    }
    if (!startDate) {
      toast({
        variant: 'destructive',
        title: 'Start Date Required',
        description: 'Please select a start date for the session.',
      });
      return;
    }
    if (interestRate === '' || interestRate <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Interest Rate',
        description: 'Please enter a valid interest rate.',
      });
      return;
    }

    setIsProcessing(true);
    const newSession: Omit<Session, 'endDate'> & {endDate?: any} = {
      id: 'status',
      status: 'active',
      startDate: Timestamp.fromDate(startDate),
      interestRate: interestRate,
      interestRateType: interestRateType,
      firstMonthDeposit: Number(firstMonthDeposit) || 0,
      furtherMonthDeposit: Number(furtherMonthDeposit) || 0,
    };
    delete newSession.endDate;

    setDocumentNonBlocking(sessionDocRef, newSession, { merge: false });
    toast({
      title: 'Session Started',
      description: `A new financial session has been started.`,
    });
    setIsStartSessionDialogOpen(false);
    setStartDate(undefined);
    setInterestRate('');
    setFirstMonthDeposit('');
    setFurtherMonthDeposit('');
    setIsProcessing(false);
  };
  
   const handleEditSession = () => {
    if (!firestore || !sessionDocRef) return;
     if (interestRate === '' || interestRate <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Interest Rate',
        description: 'Please enter a valid interest rate.',
      });
      return;
    }

    setIsProcessing(true);
    const updatedSession: Partial<Session> = {
      interestRate: Number(interestRate) || 0,
      interestRateType: interestRateType,
      firstMonthDeposit: Number(firstMonthDeposit) || 0,
      furtherMonthDeposit: Number(furtherMonthDeposit) || 0,
    };
    updateDocumentNonBlocking(sessionDocRef, updatedSession);
    toast({
      title: 'Session Updated',
      description: `The session details have been updated.`,
    });
    setIsEditSessionDialogOpen(false);
    setIsProcessing(false);
  };


  const confirmEndSession = () => {
    if (!firestore || !sessionDocRef) return;
    if (!endDate) {
      toast({
        variant: 'destructive',
        title: 'End Date Required',
        description: 'Please select an end date for the session.',
      });
      return;
    }
    if (session?.startDate && endDate < session.startDate.toDate()) {
      toast({
        variant: 'destructive',
        title: 'Invalid End Date',
        description: 'End date cannot be before the start date.',
      });
      return;
    }

    setIsProcessing(true);
    const updatedSession = {
      status: 'closed',
      endDate: Timestamp.fromDate(endDate),
    };
    setDocumentNonBlocking(sessionDocRef, updatedSession, { merge: true });
    toast({
      title: 'Session Ended',
      description: 'The current financial session has been closed.',
    });
    setIsEndSessionDialogOpen(false);
    setEndDate(undefined);
    setIsProcessing(false);
  };

  const confirmRevertSession = () => {
    if (!firestore || !sessionDocRef || !session) return;
    setIsProcessing(true);

    const newSessionState: Partial<Session> & { endDate?: any } = {
      ...session,
      status: 'active',
    };
    delete newSessionState.endDate;

    setDocumentNonBlocking(sessionDocRef, newSessionState, { merge: true });

    toast({
      title: 'Session Reverted',
      description: 'The session has been reopened.',
    });
    setIsRevertSessionDialogOpen(false);
    setIsProcessing(false);
  };

  const confirmDeleteSession = () => {
    if (!firestore || !sessionDocRef) return;
    setIsProcessing(true);
    deleteDocumentNonBlocking(sessionDocRef);
    toast({
      title: 'Session Deleted',
      description: 'The session has been deleted.',
    });
    setIsDeleteSessionDialogOpen(false);
    setIsProcessing(false);
  };

  return (
    <>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl animate-fade-in-up">
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Manage the start and end of financial sessions. Monthly entries
              can only be made during an active session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Current Session Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {session?.status
                        ? 'Session is '
                        : 'No session started yet.'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      session?.status === 'active' ? 'default' : 'secondary'
                    }
                    className={
                      session?.status === 'active'
                        ? 'bg-green-500 text-white'
                        : session?.status === 'closed'
                        ? 'bg-destructive'
                        : 'bg-muted'
                    }
                  >
                    {session?.status === 'active'
                      ? 'Active'
                      : session?.status === 'closed'
                      ? 'Closed'
                      : 'Not Started'}
                  </Badge>
                </div>

                {session && (
                  <div className="space-y-2 border-t pt-2 text-sm text-muted-foreground">
                    <div className="grid grid-cols-2 gap-2">
                        {session.startDate && (
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                            Started: {format(session.startDate.toDate(), 'PPP')}
                            </span>
                        </div>
                        )}
                        {session.status === 'closed' && session.endDate && (
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                            Ended: {format(session.endDate.toDate(), 'PPP')}
                            </span>
                        </div>
                        )}
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        {session.interestRate && (
                        <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            <span>Interest: {session.interestRate}% {session.interestRateType}</span>
                        </div>
                        )}
                         {(session.firstMonthDeposit || session.furtherMonthDeposit) && (
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4" />
                                <span>Deposits: ₹{session.firstMonthDeposit} (1st) / ₹{session.furtherMonthDeposit}</span>
                            </div>
                         )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-4">
            {session?.status === 'active' && (
               <Button
                  variant="outline"
                  onClick={() => setIsEditSessionDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit Session
                </Button>
            )}
            {session?.status === 'closed' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsRevertSessionDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Revert to Active
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsDeleteSessionDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Session
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              onClick={() => setIsEndSessionDialogOpen(true)}
              disabled={isProcessing || session?.status !== 'active'}
            >
              <StopCircle className="mr-2 h-4 w-4" /> End Current Session
            </Button>
            <Button
              onClick={() => setIsStartSessionDialogOpen(true)}
              disabled={isProcessing || session?.status === 'active'}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" /> Start New Session
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Start Session Dialog */}
      <Dialog
        open={isStartSessionDialogOpen}
        onOpenChange={setIsStartSessionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Financial Session</DialogTitle>
            <DialogDescription>
              To start a new session, please provide the start date and interest rate details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'col-span-3 justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interest-rate-type" className="text-right">
                Rate Type
              </Label>
               <Select
                  value={interestRateType}
                  onValueChange={(value: 'monthly' | 'annual') => setInterestRateType(value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interest-rate" className="text-right">
                Interest Rate (%)
              </Label>
              <Input
                id="interest-rate"
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                placeholder="e.g., 12"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first-month-deposit" className="text-right">
                First Month Deposit
              </Label>
              <Input
                id="first-month-deposit"
                type="number"
                value={firstMonthDeposit}
                onChange={(e) => setFirstMonthDeposit(Number(e.target.value))}
                placeholder="e.g., 1000"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="further-month-deposit" className="text-right">
                Further Month Deposit
              </Label>
              <Input
                id="further-month-deposit"
                type="number"
                value={furtherMonthDeposit}
                onChange={(e) => setFurtherMonthDeposit(Number(e.target.value))}
                placeholder="e.g., 500"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStartSessionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleStartSession} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Session Dialog */}
       <Dialog
        open={isEditSessionDialogOpen}
        onOpenChange={setIsEditSessionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Active Session</DialogTitle>
            <DialogDescription>
              Update the details for the current active session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-interest-rate-type" className="text-right">
                Rate Type
              </Label>
               <Select
                  value={interestRateType}
                  onValueChange={(value: 'monthly' | 'annual') => setInterestRateType(value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-interest-rate" className="text-right">
                Interest Rate (%)
              </Label>
              <Input
                id="edit-interest-rate"
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                placeholder="e.g., 12"
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-first-month-deposit" className="text-right">
                First Month Deposit
              </Label>
              <Input
                id="edit-first-month-deposit"
                type="number"
                value={firstMonthDeposit}
                onChange={(e) => setFirstMonthDeposit(Number(e.target.value))}
                placeholder="e.g., 1000"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-further-month-deposit" className="text-right">
                Further Month Deposit
              </Label>
              <Input
                id="edit-further-month-deposit"
                type="number"
                value={furtherMonthDeposit}
                onChange={(e) => setFurtherMonthDeposit(Number(e.target.value))}
                placeholder="e.g., 500"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditSessionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSession} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Session Dialog */}
      <AlertDialog
        open={isEndSessionDialogOpen}
        onOpenChange={setIsEndSessionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to end the session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will close the current financial period. You must
              select an end date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, 'PPP')
                  ) : (
                    <span>Pick an end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEndSession}
              disabled={isProcessing || !endDate}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Session Dialog */}
      <AlertDialog
        open={isRevertSessionDialogOpen}
        onOpenChange={setIsRevertSessionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Active Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reopen the last closed session, allowing you to make
              changes again. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevertSession}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Session Dialog */}
      <AlertDialog
        open={isDeleteSessionDialogOpen}
        onOpenChange={setIsDeleteSessionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              session record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              disabled={isProcessing}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SessionManagementPage() {
  return (
    <AppShell>
      <SessionManagement />
    </AppShell>
  );
}

    