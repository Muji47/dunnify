import PayClient from "./PayClient";

export const instant = false;

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PayPage({ params }: PageProps) {
  const { token } = await params;
  return <PayClient token={token} />;
}
