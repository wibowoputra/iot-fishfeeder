import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as mqtt from "mqtt";

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER_URL || "mqtt://test.mosquitto.org";
const TOPIC_PREFIX = "fish-feeder/device/1"; // Default device ID 1
const TOPIC_STATUS = `${TOPIC_PREFIX}/status`;
const TOPIC_COMMAND = `${TOPIC_PREFIX}/command`;

let mqttClient: mqtt.MqttClient | null = null;
let deviceStatus = {
  online: false,
  lastSeen: "",
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
        if (payload.event === 'fed') {
           storage.createFeedLog({
             status: 'SUCCESS',
             type: payload.type || 'SCHEDULED', // 'SCHEDULED' or 'MANUAL'
             message: payload.message || 'Feed successful'
           });
        }
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
    res.json(schedules);
  });

  app.post(api.schedules.create.path, async (req, res) => {
    try {
      const input = api.schedules.create.input.parse(req.body);
      const schedule = await storage.createSchedule(input);
      res.status(201).json(schedule);
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
    res.json(schedule);
  });

  app.delete(api.schedules.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSchedule(id);
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
    // Check if lastSeen is too old (e.g., > 1 minute) to set online false
    if (deviceStatus.lastSeen) {
       const diff = Date.now() - new Date(deviceStatus.lastSeen).getTime();
       if (diff > 60000) { // 60 seconds timeout
          deviceStatus.online = false;
       }
    }
    res.json(deviceStatus);
  });

  app.post(api.device.feed.path, async (req, res) => {
    if (!mqttClient || !deviceStatus.mqttConnected) {
       // If MQTT not connected, log a failure or try anyway? 
       // For this app, we'll return success but note it might not send
       console.warn("MQTT not connected, command might fail");
    }

    const command = JSON.stringify({ action: "feed" });
    mqttClient?.publish(TOPIC_COMMAND, command, async (err) => {
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
