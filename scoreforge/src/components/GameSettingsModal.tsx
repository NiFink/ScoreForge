"use client";

import { useState } from "react";

import { colorOptions as allColorOptions } from "@/lib/colors";
import { format, useI18n } from "@/lib/i18n";
import { isNameTaken } from "@/lib/playerValidation";
import { DeleteGameButton } from "./DeleteGameButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PlayerAvatar } from "./PlayerAvatar";
import type {
  BaseGameState,
  DeviceMode,
  WriteMode,
} from "@/types/gameTypes";

export type StartingPointsMode = "zero" | "median" | "average";

type GameSettingsModalProps = {
  state: BaseGameState;
  // Aktuelle Gesamtpunkte pro Spieler — Basis für Median/Durchschnitt
  totals: Record<string, number>;
  minPlayers: number;
  maxPlayers: number;
  // Binokel: Runden hängen an festen Teams -> kein Hinzufügen/Entfernen
  allowPlayerChanges: boolean;
  // Bis wann die Lobby aktuell aufbewahrt wird (game.expires_at)
  expiresAt?: string;
  onChangeWriteMode: (mode: WriteMode) => void;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  onBackToLobby: () => void;
  onPause: () => void;
  onResume: () => void;
  onAddPlayer: (name: string, color: string, startingPoints: number) => void;
  onRemovePlayer: (playerId: string) => void;
  onDelete: () => Promise<boolean>;
  onClose: () => void;
  // Eingeschränkte Palette für Spiele mit wenigen Spielern (siehe lib/colors);
  // Standard ist die volle Palette.
  colorOptions?: typeof allColorOptions;
  // Spiele mit privaten Pro-Spieler-Infos (z.B. Wer bin ich) regeln bei
  // mehreren Geräten selbst, wer was darf - die Frage ergibt dort keinen Sinn.
  hideWriteMode?: boolean;
};

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

export function GameSettingsModal({
  state,
  totals,
  minPlayers,
  maxPlayers,
  allowPlayerChanges,
  expiresAt,
  onChangeWriteMode,
  onChangeDeviceMode,
  onBackToLobby,
  onPause,
  onResume,
  onAddPlayer,
  onRemovePlayer,
  onDelete,
  onClose,
  colorOptions = allColorOptions,
  hideWriteMode = false,
}: GameSettingsModalProps) {
  const { t, lang } = useI18n();
  const [nameDraft, setNameDraft] = useState("");
  const [startMode, setStartMode] = useState<StartingPointsMode>("zero");
  const [colorDraft, setColorDraft] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const totalValues = state.players.map((player) => totals[player.id] ?? 0);
  const startValue =
    startMode === "zero"
      ? 0
      : startMode === "median"
        ? median(totalValues)
        : average(totalValues);

  const takenColors = new Set(state.players.map((player) => player.color));
  const freeColors = colorOptions.filter(
    (color) => !takenColors.has(color.value),
  );
  const selectedColor =
    colorDraft ?? freeColors[0]?.value ?? colorOptions[0].value;

  // "Wer darf editieren" ergibt nur bei mehreren Geräten Sinn - bei einem
  // gemeinsamen Gerät editiert ohnehin nur, wer es gerade in der Hand hält.
  // Gleiche Logik wie im Setup (siehe SetupModes).
  const showWriteMode = !hideWriteMode && state.deviceMode === "multi";

  const nameDraftTaken = isNameTaken(nameDraft, state.players);
  const canAdd =
    allowPlayerChanges &&
    state.players.length < maxPlayers &&
    nameDraft.trim().length > 0 &&
    !nameDraftTaken;
  const canRemove = allowPlayerChanges && state.players.length > minPlayers;

  const addPlayer = () => {
    if (!canAdd) {
      return;
    }

    onAddPlayer(nameDraft.trim(), selectedColor, startValue);
    setNameDraft("");
    setColorDraft(null);
  };

  const startModeOptions: { value: StartingPointsMode; label: string }[] = [
    { value: "zero", label: t.settings.startZero },
    { value: "median", label: t.settings.startMedian },
    { value: "average", label: t.settings.startAverage },
  ];

  return (
    <div className="z-50 fixed inset-0 place-items-end sm:place-items-center grid bg-black/75 p-3">
      <div className="bg-(--sf-surface) shadow-2xl p-5 border border-(--accent)/25 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <h2 className="font-black text-2xl">{t.settings.title}</h2>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-(--sf-text)/15 rounded-md text-sm"
            type="button"
          >
            X
          </button>
        </div>

        {/* SPRACHE */}
        <p className="font-bold text-(--sf-text) text-sm">
          {t.settings.languageSection}
        </p>
        <div className="mt-2">
          <LanguageSwitcher />
        </div>

        {/* DEVICE MODE / LOBBY */}
        <p className="mt-5 font-bold text-(--sf-text) text-sm">
          {t.settings.lobbySection}
        </p>
        <div className="gap-2 grid grid-cols-2 mt-2">
          {(
            [
              ["single", t.common.oneDevice],
              ["multi", t.common.multipleDevices],
            ] as [DeviceMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => onChangeDeviceMode(mode)}
              className={`rounded-md px-3 py-3 font-black ${
                state.deviceMode === mode
                  ? "bg-(--accent) text-(--on-accent)"
                  : "bg-(--sf-bg) text-(--sf-text-muted)"
              }`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {state.deviceMode === "multi" && state.phase !== "lobby" ? (
          <div className="mt-3">
            <button
              onClick={onBackToLobby}
              className="px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-(--sf-text-subtle) text-sm"
              type="button"
            >
              {t.settings.backToLobby}
            </button>
            <p className="mt-1 text-(--sf-text-subtle) text-xs">
              {t.settings.backToLobbyHint}
            </p>
          </div>
        ) : null}

        {/* WRITE MODE - nur relevant bei mehreren Geräten (siehe showWriteMode) */}
        {!showWriteMode ? null : (
          <>
            <p className="mt-5 font-bold text-(--sf-text) text-sm">
              {t.common.writeQuestion}
            </p>
            <div className="gap-2 grid grid-cols-2 mt-2">
              {(
                [
                  ["host", t.common.hostOnly],
                  ["all", t.common.everyone],
                ] as [WriteMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => onChangeWriteMode(mode)}
                  className={`rounded-md px-3 py-3 font-black ${
                    state.writeMode === mode
                      ? "bg-(--accent) text-(--on-accent)"
                      : "bg-(--sf-bg) text-(--sf-text-muted)"
                  }`}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* PAUSE / RESUME */}
        <p className="mt-5 font-bold text-(--sf-text) text-sm">
          {t.settings.pauseSection}
        </p>
        {state.paused ? (
          <div className="mt-2">
            <span className="inline-block bg-(--accent)/15 px-2 py-1 rounded-md font-bold text-(--accent-2) text-xs">
              {t.settings.pausedBadge}
            </span>
            {expiresAt ? (
              <p className="mt-2 text-(--sf-text-subtle) text-xs">
                {format(t.settings.pausedUntil, {
                  date: new Date(expiresAt).toLocaleDateString(
                    lang === "de" ? "de-DE" : "en-US",
                  ),
                })}
              </p>
            ) : null}
            <button
              onClick={onResume}
              className="mt-2 px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-(--sf-text-subtle) text-sm"
              type="button"
            >
              {t.settings.resumeButton}
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <button
              onClick={onPause}
              className="px-4 py-3 border border-(--accent-2)/40 rounded-md w-full font-bold text-(--sf-text-subtle) text-sm"
              type="button"
            >
              {t.settings.pauseButton}
            </button>
            <p className="mt-1 text-(--sf-text-subtle) text-xs">
              {t.settings.pauseHint}
            </p>
          </div>
        )}

        {/* PLAYERS */}
        <p className="mt-5 font-bold text-(--sf-text) text-sm">
          {t.settings.playersSection}
        </p>

        {!allowPlayerChanges ? (
          <p className="bg-(--sf-bg) mt-2 p-3 rounded-lg text-(--sf-text-subtle) text-xs">
            {t.settings.playerChangesUnavailable}
          </p>
        ) : (
          <>
            <div className="space-y-2 mt-2">
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center gap-3 bg-(--sf-bg) p-3 border border-(--sf-text)/10 rounded-lg"
                  style={{ boxShadow: `inset 4px 0 0 ${player.color}` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar color={player.color} size="lg" />
                    <div className="min-w-0">
                      <p className="font-bold truncate">{player.name}</p>
                      <p className="text-(--sf-text-subtle) text-xs">
                        {totals[player.id] ?? 0} {t.common.points}
                      </p>
                    </div>
                  </div>
                  {canRemove ? (
                    pendingRemoveId === player.id ? (
                      <button
                        onClick={() => {
                          setPendingRemoveId(null);
                          onRemovePlayer(player.id);
                        }}
                        className="bg-[#ef5b2a] px-3 py-2 rounded-md font-black text-white text-xs whitespace-nowrap"
                        type="button"
                      >
                        {format(t.settings.removeConfirm, {
                          name: player.name,
                        })}
                      </button>
                    ) : (
                      <button
                        onClick={() => setPendingRemoveId(player.id)}
                        className="px-3 py-2 border border-[#ef5b2a]/40 rounded-md font-bold text-[#ef5b2a] text-xs whitespace-nowrap"
                        type="button"
                      >
                        {t.settings.removePlayer}
                      </button>
                    )
                  ) : null}
                </div>
              ))}
            </div>

            {!canRemove ? (
              <p className="mt-2 text-(--sf-text-subtle) text-xs">
                {format(t.settings.minPlayersNote, { n: minPlayers })}
              </p>
            ) : null}

            {/* ADD PLAYER */}
            {state.players.length < maxPlayers ? (
              <div className="bg-(--sf-bg) mt-4 p-3 rounded-lg">
                <p className="font-bold text-(--sf-text) text-sm">
                  {t.settings.addPlayerTitle}
                </p>
                <input
                  className={`mt-2 w-full rounded-md border bg-(--sf-surface) px-3 py-3 outline-none ${
                    nameDraftTaken
                      ? "border-[#ef5b2a] focus:border-[#ef5b2a]"
                      : "border-(--sf-text)/10 focus:border-(--accent)"
                  }`}
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder={t.common.namePlaceholder}
                  maxLength={30}
                />
                {nameDraftTaken ? (
                  <p className="mt-1 text-[#ef5b2a] text-xs">
                    {t.settings.nameTakenInGame}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-3">
                  {colorOptions.map((color) => {
                    const taken = takenColors.has(color.value);

                    return (
                      <button
                        key={color.value}
                        disabled={taken}
                        onClick={() => setColorDraft(color.value)}
                        title={taken ? t.common.colorTaken : color.name}
                        aria-label={taken ? t.common.colorTaken : color.name}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-md text-lg ${
                          taken
                            ? "cursor-not-allowed opacity-25"
                            : "cursor-pointer"
                        } ${
                          selectedColor === color.value && !taken
                            ? "ring-2 ring-(--accent) ring-offset-1 ring-offset-(--sf-bg)"
                            : ""
                        }`}
                        style={{ backgroundColor: `${color.value}26` }}
                        type="button"
                      >
                        {taken ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 flex items-center justify-center text-sm font-black text-(--sf-text)"
                          >
                            {"✕"}
                          </span>
                        ) : (
                          <span aria-hidden="true">{color.emoji}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 font-bold text-(--sf-text) text-sm">
                  {t.settings.startingPoints}
                </p>
                <div className="gap-2 grid grid-cols-3 mt-2">
                  {startModeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStartMode(option.value)}
                      className={`rounded-md px-2 py-2 text-xs font-black ${
                        startMode === option.value
                          ? "bg-(--accent) text-(--on-accent)"
                          : "bg-(--sf-surface) text-(--sf-text-muted)"
                      }`}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-(--sf-text-subtle) text-xs">
                  {format(t.settings.startPreview, { points: startValue })}
                </p>

                <button
                  onClick={addPlayer}
                  disabled={!canAdd}
                  className="bg-(--accent) disabled:opacity-50 mt-3 px-4 py-3 rounded-md w-full font-black text-(--on-accent) disabled:cursor-not-allowed"
                  type="button"
                >
                  {t.settings.addPlayerButton}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-(--sf-text-subtle) text-xs">
                {format(t.settings.maxPlayersNote, { n: maxPlayers })}
              </p>
            )}
          </>
        )}

        {/* GEFAHRENZONE */}
        <p className="mt-5 font-bold text-(--sf-text) text-sm">
          {t.settings.dangerZoneSection}
        </p>
        <div className="mt-2">
          <DeleteGameButton onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}
