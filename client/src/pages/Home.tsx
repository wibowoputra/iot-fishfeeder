import { useState } from "react";
import { useSchedules, useFeedLogs, useDeviceStatus, useTriggerFeed } from "@/hooks/use-fish-feeder";
import { StatusCard } from "@/components/StatusCard";
import { ScheduleList } from "@/components/ScheduleList";
import { FeedLogs } from "@/components/FeedLogs";
import { ScheduleDialog } from "@/components/ScheduleDialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { 
  Fish, 
  Wifi, 
  WifiOff, 
  History, 
  Clock, 
  Plus, 
  Utensils 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const schedules = useSchedules();
  const logs = useFeedLogs();
  const device = useDeviceStatus();  
  const triggerFeed = useTriggerFeed();
  // Derived State
  const isOnline = device.data?.online ?? false;
  const isMQTTConnected = device.data?.mqttConnected ?? false;
  const lastFeed = logs.data?.find(l => l.status === "SUCCESS");
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextSchedule = schedules.data
    ?.filter(s => s.enabled)
    .map(s => {
    const [hour, minute] = s.time.split(':').map(Number);
    return { ...s, totalMinutes: hour * 60 + minute };
  })
  .filter(s => s.totalMinutes > nowMinutes) // hanya yang belum lewat
  .sort((a, b) => a.totalMinutes - b.totalMinutes)[0];
  
  const handleManualFeed = async () => {
    try {
      await triggerFeed.mutateAsync();
      toast({
        title: "Feeding triggered",
        description: "The device is dispensing food now.",
        className: "bg-primary text-primary-foreground border-none",
      });
    } catch (error) {
      toast({
        title: "Feeding failed",
        description: "Could not communicate with the device.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Decorative Header Background */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent -z-10" />

      <main className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              IoT Fish Feeder
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage schedules and monitor your aquarium status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 border ${
              isOnline 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isOnline ? "IP Device : "+ device.data?.ip : 'Device Offline'}
            </div>
        
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 border ${
              isMQTTConnected 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isMQTTConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isMQTTConnected ? 'MQTT Online' : 'MQTT Offline'}
            </div>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            title="Device Status"
            value={isOnline ? "Connected" : "Offline"}
            status={isOnline ? "success" : "danger"}
            icon={isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            subtext= {device.data?.lastSeen ? "Last seen: " + format(new Date(device.data.lastSeen), 'h:mm a')  : "Waiting for connection..."}
          />
          <StatusCard
            title="Last Feeding"
            value={lastFeed ? formatInTimeZone(new Date(lastFeed.triggeredAt), "UTC",'h:mm a') : "--:--"}
            status="neutral"
            icon={<History className="w-6 h-6" />}
            subtext={lastFeed ? formatInTimeZone(new Date(lastFeed.triggeredAt),"UTC",'MMM d, yyyy')
              : "No records yet"}
          />
          <StatusCard
            title="Next Scheduled"
            value={nextSchedule ? format(new Date(`2000-01-01T${nextSchedule.time}`), 'h:mm a') : "--:--"}
            status="warning"
            icon={<Clock className="w-6 h-6" />}
            subtext={nextSchedule ? "Daily schedule" : "No active schedules"}
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Schedules */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-3xl border shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Feeding Schedule
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Automated daily feeding times</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Time
                </Button>
              </div>
              
              <ScheduleList 
                schedules={schedules.data || []} 
                isLoading={schedules.isLoading} 
              />
            </div>
          </div>

          {/* Right Column: Logs */}
          <div className="space-y-6">
            <div className="bg-card rounded-3xl border shadow-sm p-6 h-full">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
              <FeedLogs 
                logs={logs.data || []} 
                isLoading={logs.isLoading} 
              />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button for Mobile / Fixed Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button 
          size="lg" 
          onClick={handleManualFeed}
          disabled={!isOnline || triggerFeed.isPending}
          className={`
            h-14 px-8 rounded-full shadow-2xl transition-all duration-300
            ${isOnline 
              ? 'bg-gradient-to-r from-primary to-blue-600 hover:scale-105' 
              : 'bg-muted-foreground cursor-not-allowed'}
          `}
        >
          {triggerFeed.isPending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
          ) : (
            <Utensils className="mr-2 w-5 h-5" />
          )}
          <span className="font-semibold text-lg">
            {triggerFeed.isPending ? 'Dispensing...' : 'Feed Now'}
          </span>
        </Button>
      </div>

      <ScheduleDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
}
