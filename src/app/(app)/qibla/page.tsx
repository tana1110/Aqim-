"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { loadReminderConfig, saveReminderConfig } from "@/lib/reminder";

// Qibla direction — pure geometry on-device: great-circle bearing from the
// user's location to the Kaaba (21.4225 N, 39.8262 E).
const KAABA_LAT = (21.4225 * Math.PI) / 180;
const KAABA_LNG = (39.8262 * Math.PI) / 180;

function qiblaBearing(lat: number, lng: number): number {
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180;
  const dLng = KAABA_LNG - lo;
  const y = Math.sin(dLng);
  const x = Math.cos(la) * Math.tan(KAABA_LAT) - Math.sin(la) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

interface OrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

export default function QiblaPage() {
  const { t, lang } = useLang();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [heading, setHeading] = useState<number | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const cfg = loadReminderConfig();
    if (cfg.lat != null && cfg.lng != null) {
      setCoords({ lat: cfg.lat, lng: cfg.lng });
    }
    // iOS requires an explicit user gesture before compass events flow.
    const needsPermission =
      typeof (
        DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }
      ).requestPermission === "function";
    setNeedsTap(needsPermission);
    if (!needsPermission) listen();
    return unlisten;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onOrient(e: DeviceOrientationEvent) {
    const ios = (e as OrientationEventiOS).webkitCompassHeading;
    if (ios != null) setHeading(ios);
    else if (e.absolute && e.alpha != null) setHeading(360 - e.alpha);
  }
  function listen() {
    window.addEventListener("deviceorientationabsolute", onOrient as EventListener);
    window.addEventListener("deviceorientation", onOrient as EventListener);
  }
  function unlisten() {
    window.removeEventListener(
      "deviceorientationabsolute",
      onOrient as EventListener,
    );
    window.removeEventListener("deviceorientation", onOrient as EventListener);
  }

  async function enableCompass() {
    try {
      const req = (
        DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }
      ).requestPermission;
      if (req && (await req()) !== "granted") return;
    } catch {}
    setNeedsTap(false);
    listen();
  }

  function enableLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        const cfg = loadReminderConfig();
        saveReminderConfig({ ...cfg, lat, lng, locationLabel: null });
        setCoords({ lat, lng });
      },
      () => {},
      { timeout: 12000, maximumAge: 600000 },
    );
  }

  const bearing = coords ? qiblaBearing(coords.lat, coords.lng) : null;
  // Arrow rotation on screen: qibla bearing relative to where the phone points.
  const arrowDeg =
    bearing != null ? (heading != null ? bearing - heading : bearing) : 0;
  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);

  return (
    <div className="pt-2 max-w-md mx-auto space-y-5 text-center">
      <h1 className="text-xl font-bold">{t("qibla.title")}</h1>

      {!coords ? (
        <div className="card p-8 space-y-4">
          <p className="text-sm text-muted">{t("qibla.needLoc")}</p>
          <button onClick={enableLocation} className="btn-primary px-5 py-2.5 text-sm">
            <MapPin size={14} className="inline me-1.5" />
            {t("qibla.enableLoc")}
          </button>
        </div>
      ) : (
        <div className="card p-8 space-y-5">
          <div className="relative mx-auto w-56 h-56 rounded-full border-2 border-border grid place-items-center">
            {/* cardinal marks */}
            {[0, 90, 180, 270].map((d) => (
              <span
                key={d}
                className="absolute w-1 h-3 bg-border rounded-full"
                style={{
                  top: 6,
                  left: "50%",
                  transformOrigin: "50% 106px",
                  transform: `translateX(-50%) rotate(${d}deg)`,
                }}
              />
            ))}
            <div
              className="transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${arrowDeg}deg)` }}
            >
              <svg width="120" height="120" viewBox="0 0 120 120">
                <path
                  d="M60 12 L74 66 L60 56 L46 66 Z"
                  fill="var(--color-primary)"
                />
                <circle cx="60" cy="78" r="7" fill="var(--color-accent)" />
              </svg>
            </div>
          </div>

          <p className="text-sm font-bold tabular-nums">
            {t("qibla.deg", { n: digits(Math.round(bearing!)) })}
          </p>
          <p className="text-xs text-muted">
            {heading != null ? t("qibla.hint") : t("qibla.static", { n: digits(Math.round(bearing!)) })}
          </p>

          {needsTap && (
            <button onClick={enableCompass} className="btn-primary px-5 py-2.5 text-sm">
              {t("qibla.compassBtn")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
