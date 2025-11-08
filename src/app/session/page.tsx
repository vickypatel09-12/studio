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
import { Loader2, Play, StopCircle } from 'lucide-react';
import { format } from 'date-fns';

type Session = {
  id: 'status';
  status: 'active' | 'closed';
  startDate?: Timestamp;
  endDate?: Timestamp;
};

export default function SessionManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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
    setDocumentNonBlocking(sessionDocRef, newSession, { merge: false });
    toast({
      title: 'Session Started',
      description: 'A new financial session has been started.',
    });
    setIsProcessing(false);
  };

  const handleEndSession = () => {
    if (!firestore || !sessionDocRef) return;
    if (session?.status !== 'active') {
      toast({
        variant: 'destructive',
        title: 'No Active Session',
        description: 'There is no active session to end.',
      });
      return;
    }
    setIsProcessing(true);
    const updatedSession = {
      status: 'closed',
      endDate: Timestamp.now(),
    };
    setDocumentNonBlocking(sessionDocRef, updatedSession, { merge: true });
    toast({
      title: 'Session Ended',
      description: 'The current financial session has been closed.',
    });
    setIsProcessing(false);
  };

  return (
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
                    : 'bg-destructive'
                }
              >
                {session?.status === 'active' ? 'Active' : 'Closed'}
              </Badge>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button
            variant="destructive"
            onClick={handleEndSession}
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
  );
}
