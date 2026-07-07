import { useState } from "react";
import { Banknote, Receipt, FileText, TrendingUp, AlertTriangle, Search } from "lucide-react";
import type { ConnectedData } from "../api";

interface BursarWorkspaceProps {
  view: string;
  data: ConnectedData;
  onShareFinance: () => void;
}

export function BursarWorkspace({ view, data, onShareFinance }: BursarWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalCollected = data.payments
    .filter(p => p.status === "Confirmed")
    .reduce((s, p) => s + parseInt(p.amount.replace(/[^0-9]/g, "") || "0"), 0);

  const totalOutstanding = data.feeBalances
    .reduce((s, b) => s + parseInt(b.balance.replace(/[^0-9]/g, "") || "0"), 0);

  const filteredPayments = data.payments.filter(p =>
    (statusFilter === "all" || p.status.toLowerCase() === statusFilter) &&
    (!search || p.student?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredBalances = data.feeBalances.filter(b =>
    !search || b.student?.toLowerCase().includes(search.toLowerCase())
  );

  const Metrics = () => (
    <div className="metric-grid">
      <div className="metric green">
        <div className="metric-icon"><TrendingUp size={22}/></div>
        <div className="metric-body"><strong>UGX {totalCollected.toLocaleString()}</strong><span>Collected</span></div>
      </div>
      <div className="metric amber">
        <div className="metric-icon"><AlertTriangle size={22}/></div>
        <div className="metric-body"><strong>UGX {totalOutstanding.toLocaleString()}</strong><span>Outstanding</span></div>
      </div>
      <div className="metric blue">
        <div className="metric-icon"><Receipt size={22}/></div>
        <div className="metric-body"><strong>{data.receipts.length}</strong><span>Receipts</span></div>
      </div>
      <div className="metric teal">
        <div className="metric-icon"><Banknote size={22}/></div>
        <div className="metric-body"><strong>{data.payments.length}</strong><span>Transactions</span></div>
      </div>
    </div>
  );

  if (view === "Fee Accounts" || view === "Payments") {
    return (
      <div className="content-grid">
        <Metrics />
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search student or reference…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="unmatched">Unmatched</option>
            </select>
            <button className="tool-button" onClick={onShareFinance}><FileText size={15}/>Share to Admin</button>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Print</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Reference</th><th>Student</th><th>Method</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {filteredPayments.map(p => (
                  <tr key={p.reference}>
                    <td><code>{p.reference}</code></td>
                    <td><strong>{p.student}</strong></td>
                    <td>{p.method}</td>
                    <td><strong>{p.amount}</strong></td>
                    <td>{p.date}</td>
                    <td><span className={`badge ${p.status === "Confirmed" ? "success" : p.status === "Unmatched" ? "warning" : "info"}`}>{p.status}</span></td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && <tr><td colSpan={6} className="empty-state">No payments found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Receipts") {
    return (
      <div className="content-grid">
        <Metrics />
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button" onClick={() => window.print()}><FileText size={15}/>Print Register</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Receipt No</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th><th>Issued By</th></tr></thead>
              <tbody>
                {data.receipts.filter(r => !search || r.student?.toLowerCase().includes(search.toLowerCase())).map(r => (
                  <tr key={r.receiptNo}>
                    <td><code>{r.receiptNo}</code></td>
                    <td><strong>{r.student}</strong></td>
                    <td><strong>{r.amount}</strong></td>
                    <td>{r.method}</td>
                    <td>{r.date}</td>
                    <td>{r.issuedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Vouchers" || view === "Cashbook") {
    return (
      <div className="content-grid">
        <Metrics />
        <div className="table-panel">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => window.print()}><FileText size={15}/>Export {view}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Class</th><th>Expected</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {filteredBalances.map((b, i) => (
                  <tr key={i}>
                    <td><strong>{b.student}</strong></td>
                    <td>{b.className}</td>
                    <td>{b.expected}</td>
                    <td style={{color:"#6ee7b7"}}>{b.paid}</td>
                    <td style={{color:"#fca5a5"}}><strong>{b.balance}</strong></td>
                    <td><span className={`badge ${b.status === "Paid" ? "success" : b.status === "Partial" ? "warning" : "error"}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Reports") {
    return (
      <div className="content-grid">
        <Metrics />
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[
            ["Payment Vouchers","Generate and download payment vouchers"],
            ["Receipt Register","Complete receipt ledger for the term"],
            ["Financial Summary","Collection rates and outstanding balances"],
          ].map(([title, desc]) => (
            <div key={title} className="detail-panel" style={{padding:20,display:"grid",gap:10}}>
              <FileText size={28} style={{color:"var(--primary)"}} />
              <strong>{title}</strong>
              <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>{desc}</span>
              <button className="tool-button" onClick={() => window.print()}><FileText size={14}/>Export PDF</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default dashboard
  return (
    <div className="content-grid">
      <Metrics />
      <div className="notice-strip">Select a view — Fee Accounts, Payments, Receipts, Vouchers, Cashbook, or Reports.</div>
    </div>
  );
}
