import React, { useState } from 'react';
import { 
  Database, Terminal, Copy, Check, Download, 
  FileCode, Sparkles, Server, CheckCircle, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { 
  POSTGRES_SCHEMA_SQL, 
  PYTHON_SERVER_CODE, 
  FASTAPI_REQUIREMENTS_TXT, 
  generateAiStudioSingleJson 
} from '../data/pythonPostgresBundle';

export const PostgresPythonHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'JSON' | 'PYTHON' | 'SQL' | 'SETUP'>('JSON');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const singleJsonContent = React.useMemo(() => generateAiStudioSingleJson(), []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (filename: string, content: string, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Python Webserver & PostgreSQL Database Hub</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                CRUD + Local / Cloud Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Single JSON file exporter for Google AI Studio, complete FastAPI backend, and PostgreSQL DDL schema
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('JSON')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'JSON'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Single JSON File</span>
          </button>

          <button
            onClick={() => setActiveTab('PYTHON')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'PYTHON'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Python Webserver</span>
          </button>

          <button
            onClick={() => setActiveTab('SQL')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'SQL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('SETUP')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'SETUP'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Run Locally</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SINGLE JSON FILE FOR GOOGLE AI STUDIO */}
      {activeTab === 'JSON' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Google AI Studio Single JSON Bundle</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Contains the complete PostgreSQL database schema, Python FastAPI backend, seed catalog, prompts, and architecture in one single JSON file.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(singleJsonContent, 'single-json')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                {copiedKey === 'single-json' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied JSON!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON File</span>
                  </>
                )}
              </button>

              <button
                onClick={() =>
                  handleDownload(
                    'google-ai-studio-kigalistock.json',
                    singleJsonContent,
                    'application/json'
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .json</span>
              </button>
            </div>
          </div>

          {/* Code Viewer Container */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <span>google-ai-studio-kigalistock.json</span>
              <span>{(singleJsonContent.length / 1024).toFixed(1)} KB</span>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{singleJsonContent}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: PYTHON WEBSERVER (FastAPI) */}
      {activeTab === 'PYTHON' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>Python FastAPI Webserver (`server.py`)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete CRUD REST API with SQLAlchemy ORM, Barcode endpoint, Stock In/Out, POS Checkout, MTN MoMo callback, and Google Gemini SDK.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(PYTHON_SERVER_CODE, 'python-code')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                {copiedKey === 'python-code' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied Python!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy server.py</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownload('server.py', PYTHON_SERVER_CODE)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .py</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <span>server.py &bull; FastAPI + SQLAlchemy + PostgreSQL</span>
              <span>Python 3.10+</span>
            </div>
            <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{PYTHON_SERVER_CODE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: POSTGRESQL SCHEMA (schema.sql) */}
      {activeTab === 'SQL' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span>PostgreSQL CRUD Schema (`schema.sql`)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tables for Users, Products (indexed on barcode & SKU), Suppliers, Stock Movements, Sales, Triggers for automatic inventory deduction, and Views in RWF.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(POSTGRES_SCHEMA_SQL, 'sql-code')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                {copiedKey === 'sql-code' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied SQL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy schema.sql</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownload('schema.sql', POSTGRES_SCHEMA_SQL)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <span>schema.sql &bull; PostgreSQL 14+</span>
              <span>Rwandan Francs (RWF)</span>
            </div>
            <pre className="p-4 text-xs font-mono text-amber-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{POSTGRES_SCHEMA_SQL}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: SETUP GUIDE */}
      {activeTab === 'SETUP' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>How to Run Locally with Installed Python & PostgreSQL</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Follow these simple steps on your machine where Python and PostgreSQL are already installed.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Step 1: Initialize PostgreSQL Database
              </span>
              <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto">
{`# Create the database in PostgreSQL
createdb kigalistock_db

# Load the tables, indexes, and stock triggers
psql -d kigalistock_db -f schema.sql`}
              </pre>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Step 2: Install Python Dependencies
              </span>
              <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto">
{`pip install fastapi uvicorn sqlalchemy psycopg2-binary google-genai python-dotenv`}
              </pre>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Step 3: Start the Python Webserver
              </span>
              <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto">
{`# Set your PostgreSQL connection string and Gemini key
export DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/kigalistock_db"
export GEMINI_API_KEY="your-gemini-api-key"

# Run FastAPI with live reload
uvicorn server:app --reload --port 8000`}
              </pre>
            </div>

            {/* Interactive Confirmation */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Your Python webserver will be live on <strong>http://localhost:8000</strong> with interactive Swagger documentation at <strong>http://localhost:8000/docs</strong>!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
