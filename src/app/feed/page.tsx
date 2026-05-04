import { FeedErrorBoundary } from "@/components/FeedErrorBoundary";
import { FeedShell } from "@/components/feed/FeedShell";

export default function FeedPage() {
  return (
    <FeedErrorBoundary>
      <FeedShell />
    </FeedErrorBoundary>
  );
}
