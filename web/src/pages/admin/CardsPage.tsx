import { useEffect, useState, useRef } from 'react';
import { Search, CreditCard, QrCode, Printer, Ban, Unlock, Trash2, Plus, X, Download } from 'lucide-react';
import { cardsApi, studentsApi } from '../../services/api';
import { QRCodeSVG } from '../../components/common/QRCodeSVG';
import { showToast } from '../../components/common/Toast';
import './CardsPage.css';

interface Card {
  id: string;
  card_number: string;
  card_type: string;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  student_id: string;
  student_name: string;
  enrollment_number?: string;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  enrollment_number: string;
  grade?: string;
  balance?: number;
  hasCard?: boolean;
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState<Student[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [cardType, setCardType] = useState<'qrcode' | 'nfc'>('qrcode');
  const [issuing, setIssuing] = useState(false);
  const [previewQR, setPreviewQR] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cardsRes, studentsRes] = await Promise.all([
        cardsApi.list({ limit: 200 }),
        studentsApi.list({ limit: 500, isActive: true }),
      ]);
      const cardsData = cardsRes.data?.data?.data || [];
      const studentsData = studentsRes.data?.data?.data || [];

      const studentsWithCards = studentsData.map((s: any) => ({
        ...s,
        hasCard: cardsData.some((c: Card) => c.student_id === s.id && c.is_active),
      }));

      setCards(cardsData);
      setStudents(studentsWithCards);
    } catch (err) {
      console.error('Error loading cards:', err);
      showToast('Erro ao carregar cartões', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSearch = async (query: string) => {
    setStudentSearch(query);
    if (query.trim().length < 2) {
      setStudentSuggestions([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const { data } = await studentsApi.list({ search: query, limit: 20, isActive: true });
      const results = data?.data?.data || [];
      setStudentSuggestions(results);
    } catch {
      setStudentSuggestions([]);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleIssueCard = async () => {
    if (!selectedStudent) {
      showToast('Selecione um aluno', 'error');
      return;
    }

    setIssuing(true);
    try {
      const cardNumber = `QR-${Date.now().toString(36).toUpperCase()}`;
      await cardsApi.issue({
        studentId: selectedStudent.id,
        cardNumber,
        cardType,
      });
      showToast(`Cartão emitido para ${selectedStudent.name}!`, 'success');
      setShowIssueModal(false);
      setSelectedStudent(null);
      setStudentSearch('');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Erro ao emitir cartão';
      showToast(msg, 'error');
    } finally {
      setIssuing(false);
    }
  };

  const handleBlockCard = async (card: Card) => {
    const reason = prompt('Motivo do bloqueio:');
    if (!reason) return;
    try {
      await cardsApi.block(card.id, { reason });
      showToast(`Cartão de ${card.student_name} bloqueado`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Erro ao bloquear', 'error');
    }
  };

  const handleUnblockCard = async (card: Card) => {
    try {
      await cardsApi.unblock(card.id);
      showToast(`Cartão de ${card.student_name} desbloqueado`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Erro ao desbloquear', 'error');
    }
  };

  const handleDeactivateCard = async (card: Card) => {
    if (!confirm(`Desativar cartão de ${card.student_name}?`)) return;
    try {
      await cardsApi.deactivate(card.id);
      showToast(`Cartão de ${card.student_name} desativado`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Erro ao desativar', 'error');
    }
  };

  const handlePrintCard = (card: Card) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Permita pop-ups para imprimir', 'error');
      return;
    }

    const qrValue = `STUDENT:${card.student_id}`;
    const svgEl = document.querySelector(`[data-qr-id="${card.id}"]`);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cartão - ${card.student_name}</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f0f0; }
          .card { background: white; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; }
          .card-header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; }
          .card-header h2 { margin: 0; font-size: 18px; }
          .card-header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
          .qr-container { margin: 16px 0; }
          .student-name { font-size: 16px; font-weight: 700; margin: 8px 0 4px; }
          .student-info { font-size: 12px; color: #666; }
          .card-code { font-size: 11px; color: #999; margin-top: 12px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="card-header">
            <h2>Cantina Escolar</h2>
            <p>Cartão do Aluno</p>
          </div>
          <div class="qr-container" id="qr-target"></div>
          <div class="student-name">${card.student_name}</div>
          <div class="student-info">${card.enrollment_number || ''}</div>
          <div class="card-code">${card.card_number}</div>
        </div>
        <script>
          window.onload = function() {
            const svg = document.querySelector('[data-qr-print]');
            if (svg) document.getElementById('qr-target').appendChild(svg.cloneNode(true));
            setTimeout(() => { window.print(); window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const activeCards = filteredCards.filter(c => c.is_active && !c.is_blocked);
    if (activeCards.length === 0) {
      showToast('Nenhum cartão ativo para imprimir', 'info');
      return;
    }

    const qrSvgs: { [key: string]: string } = {};
    activeCards.forEach(card => {
      const el = document.querySelector(`[data-qr-id="${card.id}"] svg`);
      if (el) qrSvgs[card.id] = el.outerHTML;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHTML = activeCards.map(card => `
      <div class="card">
        <div class="card-header">
          <h2>Cantina Escolar</h2>
          <p>Cartão do Aluno</p>
        </div>
        <div class="qr-container">${qrSvgs[card.id] || ''}</div>
        <div class="student-name">${card.student_name}</div>
        <div class="student-info">${card.enrollment_number || ''}</div>
        <div class="card-code">${card.card_number}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cartões - Cantina Escolar</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 16px; background: white; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
          .card { border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; text-align: center; page-break-inside: avoid; }
          .card-header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 12px; border-radius: 10px; margin-bottom: 12px; }
          .card-header h2 { margin: 0; font-size: 16px; }
          .card-header p { margin: 2px 0 0; font-size: 11px; opacity: 0.9; }
          .qr-container { margin: 12px 0; }
          .qr-container svg { width: 140px; height: 140px; }
          .student-name { font-size: 14px; font-weight: 700; margin: 6px 0 2px; }
          .student-info { font-size: 11px; color: #666; }
          .card-code { font-size: 10px; color: #999; margin-top: 8px; font-family: monospace; }
          @media print { .grid { gap: 8px; } }
        </style>
      </head>
      <body>
        <div class="grid">${cardsHTML}</div>
        <script>window.onload = function() { setTimeout(() => { window.print(); }, 300); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    if (cards.length === 0) {
      showToast('Nenhum cartão para exportar', 'info');
      return;
    }
    let csv = '\uFEFF';
    csv += 'Aluno;Matrícula;Número do Cartão;Tipo;Status;Data de Emissão\n';
    cards.forEach(card => {
      const status = card.is_blocked ? 'Bloqueado' : card.is_active ? 'Ativo' : 'Inativo';
      const date = new Date(card.created_at).toLocaleDateString('pt-BR');
      csv += `"${card.student_name}";"${card.enrollment_number || ''}";"${card.card_number}";"${card.card_type}";"${status}";"${date}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('CSV exportado com sucesso!', 'success');
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = !search || 
      card.student_name.toLowerCase().includes(search.toLowerCase()) ||
      card.card_number.toLowerCase().includes(search.toLowerCase()) ||
      (card.enrollment_number || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && card.is_active && !card.is_blocked) ||
      (statusFilter === 'blocked' && card.is_blocked);
    return matchesSearch && matchesStatus;
  });

  const activeCount = cards.filter(c => c.is_active && !c.is_blocked).length;
  const blockedCount = cards.filter(c => c.is_blocked).length;
  const studentsWithoutCard = students.filter(s => !s.hasCard);

  return (
    <div className="cards-page animate-fadeIn">
      <div className="cards-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={24} /> Cartões QR Code
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Gerencie os cartões com QR Code dos alunos
          </p>
        </div>
        <div className="cards-header-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handlePrintAll}>
            <Printer size={16} /> Imprimir Todos
          </button>
          <button className="btn btn-primary" onClick={() => setShowIssueModal(true)}>
            <Plus size={16} /> Emitir Cartão
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cards-stats">
        <div className="stat-card">
          <span className="stat-label">Total de Cartões</span>
          <span className="stat-value">{cards.length}</span>
        </div>
        <div className="stat-card stat-active">
          <span className="stat-label">Ativos</span>
          <span className="stat-value">{activeCount}</span>
        </div>
        <div className="stat-card stat-blocked">
          <span className="stat-label">Bloqueados</span>
          <span className="stat-value">{blockedCount}</span>
        </div>
        <div className="stat-card stat-nocard">
          <span className="stat-label">Sem Cartão</span>
          <span className="stat-value">{studentsWithoutCard.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="cards-filters">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por aluno, matrícula ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todos ({cards.length})
          </button>
          <button
            className={`filter-tab ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Ativos ({activeCount})
          </button>
          <button
            className={`filter-tab ${statusFilter === 'blocked' ? 'active' : ''}`}
            onClick={() => setStatusFilter('blocked')}
          >
            Bloqueados ({blockedCount})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="cards-loading">Carregando cartões...</div>
      ) : filteredCards.length === 0 ? (
        <div className="cards-empty">
          <QrCode size={48} color="#94a3b8" />
          <h3>Nenhum cartão encontrado</h3>
          <p>{search ? 'Tente outro termo de busca' : 'Emita o primeiro cartão QR Code para um aluno'}</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredCards.map(card => (
            <div key={card.id} className={`card-item ${card.is_blocked ? 'blocked' : ''} ${!card.is_active ? 'inactive' : ''}`}>
              <div className="card-qr" data-qr-id={card.id}>
                <QRCodeSVG value={`STUDENT:${card.student_id}`} size={120} />
              </div>
              <div className="card-info">
                <h3 className="card-student-name">{card.student_name}</h3>
                <p className="card-enrollment">Mat: {card.enrollment_number || '—'}</p>
                <p className="card-code">Código: {card.card_number}</p>
                <div className="card-status">
                  {card.is_blocked ? (
                    <span className="status-badge blocked">
                      <Ban size={12} /> Bloqueado
                    </span>
                  ) : card.is_active ? (
                    <span className="status-badge active">
                      <QrCode size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="status-badge inactive">Inativo</span>
                  )}
                </div>
              </div>
              <div className="card-actions">
                <button className="btn-icon" title="Imprimir" onClick={() => handlePrintCard(card)}>
                  <Printer size={16} />
                </button>
                {card.is_blocked ? (
                  <button className="btn-icon" title="Desbloquear" onClick={() => handleUnblockCard(card)}>
                    <Unlock size={16} />
                  </button>
                ) : (
                  <button className="btn-icon" title="Bloquear" onClick={() => handleBlockCard(card)}>
                    <Ban size={16} />
                  </button>
                )}
                <button className="btn-icon danger" title="Desativar" onClick={() => handleDeactivateCard(card)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue Card Modal */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <h3><Plus size={20} /> Emitir Novo Cartão</h3>
              <button className="btn btn-ghost" onClick={() => setShowIssueModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Buscar Aluno</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome ou matrícula do aluno..."
                  value={studentSearch}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                  autoFocus
                />
                {searchingStudents && <p className="text-muted" style={{ fontSize: '0.8rem' }}>Buscando...</p>}
                {studentSuggestions.length > 0 && (
                  <div className="student-suggestions">
                    {studentSuggestions.map(s => (
                      <div
                        key={s.id}
                        className={`student-suggestion ${selectedStudent?.id === s.id ? 'selected' : ''} ${s.hasCard ? 'has-card' : ''}`}
                        onClick={() => {
                          setSelectedStudent(s);
                          setStudentSearch(s.name);
                          setStudentSuggestions([]);
                        }}
                      >
                        <div>
                          <strong>{s.name}</strong>
                          <span>Mat: {s.enrollment_number} {s.grade ? `• ${s.grade}` : ''}</span>
                        </div>
                        {s.hasCard && <span className="has-card-badge">Já possui cartão</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Tipo de Cartão</label>
                <div className="card-type-selector">
                  <button
                    className={`card-type-option ${cardType === 'qrcode' ? 'selected' : ''}`}
                    onClick={() => setCardType('qrcode')}
                  >
                    <QrCode size={20} /> QR Code
                  </button>
                  <button
                    className={`card-type-option ${cardType === 'nfc' ? 'selected' : ''}`}
                    onClick={() => setCardType('nfc')}
                  >
                    <CreditCard size={20} /> NFC
                  </button>
                </div>
              </div>

              {selectedStudent && (
                <div className="selected-student-preview">
                  <div className="preview-qr">
                    <QRCodeSVG value={`STUDENT:${selectedStudent.id}`} size={100} />
                  </div>
                  <div>
                    <strong>{selectedStudent.name}</strong>
                    <p>Mat: {selectedStudent.enrollment_number}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleIssueCard}
                disabled={!selectedStudent || issuing}
              >
                {issuing ? 'Emitindo...' : 'Emitir Cartão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {previewQR && (
        <div className="modal-overlay" onClick={() => setPreviewQR(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3>QR Code do Aluno</h3>
              <button className="btn btn-ghost" onClick={() => setPreviewQR(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center' }}>
              <QRCodeSVG value={previewQR} size={250} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
