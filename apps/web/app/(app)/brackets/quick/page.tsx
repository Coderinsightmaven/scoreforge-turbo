"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  generateBlankBracketStructure,
  updateParticipantName,
  type BlankMatch,
  type BlankParticipant,
} from "@/app/lib/bracketUtils";

type BracketFormat = "single_elimination" | "double_elimination";

export default function QuickBracketPage(): React.ReactNode {
  const [size, setSize] = useState<number>(8);
  const [format, setFormat] = useState<BracketFormat>("single_elimination");
  const [matches, setMatches] = useState<BlankMatch[] | null>(null);
  const [title, setTitle] = useState("Tournament Bracket");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSlot && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSlot]);

  const handleGenerate = () => {
    const newMatches = generateBlankBracketStructure(size, format);
    setMatches(newMatches);
  };

  const handleSlotClick = (participant: BlankParticipant) => {
    setEditingSlot(participant.id);
    setEditValue(participant.isPlaceholder ? "" : participant.displayName);
  };

  const handleSave = () => {
    if (!editingSlot || !matches) {
      setEditingSlot(null);
      return;
    }

    if (editValue.trim()) {
      setMatches(updateParticipantName(matches, editingSlot, editValue.trim()));
    }
    setEditingSlot(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditingSlot(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setMatches(null);
  };

  // Group matches by round
  const rounds = matches?.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, BlankMatch[]>
  );

  const roundNumbers = rounds
    ? Object.keys(rounds)
        .map(Number)
        .sort((a, b) => a - b)
    : [];

  const getRoundName = (round: number, total: number) => {
    const remaining = total - round + 1;
    if (remaining === 1) return "Finals";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  const renderParticipantSlot = (
    participant: BlankParticipant | undefined,
    slotNumber: 1 | 2
  ) => {
    if (!participant) {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 ${
            slotNumber === 1 ? "border-b border-border print:border-gray-300" : ""
          }`}
        >
          <span className="w-6 text-xs text-center text-text-muted print:text-gray-500">
            -
          </span>
          <span className="flex-1 text-sm text-text-muted italic print:text-gray-500">
            TBD
          </span>
        </div>
      );
    }

    const isEditing = editingSlot === participant.id;
    const isPlaceholder = participant.isPlaceholder;

    if (isEditing) {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 ${
            slotNumber === 1 ? "border-b border-border" : ""
          }`}
        >
          <span className="w-6 text-xs text-center text-text-muted">
            {participant.seed || "-"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder="Enter name..."
            className="flex-1 text-sm font-medium bg-bg-secondary border border-brand/30 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      );
    }

    return (
      <div
        onClick={() => handleSlotClick(participant)}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-brand/5 transition-colors print:hover:bg-transparent print:cursor-default ${
          slotNumber === 1 ? "border-b border-border print:border-gray-300" : ""
        }`}
      >
        <span className="w-6 text-xs text-center text-text-muted print:text-gray-500">
          {participant.seed || "-"}
        </span>
        <span
          className={`flex-1 text-sm font-medium truncate ${
            isPlaceholder
              ? "text-text-muted italic bracket-slot-empty print:text-gray-400"
              : "text-text-primary print:text-black"
          }`}
        >
          {isPlaceholder ? "" : participant.displayName}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="py-8 px-6 border-b border-border no-print">
        <div className="max-w-[var(--content-max)] mx-auto animate-fadeIn">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-brand transition-colors mb-4"
          >
            <span>&larr;</span> Dashboard
          </Link>
          <h1 className="text-title text-text-primary mb-2">
            Quick Bracket Generator
          </h1>
          <p className="text-text-secondary max-w-xl">
            Create a printable tournament bracket without saving to the
            database. Fill in names and print for offline use.
          </p>
        </div>
      </header>

      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        {!matches ? (
          // Configuration Form
          <div className="max-w-md mx-auto animate-fadeIn">
            <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="text-heading text-text-primary mb-6">
                Configure Bracket
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Bracket Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tournament Bracket"
                    className="w-full px-4 py-3 input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Bracket Size
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full px-4 py-3 input"
                  >
                    <option value={4}>4 participants</option>
                    <option value={8}>8 participants</option>
                    <option value={16}>16 participants</option>
                    <option value={32}>32 participants</option>
                    <option value={64}>64 participants</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as BracketFormat)}
                    className="w-full px-4 py-3 input"
                  >
                    <option value="single_elimination">
                      Single Elimination
                    </option>
                    <option value="double_elimination">
                      Double Elimination
                    </option>
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full px-4 py-3 btn-primary mt-4"
                >
                  Generate Bracket
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Bracket View
          <div className="animate-fadeIn">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 no-print">
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold text-text-primary bg-transparent border-b border-transparent hover:border-border focus:border-brand focus:outline-none transition-all px-1"
                />
                <p className="text-sm text-text-muted mt-1">
                  Click on slots to fill in participant names
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-text-secondary bg-bg-secondary border border-border rounded-lg hover:text-text-primary hover:border-text-muted transition-all"
                >
                  Start Over
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 btn-primary text-xs"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
                    />
                  </svg>
                  Print
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-8">
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>

            {/* Bracket */}
            <div className="overflow-x-auto pb-4 print:overflow-visible">
              <div className="flex gap-8 min-w-max print:gap-4">
                {roundNumbers.map((round) => (
                  <div
                    key={round}
                    className="flex flex-col gap-3 min-w-[240px] print:min-w-[180px]"
                  >
                    <div className="text-sm font-medium text-text-muted pb-2 border-b border-border print:text-xs print:border-gray-300 print:text-gray-600">
                      {getRoundName(round, roundNumbers.length)}
                    </div>
                    <div className="flex flex-col gap-3 flex-1 justify-around print:gap-2">
                      {(rounds![round] || []).map((match) => (
                        <div
                          key={match.id}
                          className="flex flex-col bg-bg-card border border-border rounded-lg overflow-hidden print:bg-white print:border-gray-300 print:break-inside-avoid"
                        >
                          {renderParticipantSlot(match.participant1, 1)}
                          {renderParticipantSlot(match.participant2, 2)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
