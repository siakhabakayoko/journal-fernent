import { redirect } from "next/navigation";
import { isRubric, PUBLIC_RUBRICS } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PUBLIC_RUBRICS.map((slug) => ({ slug }));
}

export default async function RubricRedirect({ params }: Props) {
  const { slug } = await params;
  if (isRubric(slug)) redirect(`/breves?r=${slug}`);
  redirect("/breves");
}
