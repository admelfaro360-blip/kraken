import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Edit, 
  Copy, 
  FileDown, 
  X, 
  Globe, 
  Calendar, 
  User, 
  Check, 
  Phone, 
  MapPin, 
  Clipboard, 
  Hash,
  Laptop,
  Smartphone,
  Bold,
  Italic,
  Underline,
  List,
  Heading1,
  Heading2,
  Minus,
  Eraser
} from 'lucide-react';
import { getStoredClients, fetchAgreements, saveAgreement, deleteAgreement } from '../lib/storage';
import { Client, ClientAgreement } from '../types';
import { generateAgreementPDF } from '../lib/pdfGenerator';
import { toast } from 'sonner';

const DEFAULT_TEMPLATES = {
  pt: `# DESCRIÇÃO DOS TRABALHOS:
• **Corte e poda** de pinheiros, sebes e árvores existentes dentro da propriedade;
• **Trabalhos em altura**;
• Visita de manutenção com frequência de **uma vez por semana**;
• Regulação e ajuste do sistema de rega;
• Controlo da dureza da água e monitorização do pH.

---

# CONDIÇÕES E GARANTIAS:
Este convénio contempla os trabalhos descritos acima. Qualquer trabalho adicional não previsto deverá ser avaliado e orçamentado separadamente.

Todo o pessoal afeto aos trabalhos encontra-se devidamente coberto por:
• **Seguro de Acidentes Pessoais**;
• **Seguro de Responsabilidade Civil**.

*Obrigado,*
**Kraken Handyman**`,

  es: `# DESCRIPCIÓN DE LOS TRABAJOS:
• **Corte y poda** de pinos, setos y árboles existentes dentro de la propiedad;
• **Trabajos en altura**;
• Visita de mantenimiento con frecuencia de **una vez por semana**;
• Regulación y ajuste del sistema de riego;
• Control de la dureza del agua y monitoreo del pH.

---

# CONDICIONES Y GARANTÍAS:
Este convenio contempla los trabajos descritos anteriormente. Cualquier trabajo adicional no previsto será evaluado y presupuestado por separado.

Todo el personal asignado a los trabajos se encuentra debidamente cubierto por:
• **Seguro de Accidentes Personales**;
• **Seguro de Responsabilidad Civil**.

*Atentamente,*
**Kraken Handyman**`,

  en: `# DESCRIPTION OF WORKS:
• **Cutting and pruning** of pines, hedges and trees inside the property;
• **High-altitude works**;
• Maintenance visit with a frequency of **once a week**;
• Regulation and adjustment of the irrigation system;
• Water hardness control and pH monitoring.

---

# TERMS & GUARANTEES:
This agreement covers the works described above. Any additional work not specified will be evaluated and quoted separately.

All personnel assigned to the works are fully covered by:
• **Personal Accident Insurance**;
• **Public Liability Insurance**.

*Best regards,*
**Kraken Handyman**`
};

const SPANISH_WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const NORMALIZE_DAYS_MAP: Record<string, string> = {
  'segunda': 'Lunes', 'terça': 'Martes', 'quarta': 'Miércoles', 'quinta': 'Jueves', 'sexta': 'Viernes', 'sábado': 'Sábado', 'domingo': 'Domingo',
  'segunda-feira': 'Lunes', 'terça-feira': 'Martes', 'quarta-feira': 'Miércoles', 'quinta-feira': 'Jueves', 'sexta-feira': 'Viernes',
  'lunes': 'Lunes', 'martes': 'Martes', 'miércoles': 'Miércoles', 'miercoles': 'Miércoles', 'jueves': 'Jueves', 'viernes': 'Viernes', 'sabado': 'Sábado',
  'monday': 'Lunes', 'tuesday': 'Martes', 'wednesday': 'Miércoles', 'thursday': 'Jueves', 'friday': 'Viernes', 'saturday': 'Sábado', 'sunday': 'Domingo',
  'mon': 'Lunes', 'tue': 'Martes', 'wed': 'Miércoles', 'thu': 'Jueves', 'fri': 'Viernes', 'sat': 'Sábado', 'sun': 'Domingo'
};

const translateToSpanish = (day: string): string => {
  return NORMALIZE_DAYS_MAP[day.toLowerCase().trim()] || day;
};

export default function Agreements() {
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<ClientAgreement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [langFilter, setLangFilter] = useState<'All' | 'pt' | 'es' | 'en'>('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<ClientAgreement | null>(null);

  // App-level copied agreement content helper
  const [appCopiedText, setAppCopiedText] = useState<string>(() => {
    return localStorage.getItem('kraken_copied_agreement_text') || '';
  });

  // Form Fields State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isManualClient, setIsManualClient] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientContact, setClientContact] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [weeksToWork, setWeeksToWork] = useState(12);
  const [agreementLanguage, setAgreementLanguage] = useState<'es' | 'en' | 'pt'>('pt'); // Default to portuguese
  const [agreementContent, setAgreementContent] = useState('');

  // Loaded at mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storedAgreements, storedClients] = await Promise.all([
        fetchAgreements(),
        getStoredClients()
      ]);
      // Sort agreements by creation date descending
      storedAgreements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAgreements(storedAgreements);
      setClients(storedClients);
    } catch (e) {
      toast.error('Error al cargar datos del módulo de convenios.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill fields when client is selected
  useEffect(() => {
    if (selectedClientId && !isManualClient) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setClientName(client.name);
        setClientAddress(client.address);
        setClientPhone(client.phone);
        setClientEmail(client.email || '');
        setClientNif('');
        setClientContact('');
      }
    }
  }, [selectedClientId, isManualClient, clients]);

  // Handle template selection based on language if content is empty or default
  const applyDefaultTemplate = (lang: 'es' | 'en' | 'pt') => {
    setAgreementContent(DEFAULT_TEMPLATES[lang]);
    toast.success('¡Modelo estándar aplicado!');
  };

  const openCreateModal = () => {
    setEditingAgreement(null);
    setSelectedClientId('');
    setIsManualClient(false);
    
    setClientName('');
    setClientAddress('');
    setClientPhone('');
    setClientEmail('');
    setClientNif('');
    setClientContact('');

    // Default dates (Today and Today + 1 Year)
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextYear.toISOString().split('T')[0]);
    
    setSelectedWeekdays(['Lunes', 'Miércoles', 'Viernes']); // default to Spanish weekdays
    setWeeksToWork(52); // default to 52 weeks (1 year)
    setAgreementLanguage('pt'); // Default Portuguese
    setAgreementContent(DEFAULT_TEMPLATES.pt); // Default Portuguese clauses

    setIsModalOpen(true);
  };

  const openEditModal = (agreement: ClientAgreement) => {
    setEditingAgreement(agreement);
    setSelectedClientId(agreement.clientId || '');
    setIsManualClient(!agreement.clientId);

    setClientName(agreement.clientData.name);
    setClientAddress(agreement.clientData.address);
    setClientPhone(agreement.clientData.phone);
    setClientEmail(agreement.clientData.email);
    setClientNif(agreement.clientData.nif || '');
    setClientContact(agreement.clientData.contact || '');

    setStartDate(agreement.startDate);
    setEndDate(agreement.endDate);
    
    // Normalize any existing legacy weekdays to Spanish
    const normalizedDays = (agreement.weekdays || []).map(translateToSpanish);
    setSelectedWeekdays(normalizedDays);
    
    setWeeksToWork(agreement.weeksToWork || 52);
    setAgreementLanguage(agreement.language || 'pt');
    setAgreementContent(agreement.content || '');

    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Por favor, ingrese el nombre del cliente.');
      return;
    }

    const agreementId = editingAgreement ? editingAgreement.id : `conv-${Date.now()}`;
    const newAgreement: ClientAgreement = {
      id: agreementId,
      clientId: isManualClient ? undefined : selectedClientId || undefined,
      clientData: {
        name: clientName,
        address: clientAddress,
        phone: clientPhone,
        email: clientEmail,
        nif: clientNif,
        contact: clientContact
      },
      startDate,
      endDate,
      weekdays: selectedWeekdays,
      weeksToWork,
      language: agreementLanguage,
      content: agreementContent,
      createdAt: editingAgreement ? editingAgreement.createdAt : new Date().toISOString()
    };

    try {
      await saveAgreement(newAgreement);
      toast.success(editingAgreement ? '¡Convenio actualizado con éxito!' : '¡Convenio creado con éxito!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al guardar el convenio.');
    }
  };

  const handleDeleteAgreement = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar el convenio de "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteAgreement(id);
      toast.success('¡Convenio eliminado!');
      setAgreements(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      toast.error('Error al eliminar el convenio.');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    localStorage.setItem('kraken_copied_agreement_text', text);
    setAppCopiedText(text);
    toast.success('¡Cláusulas copiadas al portapapeles!');
  };

  const handlePasteText = () => {
    if (appCopiedText) {
      setAgreementContent(appCopiedText);
      toast.success('¡Cláusulas pegadas con éxito!');
    } else {
      toast.error('No hay ningún texto de convenio guardado en memoria.');
    }
  };

  const handleDownloadPdf = async (agreement: ClientAgreement, type: 'pc' | 'mobile') => {
    try {
      const doc = await generateAgreementPDF(agreement, type);
      const suffix = type === 'mobile' ? 'celular' : 'desktop';
      doc.save(`convenio_${agreement.clientData.name.toLowerCase().replace(/\s+/g, '_')}_${suffix}.pdf`);
      toast.success(`¡PDF (${type === 'mobile' ? 'Celular' : 'Escritorio'}) descargado con éxito!`);
    } catch (e) {
      console.error('PDF Generation Error:', e);
      toast.error('Error al generar el PDF del convenio.');
    }
  };

  // Toggle weekday selection
  const handleToggleWeekday = (day: string) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(prev => prev.filter(d => d !== day));
    } else {
      setSelectedWeekdays(prev => [...prev, day]);
    }
  };

  // Formatting helpers for mini rich-text editor
  const handleInsertFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('agreement-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const replacement = prefix + (selectedText || '') + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    setAgreementContent(newContent);
    
    // Refocus and place cursor elegantly
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const handleClearFormat = () => {
    const textarea = document.getElementById('agreement-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const clearMarkdown = (val: string) => {
      return val
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/^#\s+/gm, '')
        .replace(/^##\s+/gm, '')
        .replace(/^•\s+/gm, '')
        .replace(/^\*\s+/gm, '')
        .replace(/^-\s+/gm, '');
    };

    if (selectedText) {
      const cleaned = clearMarkdown(selectedText);
      const newContent = text.substring(0, start) + cleaned + text.substring(end);
      setAgreementContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + cleaned.length);
      }, 50);
    } else {
      const cleaned = clearMarkdown(text);
      setAgreementContent(cleaned);
      toast.success('Formato limpiado de todo el texto.');
    }
  };

  const filteredAgreements = agreements.filter(a => {
    const matchesSearch = 
      a.clientData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.clientData.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLang = langFilter === 'All' || a.language === langFilter;
    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-neutral-900 dark:text-neutral-100">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">Convenios</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestionar convenios, contratos y cláusulas de clientes en varios idiomas.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-kraken-orange text-white font-extrabold rounded-2xl hover:bg-orange-600 transition-all duration-300 shadow-xl shadow-kraken-orange/20"
        >
          <Plus size={20} />
          <span>Nuevo Convenio</span>
        </button>
      </header>

      {/* Filter and search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, dirección o cláusulas..."
            className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-kraken-orange focus:border-transparent text-sm text-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-neutral-400 hidden sm:block" />
          <div className="flex bg-neutral-50 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
            {(['All', 'pt', 'es', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLangFilter(lang)}
                className={`px-4 py-2 text-xs font-black rounded-lg uppercase transition-all ${
                  langFilter === lang
                    ? 'bg-kraken-orange text-white shadow-md'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {lang === 'All' ? 'Todos' : lang === 'pt' ? 'PT' : lang === 'es' ? 'ES' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kraken-orange"></div>
        </div>
      ) : filteredAgreements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgreements.map((agreement) => {
            const formattedLang = agreement.language === 'pt' ? 'Portugués' : agreement.language === 'es' ? 'Español' : 'English';
            return (
              <div 
                key={agreement.id} 
                className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800/80 rounded-3xl p-6 flex flex-col justify-between gap-6 shadow-sm hover:border-kraken-orange/40 transition-all duration-350"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-black text-kraken-orange bg-orange-500/10 px-2.5 py-1 rounded-full tracking-wider">
                        {formattedLang}
                      </span>
                      <h3 className="font-extrabold text-lg text-neutral-900 dark:text-white mt-2 leading-tight">
                        {agreement.clientData.name}
                      </h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEditModal(agreement)}
                        className="p-2 text-neutral-500 hover:text-kraken-orange dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
                        title="Editar Convenio"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAgreement(agreement.id, agreement.clientData.name)}
                        className="p-2 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
                        title="Eliminar Convenio"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-2.5 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-neutral-400 shrink-0" />
                      <span>{agreement.startDate} hasta {agreement.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{agreement.clientData.address || 'Sin dirección'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clipboard size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate"><b>Días:</b> {agreement.weekdays?.map(translateToSpanish).join(', ') || 'No especificados'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-neutral-400 shrink-0" />
                      <span>{agreement.weeksToWork} semanas de trabajo</span>
                    </div>
                  </div>

                  {/* Snippet of agreement content */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">Cláusulas</h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-4 italic whitespace-pre-line bg-neutral-50/50 dark:bg-neutral-950/20 p-3 rounded-xl border border-neutral-100 dark:border-neutral-850">
                      "{agreement.content}"
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-850 pt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyText(agreement.content)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
                    >
                      <Copy size={13} />
                      <span>Copiar Cláusulas</span>
                    </button>
                    <span className="text-[10px] text-neutral-400">Creado: {new Date(agreement.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => handleDownloadPdf(agreement, 'pc')}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-extrabold text-white bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-750 transition-colors rounded-xl shadow-sm"
                    >
                      <Laptop size={13} />
                      <span>PDF Escritorio</span>
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(agreement, 'mobile')}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-extrabold text-white bg-kraken-orange hover:bg-orange-600 transition-colors rounded-xl shadow-sm"
                    >
                      <Smartphone size={13} />
                      <span>PDF Celular</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-150 dark:border-neutral-800 shadow-sm p-8">
          <FileText className="text-neutral-300 dark:text-neutral-700 mb-4 animate-bounce" size={64} />
          <h3 className="text-xl font-bold text-neutral-800 dark:text-white">No se encontraron convenios</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 max-w-md">No se encontraron convenios con los filtros aplicados. ¡Haga clic en el botón "Nuevo Convenio" en la parte superior para crear su primer documento!</p>
        </div>
      )}

      {/* New / Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                  {editingAgreement ? 'Editar Convenio' : 'Nuevo Convenio'}
                </h2>
                <p className="text-xs text-neutral-500">Complete los datos del cliente, las fechas de validez y las cláusulas.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all text-neutral-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Client Selection Header */}
              <div className="bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-150 dark:border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-black uppercase text-neutral-500 tracking-wider mb-2">Seleccionar Cliente del Sistema</label>
                    <select
                      value={selectedClientId}
                      disabled={isManualClient}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-kraken-orange text-sm disabled:opacity-50 text-neutral-900 dark:text-neutral-100"
                    >
                      <option value="">-- Seleccionar Cliente Existente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6 sm:pt-0">
                    <input
                      type="checkbox"
                      id="manualCheckbox"
                      checked={isManualClient}
                      onChange={(e) => {
                        setIsManualClient(e.target.checked);
                        if (e.target.checked) {
                          setSelectedClientId('');
                          setClientName('');
                          setClientAddress('');
                          setClientPhone('');
                          setClientEmail('');
                          setClientNif('');
                          setClientContact('');
                        }
                      }}
                      className="h-5 w-5 rounded border-neutral-300 text-kraken-orange focus:ring-kraken-orange"
                    />
                    <label htmlFor="manualCheckbox" className="text-sm font-bold text-neutral-700 dark:text-neutral-300 select-none cursor-pointer">
                      Introducir datos manualmente
                    </label>
                  </div>
                </div>

                {/* Grid for client details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase">Nombre del Cliente *</label>
                    <input
                      type="text"
                      value={clientName}
                      disabled={!isManualClient && !!selectedClientId}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej: Casa de la Torre, Lda."
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm disabled:opacity-75 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase">Dirección / Domicilio</label>
                    <input
                      type="text"
                      value={clientAddress}
                      disabled={!isManualClient && !!selectedClientId}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="Ej: Calle Cruz Galvão, Apartado 200"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm disabled:opacity-75 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase">NIF / Identificación Fiscal</label>
                    <input
                      type="text"
                      value={clientNif}
                      onChange={(e) => setClientNif(e.target.value)}
                      placeholder="Ej: 501 890 815"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase">Contacto Responsable</label>
                    <input
                      type="text"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      placeholder="Ej: Ivo García"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase">Teléfono / Celular</label>
                    <input
                      type="text"
                      value={clientPhone}
                      disabled={!isManualClient && !!selectedClientId}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ej: 926 623 169"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm disabled:opacity-75 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase">Email / Correo Electrónico</label>
                    <input
                      type="email"
                      value={clientEmail}
                      disabled={!isManualClient && !!selectedClientId}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="Ej: cliente@email.com"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm disabled:opacity-75 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>
              </div>

              {/* Validity and Scheduling options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-150 dark:border-neutral-800">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Período de Validez</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-600">Fecha de Inicio</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-600">Fecha de Fin</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-600">Semanas a Trabajar</label>
                    <input
                      type="number"
                      value={weeksToWork}
                      onChange={(e) => setWeeksToWork(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Ej: 52"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-kraken-orange text-sm text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Frecuencia Semanal (Días de Trabajo)</h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SPANISH_WEEKDAYS.map((day) => {
                      const isSelected = selectedWeekdays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => handleToggleWeekday(day)}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-kraken-orange text-white border-kraken-orange shadow-sm'
                              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-neutral-400 italic">Seleccione los días de la semana en los que se realizarán las actividades programadas de mantenimiento.</p>
                </div>
              </div>

              {/* Language Selection and Free Text Clauses with Editor Toolbar */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <label className="block text-xs font-black uppercase text-neutral-500 tracking-wider">Idioma del Convenio</label>
                    <div className="flex bg-neutral-50 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-150 dark:border-neutral-800 w-fit">
                      {(['pt', 'es', 'en'] as const).map((lang) => (
                        <button
                          type="button"
                          key={lang}
                          onClick={() => {
                            setAgreementLanguage(lang);
                            // Pre-fill content if currently matches a default template to help the user
                            if (Object.values(DEFAULT_TEMPLATES).includes(agreementContent)) {
                              setAgreementContent(DEFAULT_TEMPLATES[lang]);
                            }
                          }}
                          className={`px-4 py-2 text-xs font-black rounded-lg uppercase transition-all ${
                            agreementLanguage === lang
                              ? 'bg-kraken-orange text-white'
                              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          {lang === 'pt' ? 'Portugués 🇵🇹' : lang === 'es' ? 'Español 🇪🇸' : 'Inglés 🇬🇧'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-5">
                    <button
                      type="button"
                      onClick={() => applyDefaultTemplate(agreementLanguage)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 rounded-xl transition-all border border-neutral-200 dark:border-neutral-700"
                    >
                      <span>Cargar Modelo Estándar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteText}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white bg-neutral-900 dark:bg-neutral-850 hover:bg-neutral-800 dark:hover:bg-neutral-750 rounded-xl transition-all"
                    >
                      <span>Pegar Cláusulas Copiadas</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-neutral-500 tracking-wider">Texto del Convenio y Cláusulas</label>
                  
                  {/* Modern Formatting Mini-Editor Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 bg-neutral-50 dark:bg-neutral-950 p-2 rounded-t-2xl border border-b-0 border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('**', '**')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Negrita"
                    >
                      <Bold size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('*', '*')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Cursiva"
                    >
                      <Italic size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('__', '__')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Subrayado"
                    >
                      <Underline size={16} />
                    </button>
                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('# ')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Título Grande (H1)"
                    >
                      <Heading1 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('## ')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Título Mediano (H2)"
                    >
                      <Heading2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('• ')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Viñeta (Lista)"
                    >
                      <List size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('---')}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-600 dark:text-neutral-300 transition-all"
                      title="Línea Separadora"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
                    <button
                      type="button"
                      onClick={handleClearFormat}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-neutral-500 hover:text-red-500 transition-all"
                      title="Limpiar Formato"
                    >
                      <Eraser size={16} />
                    </button>
                  </div>

                  <textarea
                    id="agreement-textarea"
                    value={agreementContent}
                    onChange={(e) => setAgreementContent(e.target.value)}
                    rows={12}
                    placeholder="Escriba aquí el acuerdo, los términos y las cláusulas específicas del convenio..."
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-b-2xl focus:outline-none focus:ring-2 focus:ring-kraken-orange text-sm font-mono whitespace-pre-line leading-relaxed text-neutral-900 dark:text-neutral-100"
                  />
                  <div className="flex justify-between items-center text-[10px] text-neutral-400">
                    <span>* Admite saltos de línea para crear párrafos elegantes en el PDF. Soporta formato en tiempo real.</span>
                    <span>{agreementContent.length} caracteres</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-kraken-orange hover:bg-orange-600 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-kraken-orange/15"
                >
                  Guardar Convenio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
