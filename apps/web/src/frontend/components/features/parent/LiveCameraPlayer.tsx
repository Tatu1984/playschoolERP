"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "connecting" | "live" | "error";

/**
 * Minimal WHEP (WebRTC-HTTP Egress Protocol) client for MediaMTX.
 *
 * Flow: request a short-lived view token from our API -> create an SDP offer ->
 * POST it to MediaMTX's WHEP endpoint with the token as a Bearer credential ->
 * MediaMTX calls our /api/cctv/authorize hook to validate -> we apply the
 * answer and the live stream flows peer-to-peer. No RTSP/credentials ever
 * reach the browser.
 */
export function LiveCameraPlayer({
  cameraId,
  liveNow,
}: {
  cameraId: string;
  liveNow: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const stop = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    setMessage("");
    try {
      // 1) Ask our server to authorize + mint a token for this exact camera.
      const tokenRes = await fetch("/api/cctv/view-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.error ?? "Access denied");
      }
      const { whepUrl, token } = tokenData as { whepUrl: string; token: string };

      // 2) Build the receive-only peer connection.
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.ontrack = (e) => {
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0];
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("live");
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setStatus((s) => (s === "live" ? "error" : s));
        }
      };

      // 3) Offer + wait for ICE gathering to complete (non-trickle WHEP).
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      // 4) POST the offer to MediaMTX WHEP with the token as Bearer credential.
      const answerRes = await fetch(whepUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Authorization: `Bearer ${token}`,
        },
        body: pc.localDescription?.sdp ?? "",
      });
      if (!answerRes.ok) {
        throw new Error(`Stream server refused the connection (${answerRes.status})`);
      }
      const answerSdp = await answerRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      stop();
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not start the stream");
    }
  }, [cameraId, stop]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        {status !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-white/80">
            {status === "connecting" && <p>Connecting to live feed…</p>}
            {status === "idle" && !liveNow && (
              <p className="px-4">Live viewing is only available during school hours.</p>
            )}
            {status === "idle" && liveNow && <p>Press play to watch live.</p>}
            {status === "error" && <p className="px-4 text-red-300">{message}</p>}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {status === "live" ? (
          <Button size="sm" variant="outline" onClick={stop}>
            Stop
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={!liveNow || status === "connecting"}>
            {status === "connecting" ? "Connecting…" : "Watch live"}
          </Button>
        )}
      </div>
    </div>
  );
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000); // don't hang forever
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}
