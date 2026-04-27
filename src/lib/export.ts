import { LEAD_SOURCES, FINANCIAL_TYPES, FINANCIAL_STATUSES } from '../types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR');

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('pt-BR');

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ReportData {
  title: string;
  period: string;
  clinicName: string;
  attendance: Array<{
    classification: string;
    count: number;
    date: string;
  }>;
  appointments: Array<{
    title: string;
    contact_name: string;
    scheduled_at: string;
    status: string;
  }>;
  financial: Array<{
    description: string;
    type: string;
    category: string;
    amount: number;
    status: string;
    due_date: string;
  }>;
  leads: Array<{
    source: string;
    count: number;
    date: string;
  }>;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function exportToPDF(data: ReportData) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    h1 { font-size: 20px; color: #059669; margin-bottom: 2px; }
    .clinic { color: #374151; font-size: 14px; margin-bottom: 2px; }
    .period { color: #6b7280; margin-bottom: 24px; font-size: 13px; }
    .summary { display: flex; gap: 16px; margin-bottom: 28px; }
    .summary-card { flex: 1; padding: 12px 16px; border-radius: 8px; }
    .green { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .red { background: #fef2f2; border: 1px solid #fecaca; }
    .blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .summary-card .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: bold; }
    .green .value { color: #059669; }
    .red .value { color: #dc2626; }
    .blue .value { color: #2563eb; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f9fafb; text-align: left; padding: 7px 10px; font-size: 11px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${data.clinicName}</h1>
  <div class="period">${data.title} — ${data.period}</div>
  <div class="summary">
    <div class="summary-card green">
      <div class="label">Receita Total</div>
      <div class="value">${formatCurrency(data.totalIncome)}</div>
    </div>
    <div class="summary-card red">
      <div class="label">Despesas Totais</div>
      <div class="value">${formatCurrency(data.totalExpense)}</div>
    </div>
    <div class="summary-card blue">
      <div class="label">Saldo do Período</div>
      <div class="value">${formatCurrency(data.balance)}</div>
    </div>
  </div>

  ${data.attendance.length > 0 ? `
  <h2>Atendimentos (${data.attendance.reduce((s, a) => s + a.count, 0)})</h2>
  <table>
    <thead><tr><th>Classificação</th><th>Quantidade</th><th>Data</th></tr></thead>
    <tbody>
      ${data.attendance.map(a => `
        <tr><td>${a.classification}</td><td>${a.count}</td><td>${formatDate(a.date)}</td></tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${data.appointments.length > 0 ? `
  <h2>Agendamentos (${data.appointments.length})</h2>
  <table>
    <thead><tr><th>Título</th><th>Contato</th><th>Data/Hora</th><th>Status</th></tr></thead>
    <tbody>
      ${data.appointments.map(a => `
        <tr><td>${a.title}</td><td>${a.contact_name || '-'}</td><td>${formatDateTime(a.scheduled_at)}</td><td>${a.status}</td></tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${data.leads.length > 0 ? `
  <h2>Leads (${data.leads.reduce((s, l) => s + l.count, 0)})</h2>
  <table>
    <thead><tr><th>Origem</th><th>Quantidade</th><th>Data</th></tr></thead>
    <tbody>
      ${data.leads.map(l => `
        <tr><td>${LEAD_SOURCES[l.source] || l.source}</td><td>${l.count}</td><td>${formatDate(l.date)}</td></tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${data.financial.length > 0 ? `
  <h2>Financeiro (${data.financial.length})</h2>
  <table>
    <thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Valor</th><th>Status</th><th>Vencimento</th></tr></thead>
    <tbody>
      ${data.financial.map(f => `
        <tr>
          <td>${f.description}</td>
          <td>${FINANCIAL_TYPES[f.type] || f.type}</td>
          <td>${f.category || '-'}</td>
          <td>${formatCurrency(f.amount)}</td>
          <td>${FINANCIAL_STATUSES[f.status] || f.status}</td>
          <td>${formatDate(f.due_date)}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

export function exportAttendanceCSV(attendance: ReportData['attendance']) {
  exportToCSV(attendance.map(a => ({
    Classificação: a.classification,
    Quantidade: a.count,
    Data: formatDate(a.date),
  })), 'atendimentos');
}

export function exportFinancialCSV(financial: ReportData['financial']) {
  exportToCSV(financial.map(f => ({
    Descrição: f.description,
    Tipo: FINANCIAL_TYPES[f.type] || f.type,
    Categoria: f.category,
    'Valor (R$)': f.amount,
    Status: FINANCIAL_STATUSES[f.status] || f.status,
    Vencimento: formatDate(f.due_date),
  })), 'financeiro');
}

export function exportLeadsCSV(leads: ReportData['leads']) {
  exportToCSV(leads.map(l => ({
    Origem: LEAD_SOURCES[l.source] || l.source,
    Quantidade: l.count,
    Data: formatDate(l.date),
  })), 'leads');
}
