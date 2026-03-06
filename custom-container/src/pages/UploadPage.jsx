import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { parseCSV } from "../components/shared";

const REQUIRED_COLS = ["Container_ID", "Risk_Score", "Risk_Level"];
const OPTIONAL_COLS = [
  "Explanation_Summary", "Origin_Country", "Declared_Value",
  "Declared_Weight", "Measured_Weight", "Dwell_Time_Hours",
  "Shipping_Line", "HS_Code", "Destination_Port", "Actual_Status",
];

export default function UploadPage() {
  const { loadData, uploadMeta, resetToSample } = useData();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | parsing | error | success
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [pendingRows, setPendingRows] = useState(null);
  const [pendingName, setPendingName] = useState("");

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("Only CSV files are supported. Please upload a .csv file.");
      setStatus("error");
      return;
    }
    setStatus("parsing");
    setErrorMsg("");
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result);
        if (rows.length === 0) throw new Error("The file has no data rows.");

        // Validate required columns
        const firstRow = rows[0];
        const missingCols = REQUIRED_COLS.filter(c => !(c in firstRow) && !(c.toLowerCase() in firstRow));
        // Check via lowercase id/score/level fallbacks
        const hasId    = "id" in firstRow;
        const hasScore = "score" in firstRow;
        const hasLevel = "level" in firstRow;
        if (!hasId && !hasScore && !hasLevel && missingCols.length === 3) {
          throw new Error(`Missing required columns: ${REQUIRED_COLS.join(", ")}`);
        }

        const summary = {
          total:    rows.length,
          critical: rows.filter(r => r.level === "Critical").length,
          high:     rows.filter(r => r.level === "High").length,
          medium:   rows.filter(r => r.level === "Medium").length,
          low:      rows.filter(r => r.level === "Low").length,
        };
        setPendingRows(rows);
        setPendingName(file.name);
        setPreview({ summary, sample: rows.slice(0, 3) });
        setStatus("success");
      } catch (err) {
        setErrorMsg(err.message || "Failed to parse the CSV file.");
        setStatus("error");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read the file.");
      setStatus("error");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e) => {
    processFile(e.target.files[0]);
    e.target.value = "";
  }, [processFile]);

  const handleConfirm = () => {
    if (!pendingRows) return;
    loadData(pendingRows, pendingName);
    navigate("/dashboard");
  };

  const handleUseSample = () => {
    resetToSample();
    navigate("/dashboard");
  };

  const LEVEL_COLORS = { Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#22c55e" };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 flex flex-col">
      {/* Hero */}
      <div className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-semibold mb-6 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-Powered Risk Assessment
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-none">
            Upload Shipment Data
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Upload your container predictions CSV to instantly visualize risk scores, anomalies, and inspection priorities.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 w-full space-y-6">

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-12 text-center group
            ${dragOver
              ? "border-blue-500 bg-blue-950/30 scale-[1.01]"
              : status === "success"
              ? "border-green-600 bg-green-950/20"
              : status === "error"
              ? "border-red-700 bg-red-950/20"
              : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-900/80"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
          />

          {status === "parsing" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-slate-300 font-semibold">Parsing CSV…</p>
            </div>
          ) : status === "success" && preview ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center text-2xl">✓</div>
              <p className="text-green-400 font-bold text-lg">{pendingName}</p>
              <p className="text-slate-400 text-sm">File parsed successfully — {preview.summary.total} containers detected</p>
              <p className="text-slate-500 text-xs">Click to replace with a different file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl transition-colors
                ${dragOver ? "border-blue-500 bg-blue-900/40 text-blue-300" : "border-slate-700 bg-slate-800 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-300"}`}>
                ⬆
              </div>
              <div>
                <p className="text-white font-bold text-lg">
                  {dragOver ? "Drop it here!" : "Drag & drop your CSV"}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  or <span className="text-blue-400 underline underline-offset-2">browse files</span>
                </p>
              </div>
              <p className="text-slate-600 text-xs">Accepts .csv files · predictions.csv from ml_pipeline_v2.py</p>
            </div>
          )}
        </div>

        {/* Error */}
        {status === "error" && (
          <div className="rounded-xl bg-red-950/50 border border-red-800 p-4 flex items-start gap-3">
            <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
            <div>
              <p className="text-red-300 font-semibold text-sm">Upload failed</p>
              <p className="text-red-400/80 text-sm mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Preview card */}
        {status === "success" && preview && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <p className="text-slate-200 font-semibold text-sm">Preview · {preview.summary.total} containers</p>
              <div className="flex gap-3 text-xs">
                {Object.entries(preview.summary).filter(([k]) => k !== "total").map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: LEVEL_COLORS[k.charAt(0).toUpperCase() + k.slice(1)] }} />
                    {k.charAt(0).toUpperCase() + k.slice(1)}: <strong className="text-slate-200">{v}</strong>
                  </span>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-800">
              {preview.sample.map((row) => (
                <div key={row.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                  <span className="font-mono text-slate-300 font-semibold text-xs w-28 flex-shrink-0">{row.id}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded border font-mono"
                    style={{ color: LEVEL_COLORS[row.level], borderColor: LEVEL_COLORS[row.level] + "44", background: LEVEL_COLORS[row.level] + "11" }}
                  >
                    {row.level} · {row.score}
                  </span>
                  <span className="text-slate-500 text-xs truncate">{row.expl}</span>
                </div>
              ))}
              {preview.summary.total > 3 && (
                <div className="px-5 py-2 text-xs text-slate-600 text-center">
                  + {preview.summary.total - 3} more containers
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {status === "success" && pendingRows && (
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
            >
              <span>→</span> Load {pendingRows.length} Containers to Dashboard
            </button>
          )}
          <button
            onClick={handleUseSample}
            className={`py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              status === "success"
                ? "px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                : "flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            }`}
          >
            <span>◈</span> Use Sample Data (50 containers)
          </button>
        </div>

        {/* Format guide */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-slate-300 font-semibold text-sm mb-3">📋 Expected CSV Format</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Required columns</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_COLS.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-mono">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Optional columns</p>
              <div className="flex flex-wrap gap-1.5">
                {OPTIONAL_COLS.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            Run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">python ml_pipeline_v2.py Historical_Data.csv Real-Time_Data.csv</code>
          </p>
        </div>
      </div>
    </div>
  );
}
