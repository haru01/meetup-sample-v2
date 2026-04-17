import type { EventFormat } from "../types";

export const EVENT_FORMATS: EventFormat[] = ["ONLINE", "OFFLINE", "HYBRID"];

const FORMAT_LABELS: Record<EventFormat, string> = {
  ONLINE: "オンライン",
  OFFLINE: "オフライン",
  HYBRID: "ハイブリッド",
};

export const getFormatLabel = (format: EventFormat): string =>
  FORMAT_LABELS[format];
