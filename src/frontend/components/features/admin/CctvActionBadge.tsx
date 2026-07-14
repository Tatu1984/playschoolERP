import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  AUTHORIZE_GRANTED: "Granted",
  AUTHORIZE_DENIED: "Denied",
  TOKEN_ISSUED: "Token issued",
  VIEW_START: "View started",
};

export function CctvActionBadge({ action }: { action: string }) {
  const denied = action === "AUTHORIZE_DENIED";
  const view = action === "VIEW_START";
  return (
    <Badge
      variant={denied ? "destructive" : view ? "default" : "secondary"}
      className="whitespace-nowrap"
    >
      {LABELS[action] ?? action}
    </Badge>
  );
}
