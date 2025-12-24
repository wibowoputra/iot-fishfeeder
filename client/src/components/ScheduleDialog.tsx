import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScheduleSchema, type InsertSchedule, type Schedule } from "@shared/schema";
import { useCreateSchedule, useUpdateSchedule } from "@/hooks/use-fish-feeder";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleToEdit?: Schedule;
}

export function ScheduleDialog({ open, onOpenChange, scheduleToEdit }: ScheduleDialogProps) {
  const { toast } = useToast();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  
  const isEditing = !!scheduleToEdit;

  const form = useForm<InsertSchedule>({
    resolver: zodResolver(insertScheduleSchema),
    defaultValues: {
      time: "12:00",
      enabled: true,
      days: [],
    },
  });

  useEffect(() => {
    if (open) {
      if (scheduleToEdit) {
        form.reset({
          time: scheduleToEdit.time,
          enabled: scheduleToEdit.enabled,
          days: scheduleToEdit.days,
        });
      } else {
        form.reset({
          time: "12:00",
          enabled: true,
          days: [],
        });
      }
    }
  }, [open, scheduleToEdit, form]);

  const onSubmit = async (data: InsertSchedule) => {
    try {
      if (isEditing && scheduleToEdit) {
        await updateSchedule.mutateAsync({ id: scheduleToEdit.id, ...data });
        toast({ title: "Schedule updated", description: `Feeding time updated to ${data.time}` });
      } else {
        await createSchedule.mutateAsync(data);
        toast({ title: "Schedule created", description: `New feeding time set for ${data.time}` });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save schedule", 
        variant: "destructive" 
      });
    }
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {isEditing ? "Edit Schedule" : "Add Feeding Time"}
          </DialogTitle>
          <DialogDescription>
            Set the time when the automatic feeder should trigger.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time (24h)</FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      className="text-lg py-6 font-mono bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-all"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
