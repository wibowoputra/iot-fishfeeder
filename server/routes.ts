import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as mqtt from "mqtt";

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER_URL || "mqtt://test.mosquitto.org";
// const TOPIC_PREFIX = "fish-feeder/device/1"; // Default device ID 1
const TOPIC_PREFIX_CMD = "fishfeeder/01/cmd";
const TOPIC_PREFIX = "fishfeeder/01";
const TOPIC_PREFIX_STATUS = "fishfeeder/01/status";

const TOPIC_STATUS = `${TOPIC_PREFIX}/status`;
const TOPIC_STATUS_CONNECTION = `${TOPIC_PREFIX_STATUS}/connection`;
const TOPIC_STATUS_PROGRESS = `${TOPIC_PREFIX_STATUS}/progress`;
const TOPIC_COMMAND_FEED = `${TOPIC_PREFIX_CMD}/feed`;
const TOPIC_COMMAND_SCHEDULE = `${TOPIC_PREFIX_CMD}/schedule`;
const TOPIC_COMMAND_SCHEDULES = `${TOPIC_PREFIX_CMD}/schedules`;


let mqttClient: mqtt.MqttClient | null = null;
let deviceStatus = {
  online: false,
  ip: "",
  reason: "",
  progress: "",
  lastSeen: "",
  source: "",
  elapsed_ms: 0,
  total_ms: 0,
  mqttConnected: false
};

function setupMqtt() {
  console.log(`Connecting to MQTT broker: ${MQTT_BROKER}`);
  mqttClient = mqtt.connect(MQTT_BROKER);

  mqttClient.on("connect", () => {
    console.log("MQTT Connected");
    deviceStatus.mqttConnected = true;
    mqttClient?.subscribe(TOPIC_STATUS, (err) => {
      if (!err) {
        console.log(`Subscribed to ${TOPIC_STATUS}`);
      }
    });
    mqttClient?.subscribe(TOPIC_STATUS_CONNECTION, (err) => {
      if (!err) {
        console.log(`Subscribed to ${TOPIC_STATUS_CONNECTION}`);
      }
    });
    mqttClient?.subscribe(TOPIC_STATUS_PROGRESS, (err) => {
      if (!err) {
        console.log(`Subscribed to ${TOPIC_STATUS_PROGRESS}`);
      }
    });
    mqttClient?.subscribe(TOPIC_COMMAND_SCHEDULES, (err) => {
      if (!err) {
        console.log(`Subscribed to ${TOPIC_COMMAND_SCHEDULES}`);
      }
    });
  });

  mqttClient.on("message", (topic, message) => {
    if (topic === TOPIC_STATUS) {
      try {
        const payload = JSON.parse(message.toString());
        // update device status
        deviceStatus.online = true; // Assume online if sending status
        deviceStatus.lastSeen = new Date().toISOString();
        console.log("Received status:", payload);

        // If the device reports a feed event, log it

        console.log("payload");
        storage.createFeedLog({
          status: payload.event === 'feeding done' ? 'SUCCESS' : 'PENDING',
          type: payload.source.toUpperCase() || 'SCHEDULE', // 'SCHEDULED' or 'MANUAL'
          message: payload.event || 'Feed successful'
        });

      } catch (e) {
        console.error("Failed to parse MQTT message", e);
      }
    }
    if (topic === TOPIC_STATUS_CONNECTION) {
      try {
        
        const payload = JSON.parse(message.toString());
        // update device status
        console.log("Received Payload status connection :", payload);
        deviceStatus.online = payload.state ===  "online" ? true : false; // Assume online if sending status
        deviceStatus.reason = payload.reason || "-";
        deviceStatus.ip = payload.ip || "-";
        deviceStatus.lastSeen = new Date().toISOString();
        console.log("DeviceStatus value :", deviceStatus);

      } catch (e) {
        console.error("Failed to parse MQTT message", e);
      }
    }
    if (topic === TOPIC_STATUS_PROGRESS) {
      try {
        const payload = JSON.parse(message.toString());
        // update device status
        console.log("Received Payload status progress :", payload);
        deviceStatus.progress = payload.event || "-";
        deviceStatus.source = payload.source || "-";
        deviceStatus.elapsed_ms = payload.elapsed_ms || 0;
        deviceStatus.total_ms = payload.total_ms || 0;
        deviceStatus.lastSeen = new Date().toISOString();
      } catch (e) {
        console.error("Failed to parse MQTT message", e);
      }
    }
    if (topic === TOPIC_COMMAND_SCHEDULES) {
      try {
        const payload = JSON.parse(message.toString());
        // update device status
        console.log("Received TOPIC_COMMAND_SCHEDULES :", payload);

      } catch (e) {
        console.error("Failed to parse MQTT message", e);
      }
    }
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT Error:", err);
    deviceStatus.mqttConnected = false;
  });

  mqttClient.on("offline", () => {
    deviceStatus.mqttConnected = false;
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Initialize MQTT
  setupMqtt();

  // --- Schedules API ---
  app.get(api.schedules.list.path, async (req, res) => {
    const schedules = await storage.getSchedules();
    console.log("Get Schedules :", schedules);
    res.json(schedules);
  });

  app.post(api.schedules.create.path, async (req, res) => {
    try {
      const input = api.schedules.create.input.parse(req.body);
      console.log("input :", input);
      const schedules = await storage.getSchedules();
      // Validasi maksimum 5
      if (schedules.length >= 5) {
        return res.status(400).json({
          message: "Maximum 5 schedules allowed",
        });
      }

      console.log("schdules :", schedules);
      const command = JSON.stringify({
        schedules: [
          ...schedules
            .filter(s => s.enabled)
            .map(s => {
              const [hourStr, minuteStr] = s.time.split(":");
              const hour = parseInt(hourStr, 10);
              const minute = parseInt(minuteStr, 10);
              const duration = 30000; // default
              const flag = 1; // default
              return [hour, minute, duration, flag];
            }),
          // tambahkan data baru (Zod object)
          ...(input.enabled
            ? (() => {
              const [hourStr, minuteStr] = input.time.split(":");
              const hour = parseInt(hourStr, 10);
              const minute = parseInt(minuteStr, 10);
              const duration = 30000;
              const flag = 1;
              return [[hour, minute, duration, flag]]; // return array of array
            })()
            : []),],
      });

      console.log("command :", command);
      mqttClient?.publish(TOPIC_COMMAND_SCHEDULES, command, async (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: "Failed to send command" });
        }

        const schedule = await storage.createSchedule(input);
        res.status(201).json(schedule);
      });


    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.schedules.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const schedule = await storage.updateSchedule(id, req.body);

    const schedules = await storage.getSchedules();

    console.log("schdules :", schedules);
    const command = JSON.stringify({
      schedules: [
        ...schedules
          .filter(s => s.enabled)
          .map(s => {
            const [hourStr, minuteStr] = s.time.split(":");
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            const duration = 30000; // default
            const flag = 1; // default
            return [hour, minute, duration, flag];
          }),
      ],
    });

    console.log("command :", command);
    mqttClient?.publish(TOPIC_COMMAND_SCHEDULES, command, async (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to send command" });
      }
    });

    res.json(schedule);
  });

  app.delete(api.schedules.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSchedule(id);
    const schedules = await storage.getSchedules();
    const command = JSON.stringify({
      schedules: [
        ...schedules
          .filter(s => s.enabled)
          .map(s => {
            const [hourStr, minuteStr] = s.time.split(":");
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            const duration = 30000; // default
            const flag = 1; // default
            return [hour, minute, duration, flag];
          }),
      ],
    });

    console.log("command :", command);
    mqttClient?.publish(TOPIC_COMMAND_SCHEDULES, command, async (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to send command" });
      }
    });

    res.status(204).send();
  });

  // --- Feed Logs API ---
  app.get(api.feedLogs.list.path, async (req, res) => {
    const logs = await storage.getFeedLogs();
    res.json(logs);
  });

  app.post(api.feedLogs.create.path, async (req, res) => {
    // Manual log creation (mostly for testing if no device)
    const input = api.feedLogs.create.input.parse(req.body);
    const log = await storage.createFeedLog(input);
    res.status(201).json(log);
  });

  // --- Device API ---
  app.get(api.device.status.path, (req, res) => {
    console.log("Device status requested :", deviceStatus);
    res.json(deviceStatus);
  });

  app.post(api.device.feed.path, async (req, res) => {
    if (!mqttClient || !deviceStatus.mqttConnected) {
      // If MQTT not connected, log a failure or try anyway? 
      // For this app, we'll return success but note it might not send
      console.warn("MQTT not connected, command might fail");
    }

    const command = JSON.stringify({ action: "feed" });
    mqttClient?.publish(TOPIC_COMMAND_FEED, command, async (err) => {
      if (err) {
        await storage.createFeedLog({
          status: "FAILED",
          type: "MANUAL",
          message: "Failed to publish MQTT command"
        });
        return res.status(500).json({ success: false, message: "Failed to send command" });
      }

      await storage.createFeedLog({
        status: "PENDING",
        type: "MANUAL",
        message: "Command sent to device"
      });
      res.json({ success: true, message: "Feed command sent" });
    });
  });

  return httpServer;
}
