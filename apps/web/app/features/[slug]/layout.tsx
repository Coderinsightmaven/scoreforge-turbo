import type { Metadata } from "next";
import { getFeatureBySlug } from "@/app/lib/featureData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    return { title: "Feature Not Found" };
  }

  return {
    title: feature.title,
    description: feature.description,
  };
}

export default function FeatureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
