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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useDoc,
  setDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import {
  Loader2,
  Play,
  StopCircle,
  Undo2,
  Calendar as CalendarIcon,
  Percent,
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
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';

type Session = {
  id: 'status';
  status: 'active' | 'closed';
  startDate?: Timestamp;
  endDate?: Timestamp;
  interestRate?: number;
};

function SessionManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);
  const [isEndSessionDialogOpen, setIsEndSessionDialogOpen] = useState(false);
  const [isRevertSessionDialogOpen, setIsRevertSessionDialogOpen] =
    useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [interestRate, setInterestRate] = useState<number | ''>('');

  const sessionDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'session', 'status');
  }, [firestore]);

  const { data: session, isLoading } = useDoc<Session>(sessionDocRef);

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
     if (interestRate === '' || interestRate <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Interest Rate',
        description: 'Please enter a valid annual interest rate.',
      });
      return;
    }

    setIsProcessing(true);
    const newSession: Omit<Session, 'endDate'> = {
      id: 'status',
      status: 'active',
      startDate: Timestamp.now(),
      interestRate: interestRate,
    };
    setDocumentNonBlocking(sessionDocRef, newSession, { merge: false });
    toast({
      title: 'Session Started',
      description: `A new financial session has been started with an interest rate of ${interestRate}%.`,
    });
    setIsStartSessionDialogOpen(false);
    setInterestRate('');
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
    if (!firestore || !sessionDocRef) return;
    setIsProcessing(true);
    const revertedSession = {
      status: 'active',
      // By using merge:true, we only update the fields provided.
      // We don't need to explicitly remove endDate, we just don't provide it.
      // However, to be extra safe and handle a previous state where endDate might have been null,
      // it's better to explicitly set it to be removed.
      // The Firestore SDK has `deleteField()` for this, but here we can just not include it.
      // To ensure it is removed if it exists we will set it to undefined in the object
      // and use a helper to remove undefined fields before sending.
      // For this case, we know it's being merged on an existing object that has an endDate, so we update it.
      // A better approach is to create a new object and overwrite.
      // Let's go with a specific update.
    };
    
    const updateData: Partial<Session> = {
        status: 'active'
    };
    
    // To 'remove' a field when merging, you'd typically use FieldValue.delete().
    // Since we aren't using the admin SDK, and to avoid complexity,
    // we'll fetch and overwrite, but without endDate.
    const newSessionState: Omit<Session, 'endDate'> & {endDate?: any} = {
        ...session!,
        status: 'active',
    }
    delete newSessionState.endDate;


    setDocumentNonBlocking(sessionDocRef, newSessionState, { merge: false });

    toast({
      title: 'Session Reverted',
      description: 'The session has been reopened.',
    });
    setIsRevertSessionDialogOpen(false);
    setIsProcessing(false);
  };

  return (
    <>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
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
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className="font-semibold">Current Session Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {session?.status ? 'Session is ' : 'No session started yet.'}
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
                  <div className='text-sm text-muted-foreground grid grid-cols-2 gap-2 pt-2 border-t'>
                    {session.startDate && 
                      <div className='flex items-center gap-2'>
                        <CalendarIcon className='h-4 w-4' />
                        <span>Started: {format(session.startDate.toDate(), 'PPP')}</span>
                      </div>
                    }
                    {session.interestRate &&
                       <div className='flex items-center gap-2'>
                        <Percent className='h-4 w-4' />
                        <span>Interest Rate: {session.interestRate}%</span>
                      </div>
                    }
                    {session.status === 'closed' && session.endDate &&
                      <div className='flex items-center gap-2 col-span-2'>
                        <CalendarIcon className='h-4 w-4' />
                        <span>Ended: {format(session.endDate.toDate(), 'PPP')}</span>
                      </div>
                    }
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            {session?.status === 'closed' && (
              <Button
                variant="outline"
                onClick={() => setIsRevertSessionDialogOpen(true)}
                disabled={isProcessing}
              >
                <Undo2 className="mr-2 h-4 w-4" /> Revert to Active
              </Button>
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
      <Dialog open={isStartSessionDialogOpen} onOpenChange={setIsStartSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Financial Session</DialogTitle>
            <DialogDescription>
              To start a new session, please provide the annual interest rate. This cannot be changed later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartSessionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStartSession} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & Start
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
