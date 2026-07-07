import { Download, FileText, Printer, Send } from "lucide-react";

interface DocumentActionsProps {
  compact?: boolean;
  onShare?: () => void;
}

export function DocumentActions({ compact = false, onShare }: DocumentActionsProps) {
  return (
    <div className={compact ? "doc-actions compact" : "doc-actions"}>
      <button type="button" onClick={onShare}>
        <Send size={16} />
        Share to Admin
      </button>
      <button type="button">
        <Printer size={16} />
        Print
      </button>
      <button type="button">
        <FileText size={16} />
        PDF
      </button>
      <button type="button">
        <Download size={16} />
        Export
      </button>
    </div>
  );
}
