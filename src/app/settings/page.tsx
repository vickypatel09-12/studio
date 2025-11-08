'use client';
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

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your new settings have been successfully applied.',
    });
  };

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
          <div className="grid gap-2">
            <Label>Monthly Session</Label>
            <div className="flex items-center gap-4">
              <div className="grid w-full gap-1">
                <Label htmlFor="session-start" className="text-xs font-normal">
                  Start Day
                </Label>
                <Input
                  id="session-start"
                  type="number"
                  defaultValue="1"
                  min="1"
                  max="31"
                  className="w-24"
                />
              </div>
              <div className="grid w-full gap-1">
                <Label htmlFor="session-end" className="text-xs font-normal">
                  End Day
                </Label>
                <Input
                  id="session-end"
                  type="number"
                  defaultValue="31"
                  min="1"
                  max="31"
                  className="w-24"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The start and end day of the monthly accounting session.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
