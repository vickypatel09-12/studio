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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Power, PowerOff, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type SessionStatus = 'closed' | 'active';

export default function SettingsPage() {
  const { toast } = useToast();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('closed');
  const [sessionStartDate, setSessionStartDate] = useState<Date | null>(null);
  const [sessionEndDate, setSessionEndDate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your new settings have been successfully applied.',
    });
  };

  const handleStartSession = () => {
    if (!sessionStartDate) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a start date before starting the session.',
      });
      return;
    }
    setSessionStatus('active');
    setSessionEndDate(null); // Clear end date when new session starts
    toast({
      title: `Session Started`,
      description: `The accounting session has been started at ${format(
        sessionStartDate,
        'PPpp'
      )}.`,
    });
  };

  const handleEndSession = () => {
    if (!sessionEndDate) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select an end date before ending the session.',
      });
      return;
    }
    if (sessionStartDate && sessionEndDate < sessionStartDate) {
      toast({
        variant: 'destructive',
        title: 'Invalid Date',
        description: 'End date cannot be before the start date.',
      });
      return;
    }
    setSessionStatus('closed');
    toast({
      title: `Session Ended`,
      description: `The accounting session has been ended at ${format(
        sessionEndDate,
        'PPpp'
      )}.`,
    });
  };

  const handleRevertStart = () => {
    setSessionStatus('closed');
    setSessionStartDate(null);
    toast({
      title: 'Action Reverted',
      description: 'The session start has been cancelled.',
    });
  };

  const handleRevertEnd = () => {
    setSessionStatus('active');
    setSessionEndDate(null);
    toast({
      title: 'Action Reverted',
      description: 'The session has been reopened.',
    });
  };

  const isSessionComplete = sessionStatus === 'closed' && sessionStartDate && sessionEndDate;

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Configure application settings such as interest rates and other
            financial parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="interest-rate">Default Interest Rate (%)</Label>
            <Input id="interest-rate" type="number" defaultValue="12" />
            <p className="text-sm text-muted-foreground">
              Annual interest rate for new loans. This will be used as a default
              value.
            </p>
          </div>
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-2">
              <Label>Accounting Session Management</Label>
              <p className="text-sm text-muted-foreground">
                Start or end the accounting session for a specific period.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="grid gap-2">
                <Label>
                  {sessionStatus === 'active' ? 'End Date' : 'Start Date'}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !sessionStartDate &&
                          sessionStatus === 'closed' &&
                          'text-muted-foreground',
                        !sessionEndDate &&
                          sessionStatus === 'active' &&
                          'text-muted-foreground'
                      )}
                      disabled={isSessionComplete}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {sessionStatus === 'closed' ? (
                        sessionStartDate ? (
                          format(sessionStartDate, 'PPP')
                        ) : (
                          <span>Pick a start date</span>
                        )
                      ) : sessionEndDate ? (
                        format(sessionEndDate, 'PPP')
                      ) : (
                        <span>Pick an end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        sessionStatus === 'closed'
                          ? sessionStartDate
                          : sessionEndDate
                      }
                      onSelect={
                        sessionStatus === 'closed'
                          ? setSessionStartDate
                          : setSessionEndDate
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <span>Status:</span>
                <Badge
                  variant={sessionStatus === 'active' ? 'default' : 'secondary'}
                  className={
                    sessionStatus === 'active'
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }
                >
                  {sessionStatus === 'active' && sessionStartDate
                    ? `Active (since ${format(
                        sessionStartDate!,
                        'dd MMM yyyy'
                      )})`
                    : 'Closed'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {sessionStatus === 'closed' && !isSessionComplete && (
                <Button
                  onClick={handleStartSession}
                  disabled={!sessionStartDate}
                >
                  <Power className="mr-2" /> Start Session
                </Button>
              )}
              {sessionStatus === 'active' && !isSessionComplete && (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleEndSession}
                    disabled={!sessionEndDate}
                  >
                    <PowerOff className="mr-2" /> End Session
                  </Button>
                  <Button variant="outline" onClick={handleRevertStart}>
                    <Undo2 className="mr-2 h-4 w-4" /> Revert Start
                  </Button>
                </>
              )}
            </div>

            {isSessionComplete && (
              <div className="mt-4 rounded-lg border bg-muted/50 p-4 text-sm">
                <p className="font-semibold">Session is complete.</p>
                <p className="text-muted-foreground mt-1">
                  Started: {format(sessionStartDate!, 'PPpp')}
                </p>
                <p className="text-muted-foreground">
                  Ended: {format(sessionEndDate!, 'PPpp')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleRevertEnd}
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Reopen Session
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
