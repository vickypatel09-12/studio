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
import { Loader2, Play, StopCircle, Undo2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/AppShell';


type Session = {
  id: 'status';
  status: 'active' | 'closed';
  startDate?: Timestamp;
  endDate?: Timestamp;
};

function SessionManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEndSessionDialogOpen, setIsEndSessionDialogOpen] = useState(false);
  const [isRevertSessionDialogOpen, setIsRevertSessionDialogOpen] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>();

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
    setIsProcessing(true);
    const newSession: Session = {
      id: 'status',
      status: 'active',
      startDate: Timestamp.now(),
    };
    // Here we use `set` with merge: false to overwrite any existing closed session
    setDocumentNonBlocking(sessionDocRef, newSession, { merge: false });
    toast({
      title: 'Session Started',
      description: 'A new financial session has been started.',
    });
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
      endDate: null, // Remove end date on revert
    };
    setDocumentNonBlocking(sessionDocRef, revertedSession, { merge: true });
     toast({
      title: 'Session Reverted',
      description: 'The session has been reopened.',
    });
    setIsRevertSessionDialogOpen(false);
    setIsProcessing(false);
  }

  return (
    <>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Manage the start and end of financial sessions. Monthly entries can
              only be made during an active session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-semibold">Current Session Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {session?.startDate
                      ? `Started on ${format(
                          session.startDate.toDate(),
                          'PPP'
                        )}`
                      : 'No session started yet.'}
                    {session?.status === 'closed' && session?.endDate
                      ? ` | Ended on ${format(session.endDate.toDate(), 'PPP')}`
                      : ''}
                  </p>
                </div>
                <Badge
                  variant={session?.status === 'active' ? 'default' : 'secondary'}
                  className={
                    session?.status === 'active'
                      ? 'bg-green-500 text-white'
                      : session?.status === 'closed'
                      ? 'bg-destructive'
                      : 'bg-muted'
                  }
                >
                  {session?.status === 'active' ? 'Active' : (session?.status === 'closed' ? 'Closed' : 'Not Started')}
                </Badge>
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
              onClick={handleStartSession}
              disabled={isProcessing || session?.status === 'active'}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" /> Start New Session
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* End Session Dialog */}
      <AlertDialog open={isEndSessionDialogOpen} onOpenChange={setIsEndSessionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to end the session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will close the current financial period. You must select an end date.
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
            <AlertDialogAction onClick={confirmEndSession} disabled={isProcessing || !endDate}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Revert Session Dialog */}
      <AlertDialog open={isRevertSessionDialogOpen} onOpenChange={setIsRevertSessionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Active Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reopen the last closed session, allowing you to make changes again. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevertSession} disabled={isProcessing}>
             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
