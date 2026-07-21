"use client";

import { useI18n } from "@/lib/i18n";
import type { DeviceMode, WriteMode } from "@/types/gameTypes";

type SetupModesProps = {
  deviceMode: DeviceMode;
  writeMode: WriteMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  onWriteModeChange: (mode: WriteMode) => void;
  // Spiele mit privaten Pro-Spieler-Infos (z.B. Wer bin ich) regeln bei
  // mehreren Geräten selbst, wer was darf - die Frage ergibt dort keinen Sinn.
  hideWriteMode?: boolean;
};

export function SetupModes({
  deviceMode,
  writeMode,
  onDeviceModeChange,
  onWriteModeChange,
  hideWriteMode = false,
}: SetupModesProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="font-bold text-(--sf-text) text-sm">
          {t.common.deviceQuestion}
        </legend>

        <div className="gap-2 grid grid-cols-2 mt-2">
          {(
            [
              ["single", t.common.oneDevice],
              ["multi", t.common.multipleDevices],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onDeviceModeChange(value)}
              className={`rounded-md px-3 py-3 text-sm font-bold ${
                deviceMode === value
                  ? "bg-(--accent-2) text-(--on-accent)"
                  : "bg-(--sf-surface) text-(--sf-text-muted)"
              }`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {deviceMode === "multi" && !hideWriteMode && (
        <fieldset>
          <legend className="font-bold text-(--sf-text) text-sm">
            {t.common.writeQuestion}
          </legend>

          <div className="gap-2 grid grid-cols-2 mt-2">
            {(
              [
                ["host", t.common.hostOnly],
                ["all", t.common.everyone],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onWriteModeChange(value)}
                className={`rounded-md px-3 py-3 text-sm font-bold ${
                  writeMode === value
                    ? "bg-(--accent-2) text-(--on-accent)"
                    : "bg-(--sf-surface) text-(--sf-text-muted)"
                }`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

    </div>
  );
}
