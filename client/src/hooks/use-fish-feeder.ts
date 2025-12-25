import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSchedule } from "@shared/schema";

// ============================================
// SCHEDULES HOOKS
// ============================================

export function useSchedules() {
  return useQuery({
    queryKey: [api.schedules.list.path],
    queryFn: async () => {
      const res = await fetch(api.schedules.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return api.schedules.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const res = await fetch(api.schedules.create.path, {
        method: api.schedules.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.schedules.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create schedule");
      }
      return api.schedules.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] }),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertSchedule>) => {
      const url = buildUrl(api.schedules.update.path, { id });
      const res = await fetch(url, {
        method: api.schedules.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      return api.schedules.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] }),
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.schedules.delete.path, { id });
      const res = await fetch(url, {
        method: api.schedules.delete.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] }),
  });
}

// ============================================
// FEED LOGS HOOKS
// ============================================

export function useFeedLogs() {
  return useQuery({
    queryKey: [api.feedLogs.list.path],
    queryFn: async () => {
      const res = await fetch(api.feedLogs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.feedLogs.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10000, // Poll every 10s
  });
}

// ============================================
// DEVICE HOOKS
// ============================================

export function useDeviceStatus() {
  return useQuery({
    queryKey: [api.device.status.path],
    queryFn: async () => {
      const res = await fetch(api.device.status.path, { credentials: "include" });
       console.log("Response useDeviceStatus :", res);
      if (!res.ok) throw new Error("Failed to fetch device status");
      return api.device.status.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s for realtime status
  });
}

export function useTriggerFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.device.feed.path, {
        method: api.device.feed.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trigger feed");
      return api.device.feed.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feedLogs.list.path] });
    },
  });
}
