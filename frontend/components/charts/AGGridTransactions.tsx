"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { 
  ModuleRegistry, 
  AllCommunityModule, 
  CsvExportModule, 
  ValidationModule,
  ColDef,
  themeQuartz
} from "ag-grid-community";
import { TransactionItem, sendInvoiceReminder } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Download, Search, CheckCircle, Clock, RotateCcw, BellRing, Loader2, Check } from "lucide-react";

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule, CsvExportModule, ValidationModule]);

interface AGGridTransactionsProps {
  transactions: TransactionItem[];
}

export function AGGridTransactions({ transactions }: AGGridTransactionsProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [mounted, setMounted] = useState(false);
  const [reminderState, setReminderState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSendReminder = async (invoiceId: string) => {
    setReminderState(prev => ({ ...prev, [invoiceId]: "sending" }));
    try {
      const res = await sendInvoiceReminder(invoiceId);
      if (res.success) {
        setReminderState(prev => ({ ...prev, [invoiceId]: "sent" }));
      } else {
        setReminderState(prev => ({ ...prev, [invoiceId]: "error" }));
      }
    } catch (e) {
      console.error("Reminder failed:", e);
      setReminderState(prev => ({ ...prev, [invoiceId]: "error" }));
    }
  };

  const gridTheme = useMemo(() => themeQuartz, []);

  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = selectedType === "ALL" || t.type === selectedType;
      const matchesSearch = 
        t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.product_tier && t.product_tier.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [transactions, selectedType, searchTerm]);

  const columnDefs = useMemo<ColDef<TransactionItem>[]>(() => [
    {
      field: "id",
      headerName: "Transaction ID",
      width: 150,
      cellRenderer: (params: { value: string }) => (
        <span className="font-mono text-xs text-[#002991] font-semibold">
          {params.value}
        </span>
      ),
    },
    {
      field: "date",
      headerName: "Date / Time",
      width: 160,
      cellRenderer: (params: { value: string }) => (
        <span className="text-xs text-[#4A5568]">{params.value}</span>
      ),
    },
    {
      field: "customer_name",
      headerName: "Customer",
      flex: 1,
      minWidth: 180,
      cellRenderer: (params: { data: TransactionItem | undefined }) => {
        if (!params.data) return null;
        return (
          <div className="flex flex-col justify-center leading-tight py-1">
            <span className="font-semibold text-xs text-[#000000]">
              {params.data.customer_name}
            </span>
            <span className="text-[11px] text-[#4A5568]">
              {params.data.customer_email}
            </span>
          </div>
        );
      },
    },
    {
      field: "product_tier",
      headerName: "Tier / Item",
      width: 150,
      cellRenderer: (params: { value: string }) => (
        <span className="rounded-md bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#002991] border border-[#E2E8F0]">
          {params.value || "Direct"}
        </span>
      ),
    },
    {
      field: "region",
      headerName: "Region",
      width: 160,
      cellRenderer: (params: { value: string }) => (
        <span className="text-xs flex items-center gap-1.5 text-[#000000]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#008CFF]"></span>
          {params.value}
        </span>
      ),
    },
    {
      field: "type",
      headerName: "Type",
      width: 130,
      cellRenderer: (params: { value: string }) => {
        const val = params.value;
        const color =
          val === "SUBSCRIPTION"
            ? "bg-[#E5F3FF] text-[#002991] border-[#008CFF]/30"
            : val === "REFUND"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-slate-100 text-slate-700 border-slate-200";
        return (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${color}`}>
            {val}
          </span>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      cellRenderer: (params: { value: string }) => {
        const val = params.value;
        if (val === "COMPLETED") {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle className="h-3 w-3" />
              Completed
            </span>
          );
        }
        if (val === "REFUNDED") {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
              <RotateCcw className="h-3 w-3" />
              Refunded
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      },
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 130,
      sort: "desc",
      cellRenderer: (params: { value: number; data: TransactionItem | undefined }) => {
        const isNegative = params.value < 0;
        return (
          <span className={`font-semibold text-xs font-mono-num ${isNegative ? "text-rose-600" : "text-emerald-600"}`}>
            {formatCurrency(params.value, params.data?.currency || "USD")}
          </span>
        );
      },
    },
    {
      headerName: "1-Click Action",
      width: 160,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: TransactionItem | undefined }) => {
        if (!params.data) return null;
        const isPending = params.data.status === "PENDING";
        const state = reminderState[params.data.id] || "idle";

        if (!isPending) {
          return (
            <span className="text-[11px] text-[#94A3B8] font-medium">
              Settled
            </span>
          );
        }

        if (state === "sending") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E5F3FF] text-[#002991] text-[11px] font-semibold border border-[#008CFF]/30">
              <Loader2 className="w-3 h-3 animate-spin text-[#008CFF]" />
              <span>Sending...</span>
            </span>
          );
        }

        if (state === "sent") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Reminder Sent</span>
            </span>
          );
        }

        return (
          <button
            onClick={() => handleSendReminder(params.data!.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#002991] hover:bg-[#008CFF] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
            title="Send automated payment reminder via PayPal Invoicing API"
          >
            <BellRing className="w-3 h-3" />
            <span>Send Reminder</span>
          </button>
        );
      },
    },
  ], [reminderState]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const exportCsv = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `warren-paypal-transactions-${new Date().toISOString().split("T")[0]}.csv`,
    });
  };

  return (
    <div className="w-full">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search customers, tiers, IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-48 sm:w-64 rounded-xl border border-[#E2E8F0] bg-white pl-8 pr-3 text-xs text-[#000000] placeholder-[#94A3B8] focus:border-[#008CFF] focus:outline-none focus:ring-1 focus:ring-[#008CFF] shadow-sm"
            />
          </div>

          {/* Type filters */}
          <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] p-0.5">
            {["ALL", "SUBSCRIPTION", "PURCHASE", "REFUND"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedType === type
                    ? "bg-[#002991] text-white shadow-sm"
                    : "text-[#4A5568] hover:text-[#000000]"
                }`}
              >
                {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Export CSV button */}
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#000000] hover:bg-[#F5F7FA] hover:text-[#002991] transition-colors shadow-sm cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#4A5568]" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="w-full h-[400px] rounded-xl overflow-hidden border border-[#E2E8F0]">
        {!mounted ? (
          <div className="w-full h-full bg-[#F5F7FA] animate-pulse flex items-center justify-center text-xs text-[#94A3B8]">
            Loading transaction ledger...
          </div>
        ) : (
          <AgGridReact
            ref={gridRef}
            theme={gridTheme}
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            rowHeight={48}
            headerHeight={40}
          />
        )}
      </div>
    </div>
  );
}
