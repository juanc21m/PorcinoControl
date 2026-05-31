import { useState } from 'react';
import { Database, Play, Code2, Globe } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const SQL_SCHEMA = `-- PorciControl PostgreSQL Schema
-- Generated: 2026-05-30

CREATE TABLE animals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag           VARCHAR(10) UNIQUE NOT NULL,
  role          VARCHAR(10) NOT NULL CHECK (role IN ('Madre','Padrote','Ceba')),
  gender        VARCHAR(6)  NOT NULL CHECK (gender IN ('Macho','Hembra')),
  breed         VARCHAR(50) NOT NULL,
  birth_date    DATE        NOT NULL,
  weight        DECIMAL(7,2) NOT NULL,
  etapa_actual  VARCHAR(12) NOT NULL DEFAULT 'Ceba'
                CHECK (etapa_actual IN ('Reemplazo','Gestación','Maternidad','Destete','Ceba')),
  feed_type     VARCHAR(12) NOT NULL CHECK (feed_type IN ('Crecimiento','Engorde','Lactancia')),
  daily_consumption DECIMAL(5,2) NOT NULL,
  status        VARCHAR(18) NOT NULL DEFAULT 'Activo'
                CHECK (status IN ('Activo','Despachado','Fallecido','Descarte/Matadero')),
  heat_status   VARCHAR(12) CHECK (heat_status IN ('En Celo','Inseminada','Embarazada','Lactante','Vacía','Abierta')),
  last_heat_date        DATE,
  insemination_date     DATE,
  expected_farrowing    DATE,
  madre_id      UUID REFERENCES animals(id),
  padrote_id    UUID REFERENCES animals(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE animal_weights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id   UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  weight      DECIMAL(7,2) NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE animal_vaccinations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id   UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  vaccine     VARCHAR(100) NOT NULL,
  applied_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE animal_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id   UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE purchase_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(20) UNIQUE NOT NULL,
  supplier        VARCHAR(100) NOT NULL,
  feed_type       VARCHAR(12) NOT NULL CHECK (feed_type IN ('Crecimiento','Engorde','Lactancia')),
  sacos_qty       INTEGER NOT NULL CHECK (sacos_qty > 0),
  price_per_saco  DECIMAL(8,2) NOT NULL,
  invoice_date    DATE NOT NULL,
  status          VARCHAR(10) NOT NULL DEFAULT 'Pendiente'
                  CHECK (status IN ('Pendiente','Pagado')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(20) UNIQUE NOT NULL,
  customer        VARCHAR(100) NOT NULL,
  total_weight_lbs DECIMAL(9,2) NOT NULL,
  total_amount    DECIMAL(10,2) NOT NULL,
  invoice_date    DATE NOT NULL,
  status          VARCHAR(10) NOT NULL DEFAULT 'Pendiente'
                  CHECK (status IN ('Pendiente','Pagado')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_invoice_animals (
  sale_invoice_id UUID NOT NULL REFERENCES sale_invoices(id),
  animal_id       UUID NOT NULL REFERENCES animals(id),
  PRIMARY KEY (sale_invoice_id, animal_id)
);

CREATE TABLE feed_inventory (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type VARCHAR(12) UNIQUE NOT NULL,
  sacos     INTEGER NOT NULL DEFAULT 0,
  lb        DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_animals_status ON animals(status);
CREATE INDEX idx_animals_role ON animals(role);
CREATE INDEX idx_animals_etapa ON animals(etapa_actual);
CREATE INDEX idx_animals_heat_status ON animals(heat_status);
CREATE INDEX idx_purchase_invoices_date ON purchase_invoices(invoice_date);
CREATE INDEX idx_sale_invoices_date ON sale_invoices(invoice_date);
`;

type EndpointKey = 'GET /animals' | 'GET /animals/:tag' | 'POST /animals/farrowing' | 'GET /invoices' | 'GET /inventory';

export default function DatabasePortal() {
  const { animals, purchases, sales, inventory } = useAppStore();
  const [tab, setTab] = useState<'schema' | 'sandbox'>('schema');
  const [endpoint, setEndpoint] = useState<EndpointKey>('GET /animals');
  const [tagParam, setTagParam] = useState('M-00247');
  const [response, setResponse] = useState<string | null>(null);

  function execute() {
    let result: unknown;
    switch (endpoint) {
      case 'GET /animals':
        result = animals;
        break;
      case 'GET /animals/:tag':
        result = animals.find(a => a.tag === tagParam) ?? { error: 'Animal not found', tag: tagParam };
        break;
      case 'POST /animals/farrowing':
        result = {
          message: 'Endpoint requires POST body: { motherId, pigletCount, avgWeight }',
          example: { motherId: animals.find(a => a.heatStatus === 'Embarazada')?.id, pigletCount: 10, avgWeight: 3.2 },
        };
        break;
      case 'GET /invoices':
        result = { purchases, sales };
        break;
      case 'GET /inventory':
        result = inventory;
        break;
    }
    setResponse(JSON.stringify(result, null, 2));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database size={22} className="text-brand-400" /> DB Portal
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Consola técnica — esquema PostgreSQL y sandbox REST API</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {([
          { key: 'schema',  label: 'Esquema PostgreSQL', icon: Code2 },
          { key: 'sandbox', label: 'REST API Sandbox',    icon: Globe },
        ] as { key: 'schema' | 'sandbox'; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-brand-800 text-white shadow-glow' : 'text-gray-400 hover:text-white'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Schema */}
      {tab === 'schema' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800/50 px-4 py-2 flex items-center gap-2 border-b border-gray-800">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-gray-400 text-xs ml-2 font-mono">schema.sql</span>
          </div>
          <pre className="p-5 text-xs text-green-400 font-mono overflow-x-auto leading-relaxed whitespace-pre">
            {SQL_SCHEMA}
          </pre>
        </div>
      )}

      {/* Sandbox */}
      {tab === 'sandbox' && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Selector de Endpoint</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              {(['GET /animals', 'GET /animals/:tag', 'POST /animals/farrowing', 'GET /invoices', 'GET /inventory'] as EndpointKey[]).map(ep => (
                <button
                  key={ep}
                  onClick={() => { setEndpoint(ep); setResponse(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${endpoint === ep ? 'bg-brand-800/30 border-brand-700 text-brand-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                >
                  {ep}
                </button>
              ))}
            </div>

            {endpoint === 'GET /animals/:tag' && (
              <div className="mb-4">
                <label className="label">Tag del Animal</label>
                <input
                  className="input w-48 font-mono"
                  value={tagParam}
                  onChange={e => setTagParam(e.target.value.toUpperCase())}
                  placeholder="M-00247"
                />
              </div>
            )}

            <button
              onClick={execute}
              className="btn-primary flex items-center gap-2"
            >
              <Play size={15} /> Ejecutar
            </button>
          </div>

          {response && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gray-800/50 px-4 py-2 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-400 text-xs font-mono">200 OK</span>
                </div>
                <span className="text-gray-500 text-xs font-mono">{endpoint}</span>
              </div>
              <pre className="p-5 text-xs text-gray-300 font-mono overflow-x-auto max-h-[500px] leading-relaxed">
                {response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
