import { Wifi, Clock, Database } from "lucide-react";
import { PanelTitle } from "./PanelTitle";
import { StatusBadge } from "./StatusBadge";

export function SystemHealth() {
  return (
    <section className="panel">
      <PanelTitle eyebrow="System Health" title="Real-time system metrics" />
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-4">
          <Wifi size={24} />
          <div>
            <p className="text-sm text-gray-500">Server Load</p>
            <p className="text-lg font-medium text-gray-900">27%</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Clock size={24} />
          <div>
            <p className="text-sm text-gray-500">API Response Times</p>
            <p className="text-lg font-medium text-gray-900">71ms</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Database size={24} />
          <div>
            <p className="text-sm text-gray-500">Database</p>
            <StatusBadge value="Normal" tone="success" />
          </div>
        </div>
      </div>
    </section>
  );
}
