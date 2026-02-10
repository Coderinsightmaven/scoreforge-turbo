"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { defineStepper } from "@stepperize/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, Plus, X, Check, Loader2, AlertCircle } from "lucide-react";
import { getDisplayMessage } from "@/lib/errors";

type Sport = "tennis";
type Format = "single_elimination" | "double_elimination" | "round_robin";
type ParticipantType = "individual" | "doubles" | "team";

const { Scoped, steps, Stepper } = defineStepper(
  {
    id: "basics",
    title: "Basics",
    description: "Name and bracket",
  },
  {
    id: "rules",
    title: "Rules",
    description: "Scoring configuration",
  },
  {
    id: "format",
    title: "Format",
    description: "Structure and participants",
  },
  {
    id: "courts",
    title: "Courts",
    description: "Match locations",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm setup",
  }
);

export default function NewTournamentPage(): React.ReactNode {
  const router = useRouter();
  const createTournament = useMutation(api.tournaments.createTournament);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bracketName, setBracketName] = useState("Main Draw");
  const [sport] = useState<Sport>("tennis");
  const [format, setFormat] = useState<Format>("single_elimination");
  const [participantType, setParticipantType] = useState<ParticipantType>("individual");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Tennis config
  const [tennisIsAdScoring, setTennisIsAdScoring] = useState(true);
  const [tennisSetsToWin, setTennisSetsToWin] = useState(2);

  // Courts
  const [courts, setCourts] = useState<string[]>([]);
  const [newCourt, setNewCourt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (courts.length === 0) {
      setError("Select at least one court before creating a tournament.");
      return;
    }
    setIsSubmitting(true);

    try {
      const tennisConfig = {
        isAdScoring: tennisIsAdScoring,
        setsToWin: tennisSetsToWin,
      };
      const normalizedCourts = [...new Set(courts.map((court) => court.trim()).filter(Boolean))];

      const tournamentId = await createTournament({
        name,
        description: description || undefined,
        sport,
        format,
        participantType,
        maxParticipants,
        tennisConfig,
        courts: normalizedCourts,
        bracketName: bracketName.trim() || "Main Draw",
      });

      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(getDisplayMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-6">
      <div className="container-narrow space-y-8">
        <section className="surface-panel surface-panel-rail p-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-small text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <h1 className="text-title text-foreground mb-2">Create Tournament</h1>
          <p className="text-body text-muted-foreground">
            Configure your brackets, courts, and scoring rules before launch.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Scoped>
            <Stepper.Root className="space-y-6">
              {({ stepper }) => {
                const missingBasics = !name.trim() || !bracketName.trim();
                const missingCourts = courts.length === 0;
                const isBasicsStep = stepper.state.current.data.id === "basics";
                const isCourtsStep = stepper.state.current.data.id === "courts";
                const isNextDisabled =
                  (isBasicsStep && missingBasics) || (isCourtsStep && missingCourts);

                return (
                  <>
                    <div className="surface-panel surface-panel-rail p-4">
                      <Stepper.List className="grid gap-3 lg:grid-cols-5">
                        {steps.map((step, index) => {
                          const isActive = stepper.state.current.data.id === step.id;
                          const isComplete = stepper.state.current.index > index;

                          return (
                            <Stepper.Item key={step.id} step={step.id} className="relative">
                              <Stepper.Trigger
                                type="button"
                                className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                  isActive
                                    ? "border-brand bg-brand-light dark:bg-brand/20"
                                    : isComplete
                                      ? "border-brand/40 bg-secondary"
                                      : "border-border bg-secondary hover:border-muted-foreground"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                                      isActive
                                        ? "border-brand text-brand"
                                        : isComplete
                                          ? "border-brand/40 text-brand"
                                          : "border-border text-muted-foreground"
                                    }`}
                                  >
                                    {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                                  </span>
                                  <div className="space-y-1">
                                    <Stepper.Title
                                      className={`text-sm font-semibold ${
                                        isActive ? "text-foreground" : "text-muted-foreground"
                                      }`}
                                    >
                                      {step.title}
                                    </Stepper.Title>
                                    <Stepper.Description className="text-xs text-muted-foreground">
                                      {step.description}
                                    </Stepper.Description>
                                  </div>
                                </div>
                              </Stepper.Trigger>
                            </Stepper.Item>
                          );
                        })}
                      </Stepper.List>
                    </div>

                    <Stepper.Content step="basics" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Tournament name *</Label>
                            <Input
                              id="name"
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              placeholder="e.g. Summer Championship 2026"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                              id="description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              rows={3}
                              placeholder="Optional description..."
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bracketName">Bracket name *</Label>
                            <Input
                              id="bracketName"
                              type="text"
                              value={bracketName}
                              onChange={(e) => setBracketName(e.target.value)}
                              required
                              placeholder="e.g. Main Draw, Men's Singles"
                            />
                            <p className="text-small text-muted-foreground">
                              You can add more brackets after creating the tournament
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Stepper.Content>

                    <Stepper.Content step="rules" className="space-y-6">
                      {sport === "tennis" ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Tennis Rules</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Scoring mode</Label>
                                <select
                                  value={tennisIsAdScoring ? "advantage" : "no-ad"}
                                  onChange={(e) =>
                                    setTennisIsAdScoring(e.target.value === "advantage")
                                  }
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="advantage">Advantage scoring</option>
                                  <option value="no-ad">No-Ad scoring</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label>Match format</Label>
                                <select
                                  value={tennisSetsToWin}
                                  onChange={(e) => setTennisSetsToWin(Number(e.target.value))}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value={2}>Best of 3</option>
                                  <option value={3}>Best of 5</option>
                                </select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="py-6 text-small text-muted-foreground">
                            Rules are configured per sport after tournament creation.
                          </CardContent>
                        </Card>
                      )}
                    </Stepper.Content>

                    <Stepper.Content step="format" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Tournament Format</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3">
                            {[
                              {
                                value: "single_elimination",
                                label: "Single Elimination",
                                desc: "One loss and you're out",
                              },
                              {
                                value: "double_elimination",
                                label: "Double Elimination",
                                desc: "Two losses to eliminate",
                              },
                              {
                                value: "round_robin",
                                label: "Round Robin",
                                desc: "Everyone plays everyone",
                              },
                            ].map((f) => (
                              <button
                                key={f.value}
                                type="button"
                                onClick={() => setFormat(f.value as Format)}
                                className={`p-4 text-left border-2 rounded-xl transition-all ${
                                  format === f.value
                                    ? "border-brand bg-brand-light dark:bg-brand/20"
                                    : "border-border bg-secondary hover:border-muted-foreground"
                                }`}
                              >
                                <span
                                  className={`block font-semibold ${
                                    format === f.value
                                      ? "text-brand dark:text-brand"
                                      : "text-foreground"
                                  }`}
                                >
                                  {f.label}
                                </span>
                                <span
                                  className={`block text-small mt-1 ${
                                    format === f.value
                                      ? "text-brand-hover/70 dark:text-brand/70"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {f.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Participant Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {[
                              { value: "individual", label: "Individual", desc: "Singles" },
                              { value: "doubles", label: "Doubles", desc: "Pairs" },
                              { value: "team", label: "Team", desc: "Teams" },
                            ].map((p) => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => setParticipantType(p.value as ParticipantType)}
                                className={`p-4 text-center border-2 rounded-xl transition-all ${
                                  participantType === p.value
                                    ? "border-brand bg-brand-light dark:bg-brand/20"
                                    : "border-border bg-secondary hover:border-muted-foreground"
                                }`}
                              >
                                <span
                                  className={`block font-semibold ${
                                    participantType === p.value
                                      ? "text-brand dark:text-brand"
                                      : "text-foreground"
                                  }`}
                                >
                                  {p.label}
                                </span>
                                <span
                                  className={`block text-small mt-1 ${
                                    participantType === p.value
                                      ? "text-brand-hover/70 dark:text-brand/70"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {p.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Maximum Participants</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {[4, 8, 16, 32, 64].map((n) => (
                              <Button
                                key={n}
                                type="button"
                                onClick={() => setMaxParticipants(n)}
                                variant={maxParticipants === n ? "brand" : "outline"}
                                className="px-5"
                              >
                                {n}
                              </Button>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <Label>Or enter a custom number:</Label>
                            <Input
                              type="number"
                              value={maxParticipants}
                              onChange={(e) =>
                                setMaxParticipants(Math.max(2, Number(e.target.value)))
                              }
                              min={2}
                              max={256}
                              className="w-32"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </Stepper.Content>

                    <Stepper.Content step="courts" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Courts</CardTitle>
                          <p className="text-small text-muted-foreground">
                            Select one or more courts for scheduling matches
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-6">
                            <Label className="mb-3 block">Quick select</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                "Stadium",
                                "Grandstand",
                                "Court 1",
                                "Court 2",
                                "Court 3",
                                "Court 4",
                              ].map((court) => (
                                <Button
                                  key={court}
                                  type="button"
                                  onClick={() => {
                                    if (courts.includes(court)) {
                                      setCourts(courts.filter((c) => c !== court));
                                    } else {
                                      setCourts([...courts, court]);
                                    }
                                  }}
                                  variant={courts.includes(court) ? "brand" : "outline"}
                                  size="sm"
                                >
                                  {courts.includes(court) && <Check className="w-4 h-4 mr-1" />}
                                  {court}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Add custom</Label>
                            <div className="flex flex-col gap-2 md:flex-row">
                              <Input
                                type="text"
                                value={newCourt}
                                onChange={(e) => setNewCourt(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (newCourt.trim() && !courts.includes(newCourt.trim())) {
                                      setCourts([...courts, newCourt.trim()]);
                                      setNewCourt("");
                                    }
                                  }
                                }}
                                placeholder="e.g. Center Court"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                onClick={() => {
                                  if (newCourt.trim() && !courts.includes(newCourt.trim())) {
                                    setCourts([...courts, newCourt.trim()]);
                                    setNewCourt("");
                                  }
                                }}
                                disabled={!newCourt.trim() || courts.includes(newCourt.trim())}
                                variant="brand"
                                className="md:w-auto"
                              >
                                Add
                              </Button>
                            </div>
                          </div>

                          {courts.length > 0 && (
                            <div className="mt-4 p-4 bg-secondary rounded-xl">
                              <p className="text-small text-muted-foreground mb-2">
                                {courts.length} court{courts.length !== 1 ? "s" : ""} selected
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {courts.map((court, index) => (
                                  <div
                                    key={index}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg"
                                  >
                                    <span className="text-small text-foreground">{court}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCourts(courts.filter((_, i) => i !== index))
                                      }
                                      className="text-muted-foreground hover:text-error transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {courts.length === 0 && (
                            <p className="mt-4 text-small text-destructive">
                              At least one court is required.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Stepper.Content>

                    <Stepper.Content step="review" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Review Tournament</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <p className="text-small text-muted-foreground">Tournament name</p>
                              <p className="text-body text-foreground">{name || "Untitled"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-small text-muted-foreground">Bracket</p>
                              <p className="text-body text-foreground">
                                {bracketName || "Main Draw"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-small text-muted-foreground">Format</p>
                              <p className="text-body text-foreground">
                                {format.split("_").join(" ")}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-small text-muted-foreground">Participants</p>
                              <p className="text-body text-foreground">
                                {participantType} · {maxParticipants}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-small text-muted-foreground">Courts</p>
                            <p className="text-body text-foreground">
                              {courts.length > 0 ? courts.join(", ") : "No courts selected"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-small text-muted-foreground">Scoring</p>
                            <p className="text-body text-foreground">
                              {tennisIsAdScoring ? "Advantage" : "No-Ad"} · Best of{" "}
                              {tennisSetsToWin}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Stepper.Content>

                    <Stepper.Actions className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Stepper.Prev
                          type="button"
                          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={stepper.state.isFirst || isSubmitting}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </Stepper.Prev>
                        {!stepper.state.isLast && (
                          <Stepper.Next
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isNextDisabled || isSubmitting}
                          >
                            Next step
                          </Stepper.Next>
                        )}
                      </div>

                      {stepper.state.isLast && (
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                          <Button
                            type="submit"
                            disabled={
                              isSubmitting ||
                              !name.trim() ||
                              !bracketName.trim() ||
                              courts.length === 0
                            }
                            variant="brand"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-5 h-5" />
                                Create Tournament
                              </>
                            )}
                          </Button>
                          <Link
                            href="/dashboard"
                            className="text-body text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </Link>
                        </div>
                      )}
                    </Stepper.Actions>
                  </>
                );
              }}
            </Stepper.Root>
          </Scoped>
        </form>
      </div>
    </div>
  );
}
