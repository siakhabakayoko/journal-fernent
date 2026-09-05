import { redirect } from "next/navigation";
import { isPublicRubric, PUBLIC_RUBRICS } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PUBLIC_RUBRICS.map((slug) => ({ slug }));
}

export default async function RubricRedirect({ params }: Props) {
  const { slug } = await params;
  if (isPublicRubric(slug)) redirect(`/breves?r=${slug}`);
  redirect("/breves");
}
