"use client";

import { useEffect, useRef, useState } from "react";

function isStoredPhotoPath(value: string) {
  return Boolean(value) && value.includes("/") && !/\s/.test(value);
}

export function ReportPhotoField({
  donationId,
  fieldKey,
  value,
  onChange,
  disabled,
}: {
  donationId: string;
  fieldKey: string;
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [error, setError] = useState("");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (!donationId) {
      setError("Select a work order before adding photos.");
      return;
    }

    setUploading(true);
    setError("");

    const body = new FormData();
    body.set("donation_id", donationId);
    body.set("field_key", fieldKey);
    body.set("photo", file);

    try {
      const res = await fetch("/api/trailer-report-photos", {
        method: "POST",
        body,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Upload failed");
        return;
      }
      onChange(String(payload.path || ""));
      setCameraOpen(false);
      stopCamera();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function openDeviceCamera() {
    if (!donationId) {
      setError("Select a work order before adding photos.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser cannot access the camera. Use Choose photo, or try Chrome/Safari on the tablet.",
      );
      return;
    }

    setError("");
    setStartingCamera(true);
    setCameraOpen(true);

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      stopCamera();
      setCameraOpen(false);
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Camera permission was denied. Allow camera access for this site, then try again.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No camera was found on this device.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("The camera is already in use by another app.");
      } else {
        setError("Unable to open the camera on this device.");
      }
    } finally {
      setStartingCamera(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is still starting. Wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture from the camera.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setError("Unable to capture from the camera.");
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    await uploadFile(file);
  }

  function closeCamera() {
    setCameraOpen(false);
    stopCamera();
  }

  const previewUrl = isStoredPhotoPath(value)
    ? `/api/request-documents?path=${encodeURIComponent(value)}`
    : "";

  return (
    <div className="space-y-2">
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading || !donationId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void uploadFile(file);
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary !py-2 !px-3 text-sm"
          disabled={disabled || uploading || !donationId || startingCamera}
          onClick={() => void openDeviceCamera()}
        >
          {startingCamera ? "Starting camera…" : "Open device camera"}
        </button>
        <button
          type="button"
          className="btn btn-secondary !py-2 !px-3 text-sm"
          disabled={disabled || uploading || !donationId}
          onClick={() => galleryRef.current?.click()}
        >
          Choose photo
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-secondary !py-2 !px-3 text-sm text-red-700"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
          >
            Remove photo
          </button>
        )}
      </div>

      {previewUrl ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-line bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded report photo"
            className="max-h-56 w-full object-contain bg-slate-50"
          />
        </a>
      ) : value ? (
        <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">
          Saved reference: {value}
        </p>
      ) : (
        <p className="text-sm text-muted">
          Open device camera requests camera permission and shows a live
          preview. Choose photo opens the gallery/files picker.
        </p>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Device camera"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-lg font-bold text-ink">Device camera</h3>
              <p className="text-sm text-muted">
                Allow camera access if prompted, then take the photo.
              </p>
            </div>
            <div className="bg-black">
              <video
                ref={videoRef}
                className="max-h-[70vh] w-full object-contain"
                playsInline
                muted
                autoPlay
              />
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={uploading}
                onClick={closeCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={uploading || startingCamera}
                onClick={() => void capturePhoto()}
              >
                {uploading ? "Uploading…" : "Take photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportPhotoLink({ path }: { path: string | null | undefined }) {
  if (!path) return null;
  if (!isStoredPhotoPath(path)) {
    return <span className="text-sm text-muted">Photo: {path}</span>;
  }
  const href = `/api/request-documents?path=${encodeURIComponent(path)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-block overflow-hidden rounded-lg border border-line"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt="Report photo"
        className="max-h-40 max-w-full object-contain bg-slate-50"
      />
    </a>
  );
}
