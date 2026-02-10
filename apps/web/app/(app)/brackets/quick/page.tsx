"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  generateBlankBracketStructure,
  updateParticipantName,
  type BlankMatch,
  type BlankParticipant,
} from "@/app/lib/bracketUtils";
import { getRoundName as getRoundNameUtil } from "@/lib/bracket";

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

  const getRoundName = getRoundNameUtil;

  const renderParticipantSlot = (participant: BlankParticipant | undefined, slotNumber: 1 | 2) => {
    if (!participant) {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 ${
            slotNumber === 1 ? "border-b border-border print:border-gray-300" : ""
          }`}
        >
          <span className="w-6 text-xs text-center text-text-muted print:text-gray-500">-</span>
          <span className="flex-1 text-sm text-text-muted italic print:text-gray-500">TBD</span>
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
          <span className="w-6 text-xs text-center text-text-muted">{participant.seed || "-"}</span>
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
    <div className="min-h-screen space-y-6">
      <section className="surface-panel surface-panel-rail p-6 sm:p-8 no-print">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors mb-4"
        >
          <span>&larr;</span> Dashboard
        </Link>
        <h1 className="text-title text-text-primary mb-2">Quick Bracket Generator</h1>
        <p className="text-text-secondary max-w-xl">
          Create a printable bracket without storing data. Fill in names and print when ready.
        </p>
      </section>

      <main className="container">
        {!matches ? (
          // Configuration Form
          <div className="max-w-md mx-auto animate-fadeIn">
            <div className="surface-panel surface-panel-rail p-6">
              <h2 className="text-heading text-text-primary mb-6">Configure Bracket</h2>

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
                  <label className="block text-sm font-medium text-text-primary mb-2">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as BracketFormat)}
                    className="w-full px-4 py-3 input"
                  >
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                  </select>
                </div>

                <Button onClick={handleGenerate} variant="brand" size="lg" className="w-full mt-4">
                  Generate Bracket
                </Button>
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
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Start Over
                </Button>
                <Button variant="brand" size="sm" onClick={handlePrint}>
                  Print
                </Button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8">
              <div className="mx-auto max-w-4xl">
                <div className="relative overflow-hidden rounded-2xl border border-gray-300 bg-white px-6 py-5 text-center print:px-4 print:py-4">
                  <div className="absolute left-6 right-6 top-0 h-px bg-gray-300 print:left-4 print:right-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500 print:text-[9px]">
                    ScoreForge Bracket
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-gray-900 print:text-xl">{title}</h1>
                  <p className="text-gray-600 mt-1 print:text-sm">
                    {format === "single_elimination" ? "Single elimination" : "Double elimination"}{" "}
                    &bull; {size} participants
                  </p>
                </div>
              </div>
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
                          className="relative flex flex-col bg-card border border-border/70 rounded-2xl shadow-card overflow-hidden print:bg-white print:border-gray-300 print:shadow-none print:break-inside-avoid"
                        >
                          <div className="absolute left-3 right-3 top-0 h-px bg-brand/30 print:bg-gray-300" />
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
