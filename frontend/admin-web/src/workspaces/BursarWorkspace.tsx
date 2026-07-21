import { useState, useEffect } from "react";
import {
  Banknote, Receipt, FileText, TrendingUp, AlertTriangle, Search,
  Plus, Home, BookOpen, Wallet, Scale, Building2, User,
  CheckCircle, XCircle, Clock, Edit3, Save, ArrowUpCircle,
  ArrowDownCircle, DollarSign, Printer, Download, Settings,
  Eye, CreditCard, LoaderCircle
} from "lucide-react";
import type { ConnectedData } from "../api";
import {
  fetchCashbook, createCashEntry,
  fetchQuotations, createQuotation,
  fetchRequisitions, createRequisition,
  fetchBankAccount, updateBankAccount,
  downloadReceiptPDF
} from "../api";
import { printElement, exportAsCSV } from "../utils/exportUtils";

interface BursarWorkspaceProps {
  view: string;
  data: ConnectedData;
  onViewChange?: (view: string) => void;
  onShareFinance: () => void;
}

interface CashEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy: string;
  paymentMethod: string;
  receiptNo: string;
  type: "Income" | "Expense";
  createdAt: string;
}

interface QuotationItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customer: string;
  date: string;
  items: QuotationItem[];
  notes: string;
  total: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected";
}

interface RequisitionItem {
  description: string;
  qty: number;
  estimatedCost: number;
  total: number;
}

interface Requisition {
  id: string;
  reqNo: string;
  department: string;
  requestedBy: string;
  date: string;
  items: RequisitionItem[];
  purpose: string;
  total: number;
  status: "Pending" | "Approved" | "Rejected";
}

interface ManualReceipt {
  id: string;
  receiptNo: string;
  student: string;
  amount: number;
  method: string;
  date: string;
  issuedBy: string;
  description: string;
}

interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function formatCurrency(amount: number): string {
  return "UGX " + amount.toLocaleString();
}

function parseAmount(str: string): number {
  return parseInt(str.replace(/[^0-9]/g, "") || "0");
}

function mapCashEntry(a: any): CashEntry {
  return {
    id: String(a.id ?? generateId()),
    date: a.date ?? "",
    description: a.description ?? "",
    amount: Number(a.amount) ?? 0,
    paidBy: a.paid_by ?? "",
    paymentMethod: a.payment_method ?? "cash",
    receiptNo: a.receipt_no ?? "",
    type: a.entry_type === "Expense" ? "Expense" : "Income",
    createdAt: a.created_at ?? new Date().toISOString()
  };
}

function mapQuotation(a: any): Quotation {
  return {
    id: String(a.id ?? generateId()),
    quotationNo: a.quotation_no ?? "",
    customer: a.customer ?? "",
    date: a.date ?? "",
    items: (a.items ?? []).map((i: any) => ({
      description: i.description ?? "",
      qty: Number(i.qty) ?? 0,
      unitPrice: Number(i.unit_price) ?? 0,
      total: Number(i.total) ?? 0
    })),
    notes: a.notes ?? "",
    total: Number(a.total) ?? 0,
    status: a.status ?? "Draft"
  };
}

function mapRequisition(a: any): Requisition {
  return {
    id: String(a.id ?? generateId()),
    reqNo: a.req_no ?? "",
    department: a.department ?? "",
    requestedBy: a.requested_by ?? "",
    date: a.date ?? "",
    items: (a.items ?? []).map((i: any) => ({
      description: i.description ?? "",
      qty: Number(i.qty) ?? 0,
      estimatedCost: Number(i.estimated_cost) ?? 0,
      total: Number(i.total) ?? 0
    })),
    purpose: a.purpose ?? "",
    total: Number(a.total) ?? 0,
    status: a.status ?? "Pending"
  };
}

function mapBankAccount(a: any): BankAccount {
  return {
    bankName: a.bank_name ?? "",
    accountName: a.account_name ?? "",
    accountNumber: a.account_number ?? ""
  };
}

export function BursarWorkspace({ view, data, onViewChange, onShareFinance }: BursarWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [manualReceipts, setManualReceipts] = useState<ManualReceipt[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount>({
    bankName: "Stanbic Bank Uganda",
    accountName: "Nova Demonstration School",
    accountNumber: "9030001234567"
  });
  const [cashbookTab, setCashbookTab] = useState<"Income" | "Expense">("Income");

  const [loading, setLoading] = useState({ cashbook: false, quotations: false, requisitions: false, bank: false });
  const [submitting, setSubmitting] = useState(false);

  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showRequisitionForm, setShowRequisitionForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [receiptForm, setReceiptForm] = useState({ student: "", amount: "", method: "mobile_money", description: "" });
  const [cashForm, setCashForm] = useState({ date: "", description: "", amount: "", paidBy: "", paymentMethod: "cash" });
  const [quotationForm, setQuotationForm] = useState({ customer: "", date: "", notes: "" });
  const [quotationItems, setQuotationItems] = useState<Omit<QuotationItem, "total">[]>([
    { description: "", qty: 1, unitPrice: 0 }
  ]);
  const [requisitionForm, setRequisitionForm] = useState({ department: "", requestedBy: "", date: "", purpose: "" });
  const [requisitionItems, setRequisitionItems] = useState<Omit<RequisitionItem, "total">[]>([
    { description: "", qty: 1, estimatedCost: 0 }
  ]);
  const [bankForm, setBankForm] = useState<BankAccount>({ bankName: "", accountName: "", accountNumber: "" });

  useEffect(() => {
    loadCashbook();
    loadQuotations();
    loadRequisitions();
    loadBankAccount();
  }, []);

  async function loadCashbook() {
    setLoading(p => ({ ...p, cashbook: true }));
    try {
      const raw = await fetchCashbook();
      setCashEntries((raw ?? []).map(mapCashEntry));
    } catch {
      setNotice("Failed to load cashbook entries");
    } finally {
      setLoading(p => ({ ...p, cashbook: false }));
    }
  }

  async function loadQuotations() {
    setLoading(p => ({ ...p, quotations: true }));
    try {
      const raw = await fetchQuotations();
      setQuotations((raw ?? []).map(mapQuotation));
    } catch {
      setNotice("Failed to load quotations");
    } finally {
      setLoading(p => ({ ...p, quotations: false }));
    }
  }

  async function loadRequisitions() {
    setLoading(p => ({ ...p, requisitions: true }));
    try {
      const raw = await fetchRequisitions();
      setRequisitions((raw ?? []).map(mapRequisition));
    } catch {
      setNotice("Failed to load requisitions");
    } finally {
      setLoading(p => ({ ...p, requisitions: false }));
    }
  }

  async function loadBankAccount() {
    setLoading(p => ({ ...p, bank: true }));
    try {
      const raw = await fetchBankAccount();
      if (raw) setBankAccount(mapBankAccount(raw));
    } catch {
      // keep defaults
    } finally {
      setLoading(p => ({ ...p, bank: false }));
    }
  }

  const allReceipts: ManualReceipt[] = [
    ...manualReceipts,
    ...data.receipts.map(r => ({
      id: r.receiptNo,
      receiptNo: r.receiptNo,
      student: r.student,
      amount: parseAmount(r.amount),
      method: r.method,
      date: r.date,
      issuedBy: r.issuedBy,
      description: ""
    }))
  ];

  const totalCollected = data.payments
    .filter(p => p.status === "Confirmed")
    .reduce((s, p) => s + parseAmount(p.amount), 0);

  const totalInvoiced = data.feeBalances
    .reduce((s, b) => s + parseAmount(b.expected), 0);

  const totalOutstanding = data.feeBalances
    .reduce((s, b) => s + parseAmount(b.balance), 0);

  const cashIncome = cashEntries.filter(e => e.type === "Income").reduce((s, e) => s + e.amount, 0);
  const cashExpense = cashEntries.filter(e => e.type === "Expense").reduce((s, e) => s + e.amount, 0);
  const cashBalance = cashIncome - cashExpense;

  const filteredPayments = data.payments.filter(p =>
    (statusFilter === "all" || p.status.toLowerCase() === statusFilter) &&
    (!search || p.student?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredReceipts = allReceipts.filter(r =>
    !search || r.student?.toLowerCase().includes(search.toLowerCase()) || r.receiptNo?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCashEntries = cashEntries.filter(e =>
    (cashbookTab === "Income" ? e.type === "Income" : e.type === "Expense") &&
    (!search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.paidBy?.toLowerCase().includes(search.toLowerCase()))
  );

  const MetricsBar = () => (
    <div className="metric-grid">
      <div className="metric purple">
        <div className="metric-icon"><Banknote size={22}/></div>
        <div className="metric-body"><strong>{formatCurrency(totalInvoiced)}</strong><span>Total Invoiced</span></div>
      </div>
      <div className="metric green">
        <div className="metric-icon"><TrendingUp size={22}/></div>
        <div className="metric-body"><strong>{formatCurrency(totalCollected)}</strong><span>Collected</span></div>
      </div>
      <div className="metric amber">
        <div className="metric-icon"><AlertTriangle size={22}/></div>
        <div className="metric-body"><strong>{formatCurrency(totalOutstanding)}</strong><span>Outstanding</span></div>
      </div>
      <div className="metric teal">
        <div className="metric-icon"><Receipt size={22}/></div>
        <div className="metric-body"><strong>{allReceipts.length}</strong><span>Receipts</span></div>
      </div>
    </div>
  );

  const handleIssueReceipt = () => {
    if (!receiptForm.student || !receiptForm.amount) { setNotice("Fill all required fields"); return; }
    const amount = parseFloat(receiptForm.amount);
    if (isNaN(amount) || amount <= 0) { setNotice("Enter a valid amount"); return; }
    const receiptNo = "RCP-M-" + Date.now().toString().slice(-6);
    const entry: ManualReceipt = {
      id: generateId(),
      receiptNo,
      student: receiptForm.student,
      amount,
      method: receiptForm.method,
      date: new Date().toISOString().split("T")[0],
      issuedBy: "Bursar",
      description: receiptForm.description
    };
    setManualReceipts(prev => [entry, ...prev]);
    setReceiptForm({ student: "", amount: "", method: "mobile_money", description: "" });
    setShowReceiptForm(false);
    setNotice("Receipt " + receiptNo + " issued");
  };

  const handleCashEntry = async () => {
    if (!cashForm.date || !cashForm.description || !cashForm.amount || !cashForm.paidBy) {
      setNotice("Fill all cash entry fields"); return;
    }
    const amount = parseFloat(cashForm.amount);
    if (isNaN(amount) || amount <= 0) { setNotice("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      await createCashEntry({
        date: cashForm.date,
        description: cashForm.description,
        amount,
        paid_by: cashForm.paidBy,
        payment_method: cashForm.paymentMethod,
        entry_type: cashbookTab
      });
      setCashForm({ date: "", description: "", amount: "", paidBy: "", paymentMethod: "cash" });
      setShowCashForm(false);
      setNotice("Cash entry recorded");
      await loadCashbook();
    } catch (e: any) {
      setNotice(e.message ?? "Failed to create cash entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuotation = async () => {
    if (!quotationForm.customer || !quotationForm.date || quotationItems.length === 0) {
      setNotice("Fill customer, date and at least one item"); return;
    }
    const items = quotationItems.map(i => ({
      description: i.description,
      qty: i.qty,
      unit_price: i.unitPrice,
      total: i.qty * i.unitPrice
    }));
    setSubmitting(true);
    try {
      await createQuotation({
        customer: quotationForm.customer,
        date: quotationForm.date,
        items,
        notes: quotationForm.notes || undefined
      });
      setQuotationForm({ customer: "", date: "", notes: "" });
      setQuotationItems([{ description: "", qty: 1, unitPrice: 0 }]);
      setShowQuotationForm(false);
      setNotice("Quotation created");
      await loadQuotations();
    } catch (e: any) {
      setNotice(e.message ?? "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRequisition = async () => {
    if (!requisitionForm.department || !requisitionForm.requestedBy || !requisitionForm.date || requisitionItems.length === 0) {
      setNotice("Fill all requisition fields"); return;
    }
    const items = requisitionItems.map(i => ({
      description: i.description,
      qty: i.qty,
      estimated_cost: i.estimatedCost,
      total: i.qty * i.estimatedCost
    }));
    setSubmitting(true);
    try {
      await createRequisition({
        department: requisitionForm.department,
        requested_by: requisitionForm.requestedBy,
        date: requisitionForm.date,
        items,
        purpose: requisitionForm.purpose || undefined
      });
      setRequisitionForm({ department: "", requestedBy: "", date: "", purpose: "" });
      setRequisitionItems([{ description: "", qty: 1, estimatedCost: 0 }]);
      setShowRequisitionForm(false);
      setNotice("Requisition created");
      await loadRequisitions();
    } catch (e: any) {
      setNotice(e.message ?? "Failed to create requisition");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBank = async () => {
    if (!bankForm.bankName || !bankForm.accountName || !bankForm.accountNumber) {
      setNotice("Fill all bank account fields"); return;
    }
    setSubmitting(true);
    try {
      await updateBankAccount({
        bank_name: bankForm.bankName,
        account_name: bankForm.accountName,
        account_number: bankForm.accountNumber
      });
      setBankAccount(bankForm);
      setShowBankForm(false);
      setNotice("Bank account updated");
      await loadBankAccount();
    } catch (e: any) {
      setNotice(e.message ?? "Failed to update bank account");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "Home") {
    const paymentMethods = data.payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="content-grid">
        <div className="welcome-banner">
          <h2>Finance Office</h2>
          <p>Track payments, manage receipts, and oversee school finances.</p>
        </div>
        <MetricsBar />
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
          <div className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Overview</p>
                <strong>Payment Methods</strong>
              </div>
              <DollarSign size={18} />
            </div>
            <div className="stack-list">
              {Object.entries(paymentMethods).map(([method, count]) => (
                <div key={method} className="list-row">
                  <div className="dot" />
                  <div><strong style={{fontSize:"0.88rem"}}>{method}</strong></div>
                  <span className="badge info">{count} transactions</span>
                </div>
              ))}
              {Object.keys(paymentMethods).length === 0 && <p className="empty-state">No payment data</p>}
            </div>
          </div>
          <div className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Status</p>
                <strong>Fee Balances</strong>
              </div>
              <Wallet size={18} />
            </div>
            <div className="stack-list">
              {data.feeBalances.slice(0, 5).map((b, i) => (
                <div key={i} className="list-row">
                  <div className="dot" style={{background: b.status === "Paid" ? "#10b981" : b.status === "Partial" ? "#f59e0b" : "#ef4444"}} />
                  <div><strong style={{fontSize:"0.88rem"}}>{b.student}</strong><br/><span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{b.balance}</span></div>
                  <span className={`badge ${b.status === "Paid" ? "success" : b.status === "Partial" ? "warning" : "error"}`}>{b.status}</span>
                </div>
              ))}
              {data.feeBalances.length === 0 && <p className="empty-state">No fee balances</p>}
            </div>
          </div>
        </div>
        <div className="notice-strip">Bursar dashboard — manage payments, cashbook, quotations and more</div>
      </div>
    );
  }

  if (view === "Payments") {
    return (
      <div className="content-grid">
        <MetricsBar />
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search student or reference…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="unmatched">Unmatched</option>
            </select>
            <button className="tool-button" onClick={onShareFinance}><FileText size={15}/>Share to Admin</button>
            <button className="tool-button" onClick={() => printElement("export-payments")}><Printer size={15}/>Print</button>
          </div>
          <div id="export-payments" className="table-wrap">
            <table>
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
        <MetricsBar />
        {showReceiptForm && (
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Receipts</p>
                <strong>Issue Manual Receipt</strong>
              </div>
              <Receipt size={18} />
            </div>
            <div className="office-form">
              <label>Student Name<input placeholder="Student name" value={receiptForm.student} onChange={e => setReceiptForm(p => ({...p, student: e.target.value}))} /></label>
              <label>Amount (UGX)<input type="number" min="0" placeholder="Amount" value={receiptForm.amount} onChange={e => setReceiptForm(p => ({...p, amount: e.target.value}))} /></label>
              <label>Payment Method
                <select value={receiptForm.method} onChange={e => setReceiptForm(p => ({...p, method: e.target.value}))}>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_account">Bank Account</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
              <label>Description<input placeholder="Optional description" value={receiptForm.description} onChange={e => setReceiptForm(p => ({...p, description: e.target.value}))} /></label>
              <div style={{display:"flex",gap:8}}>
                <button className="tool-button primary" onClick={handleIssueReceipt}><Plus size={15}/>Issue Receipt</button>
                <button className="tool-button" onClick={() => setShowReceiptForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search student or receipt…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => setShowReceiptForm(true)}><Plus size={15}/>Issue Receipt</button>
            <button className="tool-button" onClick={() => printElement("export-receipts-list")}><Printer size={15}/>Print Register</button>
          </div>
          <div id="export-receipts-list" className="table-wrap">
            <table>
              <thead><tr><th>Receipt No</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th><th>Issued By</th><th></th></tr></thead>
              <tbody>
                {filteredReceipts.map(r => (
                  <tr key={r.id}>
                    <td><code>{r.receiptNo}</code></td>
                    <td><strong>{r.student}</strong></td>
                    <td><strong>{formatCurrency(r.amount)}</strong></td>
                    <td>{r.method}</td>
                    <td>{r.date}</td>
                    <td>{r.issuedBy}</td>
                    <td>
                      <button className="tool-button" style={{ minHeight: 28 }} onClick={async () => {
                        try { await downloadReceiptPDF(Number(r.id)); } catch { alert("Failed to download receipt PDF"); }
                      }}>
                        <Download size={13} />PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReceipts.length === 0 && <tr><td colSpan={7} className="empty-state">No receipts found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Cashbook") {
    return (
      <div className="content-grid">
        <div className="metric-grid">
          <div className="metric green">
            <div className="metric-icon"><ArrowUpCircle size={22}/></div>
            <div className="metric-body"><strong>{formatCurrency(cashIncome)}</strong><span>Cash In</span></div>
          </div>
          <div className="metric red">
            <div className="metric-icon"><ArrowDownCircle size={22}/></div>
            <div className="metric-body"><strong>{formatCurrency(cashExpense)}</strong><span>Cash Out</span></div>
          </div>
          <div className="metric teal">
            <div className="metric-icon"><Wallet size={22}/></div>
            <div className="metric-body"><strong>{formatCurrency(cashBalance)}</strong><span>Balance</span></div>
          </div>
          <div className="metric blue">
            <div className="metric-icon"><Banknote size={22}/></div>
            <div className="metric-body"><strong>{cashEntries.length}</strong><span>Entries</span></div>
          </div>
        </div>

        {showCashForm && (
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Cashbook</p>
                <strong>Add Cash {cashbookTab === "Income" ? "Income" : "Expense"} Entry</strong>
              </div>
              {cashbookTab === "Income" ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
            </div>
            <div className="office-form">
              <label>Date<input type="date" value={cashForm.date} onChange={e => setCashForm(p => ({...p, date: e.target.value}))} /></label>
              <label>Description<input placeholder="e.g. Tour fee, Library fine" value={cashForm.description} onChange={e => setCashForm(p => ({...p, description: e.target.value}))} /></label>
              <label>Amount (UGX)<input type="number" min="0" placeholder="Amount" value={cashForm.amount} onChange={e => setCashForm(p => ({...p, amount: e.target.value}))} /></label>
              <label>Paid By<input placeholder="Name of person" value={cashForm.paidBy} onChange={e => setCashForm(p => ({...p, paidBy: e.target.value}))} /></label>
              <label>Payment Method
                <select value={cashForm.paymentMethod} onChange={e => setCashForm(p => ({...p, paymentMethod: e.target.value}))}>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_account">Bank Account</option>
                </select>
              </label>
              <div style={{display:"flex",gap:8}}>
                <button className="tool-button primary" disabled={submitting} onClick={handleCashEntry}>
                  {submitting ? <LoaderCircle size={15} style={{animation:"spin 0.8s linear infinite"}} /> : <Plus size={15}/>}
                  Record Entry
                </button>
                <button className="tool-button" onClick={() => setShowCashForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="table-panel glass-card">
          <div className="office-filters">
            <div style={{display:"flex",gap:6}}>
              <button className={`tool-button ${cashbookTab === "Income" ? "primary" : ""}`} onClick={() => setCashbookTab("Income")}>
                <ArrowUpCircle size={15}/>Income
              </button>
              <button className={`tool-button ${cashbookTab === "Expense" ? "primary" : ""}`} onClick={() => setCashbookTab("Expense")}>
                <ArrowDownCircle size={15}/>Expense
              </button>
            </div>
            <label><Search size={15}/><input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => setShowCashForm(true)}><Plus size={15}/>Add Entry</button>
            <button className="tool-button" onClick={() => printElement("export-cashbook")}><Printer size={15}/>Print</button>
          </div>
          <div id="export-cashbook" className="table-wrap">
            {loading.cashbook ? (
              <div className="loading-state"><LoaderCircle size={20} style={{animation:"spin 0.8s linear infinite"}} /> Loading cashbook…</div>
            ) : (
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Paid By</th><th>Receipt No</th><th>Type</th></tr></thead>
              <tbody>
                {filteredCashEntries.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td><strong>{e.description}</strong></td>
                    <td><strong>{formatCurrency(e.amount)}</strong></td>
                    <td>{e.paidBy}</td>
                    <td><code>{e.receiptNo}</code></td>
                    <td><span className={`badge ${e.type === "Income" ? "success" : "error"}`}>{e.type}</span></td>
                  </tr>
                ))}
                {filteredCashEntries.length === 0 && <tr><td colSpan={6} className="empty-state">No entries found</td></tr>}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Quotations") {
    return (
      <div className="content-grid">
        <MetricsBar />
        {showQuotationForm && (
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Quotations</p>
                <strong>Create Quotation</strong>
              </div>
              <FileText size={18} />
            </div>
            <div className="office-form">
              <label>Customer Name<input placeholder="Customer name" value={quotationForm.customer} onChange={e => setQuotationForm(p => ({...p, customer: e.target.value}))} /></label>
              <label>Date<input type="date" value={quotationForm.date} onChange={e => setQuotationForm(p => ({...p, date: e.target.value}))} /></label>
              <label>Notes<input placeholder="Optional notes" value={quotationForm.notes} onChange={e => setQuotationForm(p => ({...p, notes: e.target.value}))} /></label>
              <div className="panel-title" style={{marginTop:8}}>
                <strong style={{fontSize:"0.9rem"}}>Items</strong>
                <button className="tool-button" onClick={() => setQuotationItems(prev => [...prev, { description: "", qty: 1, unitPrice: 0 }])}><Plus size={14}/>Add Item</button>
              </div>
              {quotationItems.map((item, i) => (
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"center",marginBottom:6}}>
                  <input placeholder="Description" value={item.description} onChange={e => {
                    const items = [...quotationItems];
                    items[i] = {...items[i], description: e.target.value};
                    setQuotationItems(items);
                  }} />
                  <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={e => {
                    const items = [...quotationItems];
                    items[i] = {...items[i], qty: parseInt(e.target.value) || 0};
                    setQuotationItems(items);
                  }} />
                  <input type="number" min="0" placeholder="Unit price" value={item.unitPrice} onChange={e => {
                    const items = [...quotationItems];
                    items[i] = {...items[i], unitPrice: parseFloat(e.target.value) || 0};
                    setQuotationItems(items);
                  }} />
                  <button className="tool-button" style={{minHeight:30,minWidth:30,padding:0}} onClick={() => {
                    if (quotationItems.length > 1) setQuotationItems(prev => prev.filter((_, idx) => idx !== i));
                  }}>✕</button>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button className="tool-button primary" disabled={submitting} onClick={handleCreateQuotation}>
                  {submitting ? <LoaderCircle size={15} style={{animation:"spin 0.8s linear infinite"}} /> : <Save size={15}/>}
                  Create Quotation
                </button>
                <button className="tool-button" onClick={() => { setShowQuotationForm(false); setQuotationItems([{ description: "", qty: 1, unitPrice: 0 }]); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search customer or number…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => setShowQuotationForm(true)}><Plus size={15}/>Create Quotation</button>
            <button className="tool-button" onClick={() => printElement("export-quotations")}><Printer size={15}/>Print</button>
          </div>
          <div id="export-quotations" className="table-wrap">
            {loading.quotations ? (
              <div className="loading-state"><LoaderCircle size={20} style={{animation:"spin 0.8s linear infinite"}} /> Loading quotations…</div>
            ) : (
            <table>
              <thead><tr><th>Quotation No</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {quotations.filter(q => !search || q.customer.toLowerCase().includes(search.toLowerCase()) || q.quotationNo.toLowerCase().includes(search.toLowerCase())).map(q => (
                  <tr key={q.id}>
                    <td><code>{q.quotationNo}</code></td>
                    <td><strong>{q.customer}</strong></td>
                    <td>{q.date}</td>
                    <td><strong>{formatCurrency(q.total)}</strong></td>
                    <td>
                      <span className={`badge ${q.status === "Accepted" ? "success" : q.status === "Rejected" ? "error" : q.status === "Sent" ? "info" : "warning"}`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {quotations.length === 0 && <tr><td colSpan={5} className="empty-state">No quotations yet</td></tr>}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Requisitions") {
    return (
      <div className="content-grid">
        <MetricsBar />
        {showRequisitionForm && (
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Requisitions</p>
                <strong>Create Requisition</strong>
              </div>
              <FileText size={18} />
            </div>
            <div className="office-form">
              <label>Department<input placeholder="e.g. Science Department" value={requisitionForm.department} onChange={e => setRequisitionForm(p => ({...p, department: e.target.value}))} /></label>
              <label>Requested By<input placeholder="Name of requester" value={requisitionForm.requestedBy} onChange={e => setRequisitionForm(p => ({...p, requestedBy: e.target.value}))} /></label>
              <label>Date<input type="date" value={requisitionForm.date} onChange={e => setRequisitionForm(p => ({...p, date: e.target.value}))} /></label>
              <label>Purpose<input placeholder="Purpose of requisition" value={requisitionForm.purpose} onChange={e => setRequisitionForm(p => ({...p, purpose: e.target.value}))} /></label>
              <div className="panel-title" style={{marginTop:8}}>
                <strong style={{fontSize:"0.9rem"}}>Items</strong>
                <button className="tool-button" onClick={() => setRequisitionItems(prev => [...prev, { description: "", qty: 1, estimatedCost: 0 }])}><Plus size={14}/>Add Item</button>
              </div>
              {requisitionItems.map((item, i) => (
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"center",marginBottom:6}}>
                  <input placeholder="Description" value={item.description} onChange={e => {
                    const items = [...requisitionItems];
                    items[i] = {...items[i], description: e.target.value};
                    setRequisitionItems(items);
                  }} />
                  <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={e => {
                    const items = [...requisitionItems];
                    items[i] = {...items[i], qty: parseInt(e.target.value) || 0};
                    setRequisitionItems(items);
                  }} />
                  <input type="number" min="0" placeholder="Est. cost" value={item.estimatedCost} onChange={e => {
                    const items = [...requisitionItems];
                    items[i] = {...items[i], estimatedCost: parseFloat(e.target.value) || 0};
                    setRequisitionItems(items);
                  }} />
                  <button className="tool-button" style={{minHeight:30,minWidth:30,padding:0}} onClick={() => {
                    if (requisitionItems.length > 1) setRequisitionItems(prev => prev.filter((_, idx) => idx !== i));
                  }}>✕</button>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button className="tool-button primary" disabled={submitting} onClick={handleCreateRequisition}>
                  {submitting ? <LoaderCircle size={15} style={{animation:"spin 0.8s linear infinite"}} /> : <Save size={15}/>}
                  Create Requisition
                </button>
                <button className="tool-button" onClick={() => { setShowRequisitionForm(false); setRequisitionItems([{ description: "", qty: 1, estimatedCost: 0 }]); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="table-panel glass-card">
          <div className="office-filters">
            <label><Search size={15}/><input placeholder="Search department or number…" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="tool-button primary" onClick={() => setShowRequisitionForm(true)}><Plus size={15}/>Create Requisition</button>
            <button className="tool-button" onClick={() => printElement("export-requisitions")}><Printer size={15}/>Print</button>
          </div>
          <div id="export-requisitions" className="table-wrap">
            {loading.requisitions ? (
              <div className="loading-state"><LoaderCircle size={20} style={{animation:"spin 0.8s linear infinite"}} /> Loading requisitions…</div>
            ) : (
            <table>
              <thead><tr><th>Req No</th><th>Department</th><th>Requested By</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {requisitions.filter(r => !search || r.department.toLowerCase().includes(search.toLowerCase()) || r.reqNo.toLowerCase().includes(search.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td><code>{r.reqNo}</code></td>
                    <td><strong>{r.department}</strong></td>
                    <td>{r.requestedBy}</td>
                    <td>{r.date}</td>
                    <td><strong>{formatCurrency(r.total)}</strong></td>
                    <td>
                      <span className={`badge ${r.status === "Approved" ? "success" : r.status === "Rejected" ? "error" : "warning"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {requisitions.length === 0 && <tr><td colSpan={6} className="empty-state">No requisitions yet</td></tr>}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "Reports") {
    const voucherData = allReceipts.map(r => ({ "Receipt No": r.receiptNo, Student: r.student, Amount: formatCurrency(r.amount), Method: r.method, Date: r.date, "Issued By": r.issuedBy }));
    const cashbookData = cashEntries.map(e => ({ Date: e.date, Description: e.description, Amount: formatCurrency(e.amount), "Paid By": e.paidBy, "Receipt No": e.receiptNo, Type: e.type }));
    return (
      <div className="content-grid">
        <MetricsBar />
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          <div id="export-vouchers" className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <FileText size={28} style={{color:"var(--primary)"}} />
            <strong>Payment Vouchers</strong>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>Generate and download payment vouchers</span>
            <div style={{display:"grid",gap:8}}>
              {allReceipts.slice(0, 5).map(r => (
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <span>{r.receiptNo} - {r.student}</span>
                  <strong>{formatCurrency(r.amount)}</strong>
                </div>
              ))}
              {allReceipts.length === 0 && <span style={{color:"var(--muted)"}}>No vouchers yet</span>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="tool-button" onClick={() => printElement("export-vouchers", "Payment Vouchers")}><Printer size={14}/>Export PDF</button>
              <button className="tool-button" onClick={() => { exportAsCSV(voucherData, "payment-vouchers.csv"); setNotice("Vouchers CSV exported"); }}><Download size={14}/>CSV</button>
            </div>
          </div>
          <div id="export-receipts" className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <FileText size={28} style={{color:"var(--primary)"}} />
            <strong>Receipt Register</strong>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>Complete receipt ledger for the term</span>
            <div style={{display:"grid",gap:4}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",color:"var(--muted)",padding:"4px 0"}}>
                <span>Total Receipts: <strong>{allReceipts.length}</strong></span>
                <span>Total: <strong>{formatCurrency(allReceipts.reduce((s, r) => s + r.amount, 0))}</strong></span>
              </div>
              {allReceipts.slice(0, 10).map(r => (
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <span>{r.receiptNo} - {r.student}</span>
                  <strong>{formatCurrency(r.amount)}</strong>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="tool-button" onClick={() => printElement("export-receipts", "Receipt Register")}><Printer size={14}/>Export PDF</button>
              <button className="tool-button" onClick={() => { exportAsCSV(voucherData, "receipt-register.csv"); setNotice("Receipt register exported"); }}><Download size={14}/>CSV</button>
            </div>
          </div>
          <div id="export-financial" className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <FileText size={28} style={{color:"var(--primary)"}} />
            <strong>Financial Summary</strong>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>Collection rates and outstanding balances</span>
            <div style={{display:"grid",gap:6}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Total Invoiced:</span><strong>{formatCurrency(totalInvoiced)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Collected:</span><strong>{formatCurrency(totalCollected)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Outstanding:</span><strong>{formatCurrency(totalOutstanding)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Collection Rate:</span><strong>{totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}%</strong></div>
            </div>
            <button className="tool-button" onClick={() => printElement("export-financial", "Financial Summary")}><Printer size={14}/>Export PDF</button>
          </div>
          <div id="export-cashbook-report" className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <FileText size={28} style={{color:"var(--primary)"}} />
            <strong>Cashbook Report</strong>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>Income and expense summary</span>
            <div style={{display:"grid",gap:6}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Cash In:</span><strong style={{color:"#10b981"}}>{formatCurrency(cashIncome)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Cash Out:</span><strong style={{color:"#ef4444"}}>{formatCurrency(cashExpense)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Balance:</span><strong>{formatCurrency(cashBalance)}</strong></div>
            </div>
            <button className="tool-button" onClick={() => printElement("export-cashbook-report", "Cashbook Report")}><Printer size={14}/>Export PDF</button>
          </div>
          <div id="export-quotations-report" className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <FileText size={28} style={{color:"var(--primary)"}} />
            <strong>Quotations Report</strong>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>All quotations summary</span>
            <div style={{display:"grid",gap:4}}>
              {quotations.slice(0, 5).map(q => (
                <div key={q.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem"}}>
                  <span>{q.quotationNo} - {q.customer}</span>
                  <strong>{formatCurrency(q.total)}</strong>
                </div>
              ))}
              {quotations.length === 0 && <span style={{color:"var(--muted)"}}>No quotations</span>}
            </div>
            <button className="tool-button" onClick={() => printElement("export-quotations-report", "Quotations Report")}><Printer size={14}/>Export PDF</button>
          </div>
          <div id="export-requisitions-report" className="detail-panel glass-card" style={{padding:20,display:"grid",gap:10}}>
            <FileText size={28} style={{color:"var(--primary)"}} />
            <strong>Requisitions Report</strong>
            <span style={{fontSize:"0.82rem",color:"var(--muted)"}}>All requisitions summary</span>
            <div style={{display:"grid",gap:4}}>
              {requisitions.slice(0, 5).map(r => (
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem"}}>
                  <span>{r.reqNo} - {r.department}</span>
                  <strong>{formatCurrency(r.total)}</strong>
                </div>
              ))}
              {requisitions.length === 0 && <span style={{color:"var(--muted)"}}>No requisitions</span>}
            </div>
            <button className="tool-button" onClick={() => printElement("export-requisitions-report", "Requisitions Report")}><Printer size={14}/>Export PDF</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "Settings") {
    return (
      <div className="content-grid">
        <MetricsBar />
        <div className="office-layout">
          <div className="detail-panel glass-card">
            <div className="panel-title">
              <div className="panel-title-left">
                <p className="eyebrow">Finance Settings</p>
                <strong>Bank Account Information</strong>
              </div>
              <Building2 size={18} />
            </div>
            {loading.bank ? (
              <div className="loading-state"><LoaderCircle size={20} style={{animation:"spin 0.8s linear infinite"}} /> Loading bank details…</div>
            ) : showBankForm ? (
              <div className="office-form">
                <label>Bank Name<input placeholder="e.g. Stanbic Bank" value={bankForm.bankName} onChange={e => setBankForm(p => ({...p, bankName: e.target.value}))} /></label>
                <label>Account Name<input placeholder="Account holder name" value={bankForm.accountName} onChange={e => setBankForm(p => ({...p, accountName: e.target.value}))} /></label>
                <label>Account Number<input placeholder="Account number" value={bankForm.accountNumber} onChange={e => setBankForm(p => ({...p, accountNumber: e.target.value}))} /></label>
                <div style={{display:"flex",gap:8}}>
                  <button className="tool-button primary" disabled={submitting} onClick={handleSaveBank}>
                    {submitting ? <LoaderCircle size={15} style={{animation:"spin 0.8s linear infinite"}} /> : <Save size={15}/>}
                    Save
                  </button>
                  <button className="tool-button" onClick={() => setShowBankForm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{display:"grid",gap:12,padding:"8px 0"}}>
                <div className="detail-cell" style={{borderLeft:"3px solid #0891b2"}}>
                  <span>Bank Name</span>
                  <strong>{bankAccount.bankName}</strong>
                </div>
                <div className="detail-cell" style={{borderLeft:"3px solid #0891b2"}}>
                  <span>Account Name</span>
                  <strong>{bankAccount.accountName}</strong>
                </div>
                <div className="detail-cell" style={{borderLeft:"3px solid #0891b2"}}>
                  <span>Account Number</span>
                  <strong>{bankAccount.accountNumber}</strong>
                </div>
                <button className="tool-button" style={{marginTop:8}} onClick={() => { setBankForm(bankAccount); setShowBankForm(true); }}><Edit3 size={15}/>Edit Bank Details</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <div className="welcome-banner">
        <h2>Finance Office</h2>
        <p>Manage payments, receipts, cashbook, quotations, and requisitions.</p>
      </div>
      <MetricsBar />
      <div className="glass-card" style={{ padding: 16 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Quick Navigation</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Home", "Payments", "Receipts", "Cashbook", "Quotations", "Requisitions", "Reports", "Settings"].map(v => (
            <button key={v} className="tool-button" onClick={() => onViewChange?.(v)}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
