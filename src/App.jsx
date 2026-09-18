import React, { useState } from 'react'
import {
  createGeniusTerminalTransaction,
  checkTerminalStatus,
  NetworkError
} from './api.js'

const DEFAULT_CREATE_URL =
  'https://demosparkle.pos.diasparkonline.com/genius_api/transaction/genius_transaction/create_genius_terminal_transaction'

const DEFAULT_FIELDS = {
  company_id: '6',
  cashier_code: 'ADMIN',
  amt: '3.30',
  customer_code: 'TESD-00001',
  customer_id: '3845',
  trans_no: '',
  trans_bk: 'SI04',
  tax_amt: '2965.80',
  invoke_manual_entry: false,
  trans_code: 'LEVEL2SALE',
  host_id: '400',
  source_application: 'RETAILPOS'
}

function NetworkHint({ error, targetLabel }) {
  if (!(error instanceof NetworkError)) return null
  return (
    <p className="hint">
      Could not reach <code>{error.url}</code>. This usually means a CORS restriction,
      a browser blocking an insecure (http) request from a secure (https) page
      ("mixed content"), or {targetLabel} simply isn't reachable from this machine/network.
      See the README for options.
    </p>
  )
}

function FieldRow({ label, children }) {
  return (
    <label className="field-row">
      <span>{label}</span>
      {children}
    </label>
  )
}

function RawBlock({ title, content }) {
  if (!content) return null
  return (
    <details className="raw-block">
      <summary>{title}</summary>
      <pre>{content}</pre>
    </details>
  )
}

function FlattenedTable({ flattened }) {
  if (!flattened || !flattened.fields) return null
  return (
    <table className="kv-table">
      <tbody>
        {Object.entries(flattened.fields).map(([key, value]) => (
          <tr key={key}>
            <th>{key}</th>
            <td>{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function App() {
  // --- Create transaction state ---
  const [apiUrl, setApiUrl] = useState(DEFAULT_CREATE_URL)
  const [fields, setFields] = useState(DEFAULT_FIELDS)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState(null)
  const [createError, setCreateError] = useState(null)

  // --- Check status state ---
  const [terminalHost, setTerminalHost] = useState('192.168.203.7')
  const [terminalPort, setTerminalPort] = useState('8080')
  const [format, setFormat] = useState('XML')
  const [transportKey, setTransportKey] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [checkError, setCheckError] = useState(null)

  function updateField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreateResult(null)
    try {
      const result = await createGeniusTerminalTransaction(apiUrl, fields)
      setCreateResult(result)
      const tk = result.flattened?.fields?.transport_key
      if (tk) setTransportKey(tk)
    } catch (err) {
      setCreateError(err)
    } finally {
      setCreating(false)
    }
  }

  async function handleCheck(e) {
    e.preventDefault()
    setChecking(true)
    setCheckError(null)
    setCheckResult(null)
    try {
      const result = await checkTerminalStatus({
        host: terminalHost,
        port: terminalPort,
        transportKey,
        format
      })
      setCheckResult(result)
    } catch (err) {
      setCheckError(err)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Genius Terminal Transaction Console</h1>
        <p className="subtitle">
          Create a Genius terminal transaction, then check its status on the terminal.
        </p>
      </header>

      <section className="card">
        <h2>1. Create Transaction</h2>
        <form onSubmit={handleCreate}>
          <FieldRow label="API URL">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </FieldRow>

          <div className="field-grid">
            <FieldRow label="company_id">
              <input
                value={fields.company_id}
                onChange={(e) => updateField('company_id', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="cashier_code">
              <input
                value={fields.cashier_code}
                onChange={(e) => updateField('cashier_code', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="amt">
              <input
                value={fields.amt}
                onChange={(e) => updateField('amt', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="customer_code">
              <input
                value={fields.customer_code}
                onChange={(e) => updateField('customer_code', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="customer_id">
              <input
                value={fields.customer_id}
                onChange={(e) => updateField('customer_id', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="trans_no">
              <input
                value={fields.trans_no}
                placeholder="(empty -> <trans_no/>)"
                onChange={(e) => updateField('trans_no', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="trans_bk">
              <input
                value={fields.trans_bk}
                onChange={(e) => updateField('trans_bk', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="tax_amt">
              <input
                value={fields.tax_amt}
                onChange={(e) => updateField('tax_amt', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="invoke_manual_entry">
              <select
                value={String(fields.invoke_manual_entry)}
                onChange={(e) => updateField('invoke_manual_entry', e.target.value === 'true')}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </FieldRow>
            <FieldRow label="trans_code">
              <input
                value={fields.trans_code}
                onChange={(e) => updateField('trans_code', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="host_id">
              <input
                value={fields.host_id}
                onChange={(e) => updateField('host_id', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="source_application">
              <input
                value={fields.source_application}
                onChange={(e) => updateField('source_application', e.target.value)}
              />
            </FieldRow>
          </div>

          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create Terminal Transaction'}
          </button>
        </form>

        {createError && (
          <div className="error-box">
            <p>{createError.message}</p>
            <NetworkHint error={createError} targetLabel="the transaction API" />
            <RawBlock title="Error response body" content={createError.responseText} />
          </div>
        )}

        {createResult && (
          <div className="result-box">
            <h3>Result</h3>
            <FlattenedTable flattened={createResult.flattened} />
            {createResult.flattened?.fields?.transport_key && (
              <p className="success-note">
                transport_key captured below — ready to use in step 2.
              </p>
            )}
            <RawBlock title="Request XML sent" content={createResult.requestXml} />
            <RawBlock title="Raw response XML" content={createResult.responseText} />
          </div>
        )}
      </section>

      <section className="card">
        <h2>2. Check Terminal Status</h2>
        <form onSubmit={handleCheck}>
          <div className="field-grid">
            <FieldRow label="Terminal host">
              <input
                value={terminalHost}
                onChange={(e) => setTerminalHost(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Terminal port">
              <input
                value={terminalPort}
                onChange={(e) => setTerminalPort(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Format">
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="XML">XML</option>
                <option value="JSON">JSON</option>
              </select>
            </FieldRow>
            <FieldRow label="TransportKey">
              <input
                value={transportKey}
                onChange={(e) => setTransportKey(e.target.value)}
                placeholder="from step 1, or paste one"
              />
            </FieldRow>
          </div>

          <button type="submit" disabled={checking || !transportKey}>
            {checking ? 'Checking…' : 'Check Status'}
          </button>
        </form>

        {checkError && (
          <div className="error-box">
            <p>{checkError.message}</p>
            <NetworkHint error={checkError} targetLabel="the terminal" />
            <RawBlock title="Error response body" content={checkError.responseText} />
          </div>
        )}

        {checkResult && (
          <div className="result-box">
            <h3>Result</h3>
            <FlattenedTable flattened={checkResult.flattened} />
            <RawBlock title="Request URL" content={checkResult.requestUrl} />
            <RawBlock title="Raw response" content={checkResult.responseText} />
          </div>
        )}
      </section>

      <footer>
        <p>
          Calling the local terminal endpoint and the remote API directly from the
          browser can be blocked by CORS or mixed-content rules depending on how
          this app is hosted — see the README for details.
        </p>
      </footer>
    </div>
  )
}
