import { useEffect, useState } from 'react';
import { Search, CreditCard, QrCode, Printer, Ban, Unlock, Trash2, Plus, X, Download, Settings, Upload } from 'lucide-react';
import { cardsApi, studentsApi, cardTemplatesApi } from '../../services/api';
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

interface CardTemplate {
  id?: string;
  background_image?: string;
  title: string;
  subtitle: string;
  primary_color: string;
  secondary_color: string;
  show_name: boolean;
  show_enrollment: boolean;
  show_grade: boolean;
  qr_size: number;
}

const DEFAULT_TEMPLATE: CardTemplate = {
  title: 'Cantina Escolar',
  subtitle: 'Cartão do Aluno',
  primary_color: '#059669',
  secondary_color: '#10b981',
  show_name: true,
  show_enrollment: true,
  show_grade: false,
  qr_size: 160,
};

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

  // Template state
  const [template, setTemplate] = useState<CardTemplate>(DEFAULT_TEMPLATE);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateBgUploading, setTemplateBgUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cardsRes, studentsRes, templateRes] = await Promise.all([
        cardsApi.list({ limit: 200 }),
        studentsApi.list({ limit: 500, isActive: true }),
        cardTemplatesApi.get().catch(() => ({ data: { data: null } })),
      ]);
      const cardsData = cardsRes.data?.data?.data || [];
      const studentsData = studentsRes.data?.data?.data || [];
      const templateData = templateRes.data?.data;

      if (templateData) {
        setTemplate({ ...DEFAULT_TEMPLATE, ...templateData });
      }

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

  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    try {
      const payload: any = {};
      if (template.title) payload.title = template.title;
      if (template.subtitle) payload.subtitle = template.subtitle;
      payload.primaryColor = template.primary_color;
      payload.secondaryColor = template.secondary_color;
      payload.showName = template.show_name;
      payload.showEnrollment = template.show_enrollment;
      payload.showGrade = template.show_grade;
      payload.qrSize = template.qr_size;
      await cardTemplatesApi.upsert(payload);
      showToast('Modelo do cartão salvo!', 'success');
      setShowTemplateModal(false);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Erro ao salvar modelo', 'error');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateBgUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await cardTemplatesApi.uploadBackground(formData);
      setTemplate({ ...template, background_image: data.data.background_image });
      showToast('Imagem de fundo enviada!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Erro ao enviar imagem', 'error');
    } finally {
      setTemplateBgUploading(false);
    }
  };

  const handleDeleteBackground = async () => {
    try {
      await cardTemplatesApi.upsert({ backgroundImage: '' });
      setTemplate({ ...template, background_image: undefined });
      showToast('Imagem de fundo removida', 'success');
    } catch (err: any) {
      showToast('Erro ao remover imagem', 'error');
    }
  };

  const buildCardHTML = (studentName: string, enrollment: string, grade: string, qrSvg: string) => {
    const t = template;
    const hasBg = !!t.background_image;

    const cardStyle = hasBg
      ? `background: url(${t.background_image}) center/cover no-repeat; border-radius: 16px; width: 340px; min-height: 210px; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`
      : `background: linear-gradient(135deg, ${t.primary_color}, ${t.secondary_color}); border-radius: 16px; width: 340px; padding: 24px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);`;

    const textColor = hasBg ? '#fff' : '#fff';

    return `
      <!DOCTYPE html>
      <html>
      <head><title>Cartão - ${studentName}</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f0f0; }
        .card { ${cardStyle} }
        .card-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
        .card-header { font-size: 20px; font-weight: 800; color: ${textColor}; text-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 4px; }
        .card-subtitle { font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 16px; }
        .card-qr { margin: 8px 0; background: white; padding: 8px; border-radius: 8px; display: inline-block; }
        .card-name { font-size: 15px; font-weight: 700; color: ${textColor}; margin-top: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
        .card-info { font-size: 11px; color: rgba(255,255,255,0.9); margin-top: 4px; }
      </style>
      </head>
      <body>
        <div class="card">
          <div class="card-overlay">
            <div class="card-header">${t.title}</div>
            <div class="card-subtitle">${t.subtitle}</div>
            <div class="card-qr">${qrSvg}</div>
            ${t.show_name ? `<div class="card-name">${studentName}</div>` : ''}
            ${t.show_enrollment ? `<div class="card-info">Mat: ${enrollment}</div>` : ''}
            ${t.show_grade && grade ? `<div class="card-info">${grade}</div>` : ''}
          </div>
        </div>
        <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},500);};</script>
      </body>
      </html>
    `;
  };

  const handlePrintCard = (card: Card) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Permita pop-ups para imprimir', 'error');
      return;
    }
    const svgEl = document.querySelector(`[data-qr-id="${card.id}"] svg`);
    const qrSvg = svgEl ? svgEl.outerHTML : '';
    printWindow.document.write(buildCardHTML(card.student_name, card.enrollment_number || '', '', qrSvg));
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const activeCards = filteredCards.filter(c => c.is_active && !c.is_blocked);
    if (activeCards.length === 0) {
      showToast('Nenhum cartão ativo para imprimir', 'info');
      return;
    }

    const t = template;
    const hasBg = !!t.background_image;
    const qrSvgs: { [key: string]: string } = {};
    activeCards.forEach(card => {
      const el = document.querySelector(`[data-qr-id="${card.id}"] svg`);
      if (el) qrSvgs[card.id] = el.outerHTML;
    });

    const cardsHTML = activeCards.map(card => {
      const cardStyle = hasBg
        ? `background: url(${t.background_image}) center/cover no-repeat; border-radius: 16px; min-height: 200px; position: relative; overflow: hidden; page-break-inside: avoid;`
        : `background: linear-gradient(135deg, ${t.primary_color}, ${t.secondary_color}); border-radius: 16px; padding: 24px; text-align: center; page-break-inside: avoid;`;

      return `
        <div style="${cardStyle}">
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
            <div style="font-size:18px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.3);">${t.title}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.9);margin-bottom:12px;">${t.subtitle}</div>
            <div style="background:white;padding:6px;border-radius:8px;display:inline-block;">${qrSvgs[card.id] || ''}</div>
            ${t.show_name ? `<div style="font-size:14px;font-weight:700;color:#fff;margin-top:10px;text-shadow:0 1px 2px rgba(0,0,0,0.3);">${card.student_name}</div>` : ''}
            ${t.show_enrollment ? `<div style="font-size:10px;color:rgba(255,255,255,0.9);margin-top:3px;">Mat: ${card.enrollment_number || ''}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Cartões - Cantina</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 16px; background: white; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
      </style>
      </head>
      <body>
        <div class="grid">${cardsHTML}</div>
        <script>window.onload=function(){setTimeout(()=>{window.print();},300);};</script>
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
          <button className="btn btn-secondary" onClick={() => setShowTemplateModal(true)}>
            <Settings size={16} /> Arte do Cartão
          </button>
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

      {/* Template Settings Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '95%' }}>
            <div className="modal-header">
              <h3><Settings size={20} /> Arte do Cartão</h3>
              <button className="btn btn-ghost" onClick={() => setShowTemplateModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Background Image Upload */}
              <div className="form-group">
                <label>Imagem de Fundo</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                  Envie uma imagem que será o fundo do cartão. O QR Code e os dados do aluno ficam sobrepostos.
                </p>
                {template.background_image ? (
                  <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={template.background_image} alt="Fundo do cartão" style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
                    <button
                      className="btn btn-ghost"
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={handleDeleteBackground}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '10px',
                    cursor: 'pointer', color: 'var(--text-muted)', gap: '8px', transition: 'border-color 0.2s',
                  }}>
                    <Upload size={24} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {templateBgUploading ? 'Enviando...' : 'Clique para enviar imagem'}
                    </span>
                    <span style={{ fontSize: '0.72rem' }}>PNG, JPG ou WebP (máx. 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleUploadBackground}
                      disabled={templateBgUploading}
                    />
                  </label>
                )}
              </div>

              {/* Title & Subtitle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Título</label>
                  <input
                    type="text"
                    className="form-input"
                    value={template.title}
                    onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Subtítulo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={template.subtitle}
                    onChange={(e) => setTemplate({ ...template, subtitle: e.target.value })}
                  />
                </div>
              </div>

              {/* Colors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Cor Principal</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={template.primary_color}
                      onChange={(e) => setTemplate({ ...template, primary_color: e.target.value })}
                      style={{ width: '40px', height: '36px', padding: '2px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={template.primary_color}
                      onChange={(e) => setTemplate({ ...template, primary_color: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Cor Secundária</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={template.secondary_color}
                      onChange={(e) => setTemplate({ ...template, secondary_color: e.target.value })}
                      style={{ width: '40px', height: '36px', padding: '2px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={template.secondary_color}
                      onChange={(e) => setTemplate({ ...template, secondary_color: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              {/* QR Size */}
              <div className="form-group">
                <label>Tamanho do QR Code: {template.qr_size}px</label>
                <input
                  type="range"
                  min={80}
                  max={300}
                  value={template.qr_size}
                  onChange={(e) => setTemplate({ ...template, qr_size: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={template.show_name}
                    onChange={(e) => setTemplate({ ...template, show_name: e.target.checked })}
                  />
                  Mostrar Nome
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={template.show_enrollment}
                    onChange={(e) => setTemplate({ ...template, show_enrollment: e.target.checked })}
                  />
                  Mostrar Matrícula
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={template.show_grade}
                    onChange={(e) => setTemplate({ ...template, show_grade: e.target.checked })}
                  />
                  Mostrar Série
                </label>
              </div>

              {/* Preview */}
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-hover, #f1f5f9)', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-muted)' }}>PRÉ-VISUALIZAÇÃO</p>
                <div style={{
                  background: template.background_image
                    ? `url(${template.background_image}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${template.primary_color}, ${template.secondary_color})`,
                  borderRadius: '12px', padding: '16px', textAlign: 'center', width: '240px', margin: '0 auto',
                  minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{template.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '10px', marginBottom: '8px' }}>{template.subtitle}</div>
                  <div style={{ background: 'white', padding: '4px', borderRadius: '6px', display: 'inline-block' }}>
                    <QRCodeSVG value="STUDENT:preview" size={template.qr_size * 0.5} />
                  </div>
                  {template.show_name && <div style={{ color: '#fff', fontWeight: 700, fontSize: '11px', marginTop: '8px' }}>Nome do Aluno</div>}
                  {template.show_enrollment && <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '9px' }}>Mat: 000000</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={templateSaving}>
                {templateSaving ? 'Salvando...' : 'Salvar Modelo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
