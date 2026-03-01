import { Router } from "express";
import { geocodeAddress, getRoute } from "../services/googleMaps.js";
import type { TravelMode } from "../services/googleMaps.js";

const router = Router();

/**
 * POST /api/geocode
 * Body: { address: string }
 * Returns: { lat, lng, formattedAddress }
 */
router.post("/geocode", async (req, res) => {
  try {
    const { address } = req.body as { address?: string };

    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "address is required" });
      return;
    }

    const result = await geocodeAddress(address);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/route
 * Body: { origin: { lat, lng }, destination: { lat, lng }, travelMode?: string }
 * Returns: { distanceMeters, durationSeconds }
 */
router.post("/route", async (req, res) => {
  try {
    const { origin, destination, travelMode } = req.body as {
      origin?: { lat: number; lng: number };
      destination?: { lat: number; lng: number };
      travelMode?: TravelMode;
    };

    if (!origin?.lat || !origin?.lng) {
      res.status(400).json({ error: "origin with lat/lng is required" });
      return;
    }
    if (!destination?.lat || !destination?.lng) {
      res.status(400).json({ error: "destination with lat/lng is required" });
      return;
    }

    const result = await getRoute(origin, destination, travelMode);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
