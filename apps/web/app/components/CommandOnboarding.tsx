"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Onborda, OnbordaProvider, type CardComponentProps, type Step } from "onborda";
import { Gauge, LayoutGrid, Table, Trophy } from "lucide-react";
import { CommandOnboardingCard } from "./CommandOnboardingCard";

type Tour = { tour: string; steps: Step[] };

const COMMAND_TOUR: Tour[] = [
  {
    tour: "command",
    steps: [
      {
        icon: <Gauge className="h-4 w-4" />,
        title: "Command navigation",
        content: "Jump between Command, settings, and admin tools from the rail.",
        selector: "#onborda-nav",
        side: "right",
        pointerPadding: 12,
        pointerRadius: 16,
      },
      {
        icon: <LayoutGrid className="h-4 w-4" />,
        title: "Command stats",
        content: "Key stats update in real time so you can react faster on match day.",
        selector: "#onborda-command-stats",
        side: "top",
        pointerPadding: 12,
        pointerRadius: 16,
      },
      {
        icon: <Trophy className="h-4 w-4" />,
        title: "Tournament cards",
        content: "Open any tournament to manage brackets, courts, and scorers.",
        selector: "#onborda-command-tournaments",
        side: "top",
        pointerPadding: 12,
        pointerRadius: 16,
      },
      {
        icon: <Table className="h-4 w-4" />,
        title: "Command directory",
        content: "Search, sort, and jump to live events using the Command table.",
        selector: "#onborda-command-table",
        side: "top",
        pointerPadding: 12,
        pointerRadius: 16,
      },
    ],
  },
];

export function CommandOnboarding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showOnborda, setShowOnborda] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) {
      setShowOnborda(false);
      return;
    }

    const hasSeen = window.localStorage.getItem("scoreforge-onboarding");
    setShowOnborda(!hasSeen);
  }, [pathname]);

  const cardComponent = useMemo(() => {
    const CardComponent = (props: CardComponentProps) => (
      <CommandOnboardingCard
        {...props}
        onFinish={() => {
          window.localStorage.setItem("scoreforge-onboarding", "true");
          setShowOnborda(false);
        }}
      />
    );
    CardComponent.displayName = "CommandOnboardingCardComponent";
    return CardComponent;
  }, []);

  return (
    <OnbordaProvider>
      <Onborda
        steps={COMMAND_TOUR}
        showOnborda={showOnborda}
        cardComponent={cardComponent}
        shadowRgb="8,16,8"
        shadowOpacity="0.75"
      >
        {children}
      </Onborda>
    </OnbordaProvider>
  );
}
