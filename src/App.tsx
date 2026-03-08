import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { MapPin, Calendar, Clock, Baby, Star, Heart, CheckCircle2, Lock, ListOrdered, X, Users, LogOut, PlusCircle, Trash2, Info } from 'lucide-react';

// ==========================================
// CONFIGURAÇÕES DO EVENTO (Fácil de editar)
// ==========================================
const EVENT_INFO = {
  babyName: "Luan Luiz", // Nome do bebê
  title: "Chá de Bebê do", // Título antes do nome
  subtitle: "Estamos esperando você para celebrar esse momento especial!",
  message: "Com muito carinho, convidamos você para celebrar a chegada do nosso pequeno príncipe. Sua presença vai deixar esse momento ainda mais especial e inesquecível para nossa família.",
  location: "Chácara Capixaba - Av. Maria Caetano de Abreu, 230 - Jardim Cambiri, Ferraz de Vasconcelos - SP",
  startAt: "2026-11-15T15:00:00-03:00",
  endAt: "2026-11-15T19:00:00-03:00",
};

const ADMIN_PASSWORD = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ADMIN_PASSWORD || "2013";
const MAX_CHILDREN = 3;
const EVENT_START = new Date(EVENT_INFO.startAt);
const EVENT_END = new Date(EVENT_INFO.endAt);
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(EVENT_INFO.location)}`;

const formatCalendarDate = (date: Date) => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const GOOGLE_CALENDAR_LINK =
  `https://calendar.google.com/calendar/render?action=TEMPLATE` +
  `&text=${encodeURIComponent(`${EVENT_INFO.title} ${EVENT_INFO.babyName}`)}` +
  `&details=${encodeURIComponent(EVENT_INFO.message)}` +
  `&location=${encodeURIComponent(EVENT_INFO.location)}` +
  `&dates=${formatCalendarDate(EVENT_START)}/${formatCalendarDate(EVENT_END)}`;

const formatEventDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

const formatEventTime = (startDate: Date, endDate: Date) => {
  const start = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(startDate);
  const end = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(endDate);
  return `${start} as ${end}`;
};

const normalizeGuestName = (rawName: string) => {
  return rawName.trim().replace(/\s+/g, ' ').toLowerCase();
};

interface Child {
  name: string;
  isUnder12: boolean;
}

type AttendanceStatus = 'yes' | 'no';

interface RSVP {
  id: string;
  name: string;
  status?: AttendanceStatus;
  childrenNames?: Child[];
  createdAt: Timestamp | null;
}

export default function App() {
  const [name, setName] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('yes');
  const [childrenInputs, setChildrenInputs] = useState<Child[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [rsvpsList, setRsvpsList] = useState<RSVP[]>([]);
  const [countdownText, setCountdownText] = useState('');
  const [error, setError] = useState('');

  // Admin states
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Escutar confirmações em tempo real (considerando apenas a última resposta por nome)
  useEffect(() => {
    const rsvpsRef = collection(db, 'rsvps');
    const q = query(rsvpsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalCount = 0;
      let totalDeclined = 0;
      const rsvpsData: RSVP[] = [];
      const processedNames = new Set<string>();

      snapshot.forEach((firestoreDoc) => {
        const data = firestoreDoc.data() as Omit<RSVP, 'id'>;
        const normalizedName = normalizeGuestName(data.name ?? '');
        if (!normalizedName || processedNames.has(normalizedName)) return;

        processedNames.add(normalizedName);
        const status: AttendanceStatus = data.status === 'no' ? 'no' : 'yes';
        const children = data.childrenNames ?? [];

        rsvpsData.push({
          id: firestoreDoc.id,
          ...data,
          status,
          childrenNames: children
        } as RSVP);

        if (status === 'yes') {
          // 1 adulto + filhos
          totalCount += 1 + children.length;
        } else {
          totalDeclined += 1;
        }
      });

      setRsvpsList(rsvpsData);
      setRsvpCount(totalCount);
      setDeclinedCount(totalDeclined);
    }, (err) => {
      console.error("Erro ao carregar confirmações:", err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const eventStartMs = EVENT_START.getTime();
    if (Number.isNaN(eventStartMs)) {
      setCountdownText('Data do evento invalida. Ajuste EVENT_INFO.startAt.');
      return;
    }

    const updateCountdown = () => {
      const diff = eventStartMs - Date.now();

      if (diff <= 0) {
        setCountdownText('O evento ja comecou. Te esperamos!');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;
      setCountdownText(`Faltam ${days} dias, ${hours}h, ${minutes}min e ${seconds}s para comecar.`);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        updateCountdown();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const handleAddChild = () => {
    if (attendanceStatus === 'no') {
      setError('Quem nao vai ao evento nao precisa cadastrar acompanhantes.');
      return;
    }
    if (childrenInputs.length >= MAX_CHILDREN) {
      setError(`Limite de ${MAX_CHILDREN} acompanhantes por convidado.`);
      return;
    }
    setError('');
    setChildrenInputs([...childrenInputs, { name: '', isUnder12: false }]);
  };

  const handleRemoveChild = (index: number) => {
    const updatedInputs = childrenInputs.filter((_, i) => i !== index);
    setChildrenInputs(updatedInputs);
  };

  const handleChildInputChange = (value: string, index: number, field: 'name' | 'isUnder12') => {
    const updatedInputs = [...childrenInputs];
    if (field === 'name') {
      updatedInputs[index].name = value;
    } else {
      updatedInputs[index].isUnder12 = value === 'true';
    }
    setChildrenInputs(updatedInputs);
  };

  const handleStatusChange = (status: AttendanceStatus) => {
    setAttendanceStatus(status);
    setError('');
    if (status === 'no') {
      setChildrenInputs([]);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, digite seu nome principal.');
      return;
    }
    if (name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    if (attendanceStatus === 'yes' && childrenInputs.length > MAX_CHILDREN) {
      setError(`Limite de ${MAX_CHILDREN} acompanhantes por convidado.`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Filtra os inputs de filhos vazios antes de salvar
    const validChildrenNames = attendanceStatus === 'yes'
      ? childrenInputs
        .filter(child => child.name.trim().length > 0)
        .map(child => ({ ...child, name: child.name.trim() }))
      : [];

    const basePayload = {
      name: name.trim(),
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'rsvps'), {
        ...basePayload,
        status: attendanceStatus,
        childrenNames: validChildrenNames
      });
      setHasConfirmed(true);
    } catch (err) {
      console.error("Erro ao confirmar presenca:", err);
      setError('Ocorreu um erro ao confirmar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuth(true);
      setShowAdminLogin(false);
      setAdminError('');
    } else {
      setAdminError('Senha incorreta.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuth(false);
    setAdminPassword('');
  };

  const handleDeleteRSVP = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja apagar a confirmação de ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'rsvps', id));
      } catch (err) {
        console.error("Erro ao deletar:", err);
        alert("Ocorreu um erro ao apagar essa confirmação.");
      }
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  // ADMIN DASHBOARD RENDER
  if (isAdminAuth) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 sm:p-8 flex flex-col items-center">
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-5 sm:p-8 lg:p-10">
          <div className="flex justify-between items-start sm:items-center mb-8 border-b border-slate-100 pb-6 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">Convidados Confirmados</h1>
                <p className="text-slate-500 text-sm">Painel Administrativo do Chá de Bebê</p>
              </div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors px-4 py-2 rounded-lg hover:bg-red-50 shrink-0"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Confirmados:</span>
              <span className="bg-blue-500 text-white text-lg font-bold px-3 py-1.5 rounded-xl shadow-sm">
                {rsvpCount} pessoas
              </span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Nao poderao ir:</span>
              <span className="bg-slate-500 text-white text-lg font-bold px-3 py-1.5 rounded-xl shadow-sm">
                {declinedCount}
              </span>
            </div>
          </div>

          {rsvpsList.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <ListOrdered size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Ninguém confirmou presença ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rsvpsList.map((rsvp, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  key={rsvp.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                          Convidado principal
                        </p>
                        <p className="font-semibold text-slate-800 leading-snug break-words">
                          {rsvp.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRSVP(rsvp.id, rsvp.name)}
                      className="self-start p-2 text-red-400 bg-red-50/70 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors shadow-sm"
                      title={`Apagar confirmacao de ${rsvp.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Status</p>
                      {rsvp.status === 'no' ? (
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Nao poderei ir
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Vou comparecer
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Acompanhantes</p>
                      {rsvp.status !== 'no' && rsvp.childrenNames && rsvp.childrenNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {rsvp.childrenNames.map((child, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                              {child.name}
                              {child.isUnder12 && (
                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Menor de 12 anos">
                                  -12
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {rsvp.status === 'no' ? 'Nao se aplica' : 'Nenhum acompanhante'}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">Enviado em</p>
                      <p className="text-sm font-medium text-slate-700">{formatDate(rsvp.createdAt)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN INVITATION RENDER

  return (
    <div className="min-h-screen bg-blue-50/50 font-sans text-slate-800 selection:bg-blue-200 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Container principal */}

      {/* Botão Admin Secreto */}
      <button
        onClick={() => setShowAdminLogin(true)}
        className="fixed top-4 right-4 p-3 text-slate-400 bg-white/60 backdrop-blur-sm border border-slate-200/50 shadow-sm hover:text-blue-500 hover:bg-white transition-all rounded-full z-50 opacity-90 hover:opacity-100"
        title="Área Administrativa"
      >
        <Lock size={18} />
      </button>

      {/* Modal de Login Admin */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button
                onClick={() => { setShowAdminLogin(false); setAdminError(''); setAdminPassword(''); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>

              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-6">Acesso Administrativo</h3>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Digite a senha"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
                    autoFocus
                  />
                  {adminError && <p className="text-red-400 text-xs mt-2">{adminError}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Entrar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elementos decorativos de fundo */}
      <div className="absolute top-10 left-10 text-amber-300/30 animate-pulse"><Star size={40} /></div>
      <div className="absolute top-20 right-16 text-amber-300/30 animate-pulse delay-75"><Star size={24} /></div>
      <div className="absolute bottom-20 left-1/4 text-amber-300/30 animate-pulse delay-150"><Star size={32} /></div>
      <div className="absolute top-1/3 right-10 text-amber-300/30 animate-pulse delay-300"><Star size={48} /></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 overflow-hidden relative z-10 border border-blue-100"
      >
        {/* Cabeçalho */}
        <div className="bg-gradient-to-b from-blue-100/80 to-white pt-12 pb-8 px-6 text-center relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-md shadow-blue-200/50 mb-4 text-blue-400"
          >
            <Baby size={40} strokeWidth={1.5} />
          </motion.div>

          <h2 className="text-blue-400 font-bold tracking-widest uppercase text-xs mb-3">
            {EVENT_INFO.title}
          </h2>
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 mb-4 drop-shadow-sm leading-tight pb-1">
            {EVENT_INFO.babyName}
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base px-4">
            {EVENT_INFO.subtitle}
          </p>
        </div>

        {/* Mensagem */}
        <div className="px-6 py-4 text-center">
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base italic">
            "{EVENT_INFO.message}"
          </p>
        </div>

        {/* Informações do Evento */}
        <div className="px-6 py-6 space-y-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-4 shrink-0">
              <MapPin size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Local</p>
              <p className="text-slate-700 font-medium text-sm">{EVENT_INFO.location}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3 shrink-0">
                <Calendar size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Data</p>
                <p className="text-slate-700 font-medium text-sm capitalize">{formatEventDate(EVENT_START)}</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3 shrink-0">
                <Clock size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Horário</p>
                <p className="text-slate-700 font-medium text-sm">{formatEventTime(EVENT_START, EVENT_END)}</p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-2.5 px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              <MapPin size={16} />
              Abrir no Maps
            </a>
            <a
              href={GOOGLE_CALENDAR_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-2.5 px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              <Calendar size={16} />
              Adicionar no Google Agenda
            </a>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {countdownText}
          </div>
        </div>

        {/* Área de Confirmação */}
        <div className="px-6 pb-8 pt-2">

          {/* Alerta Convidado não Convida */}
          <div className="mb-4 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 flex items-start gap-3 shadow-sm">
            <div className="text-amber-500 mt-0.5"><Users size={18} /></div>
            <div>
              <p className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-0.5">Lembrete Importante</p>
              <p className="text-xs text-amber-600 leading-relaxed font-medium">A nossa lista é restrita e planejada com muito carinho. Por favor, lembre-se: <b>Convidado não convida!</b></p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner">
            <AnimatePresence mode="wait">
              {!hasConfirmed ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleConfirm}
                  className="flex flex-col gap-3"
                >
                  <h3 className="text-center font-medium text-slate-700 mb-2">Confirme sua presença</h3>

                  <input
                    type="text"
                    placeholder="Nome completo do convidado principal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all bg-white text-slate-700 placeholder:text-slate-400 font-medium"
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('yes')}
                      disabled={isSubmitting}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors ${attendanceStatus === 'yes'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Vou comparecer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('no')}
                      disabled={isSubmitting}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors ${attendanceStatus === 'no'
                        ? 'bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Nao poderei ir
                    </button>
                  </div>

                  {/* Campos Dinâmicos de Filhos */}
                  {attendanceStatus === 'yes' && (
                    <div className="flex flex-col gap-2 mt-2">
                    {childrenInputs.length > 0 && (
                      <label className="text-xs font-medium text-slate-500 ml-1 uppercase tracking-wider">
                        Filhos acompanhantes:
                      </label>
                    )}

                    <AnimatePresence>
                      {childrenInputs.map((child, index) => (
                        <motion.div
                          key={`child-${index}`}
                          initial={{ opacity: 0, height: 0, scale: 0.9 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.9 }}
                          className="flex flex-col gap-2 p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`Nome do filho(a) ${index + 1}`}
                              value={child.name}
                              onChange={(e) => handleChildInputChange(e.target.value, index, 'name')}
                              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all bg-white text-slate-700 placeholder:text-slate-400 text-sm"
                              disabled={isSubmitting}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveChild(index)}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-white border border-slate-200"
                              disabled={isSubmitting}
                              title="Remover filho"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer ml-1 select-none group">
                            <div className="relative flex items-center justify-center w-5 h-5">
                              <input
                                type="checkbox"
                                checked={child.isUnder12}
                                onChange={(e) => handleChildInputChange(e.target.checked.toString(), index, 'isUnder12')}
                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-blue-500 checked:border-blue-500 transition-colors"
                                disabled={isSubmitting}
                              />
                              <CheckCircle2 size={16} className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                            </div>
                            <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                              Tem menos de 12 anos?
                            </span>
                          </label>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                      <div className="text-blue-400 mt-0.5"><Info size={16} /></div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Se você for levar seus filhos ou menores responsáveis, clique no botão <span className="font-semibold text-blue-500">"+"</span> abaixo para cadastrar o nome de cada um deles na lista de convidados.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-500 font-medium rounded-xl text-sm transition-colors border border-blue-100/50 border-dashed hover:border-solid disabled:opacity-50"
                      disabled={isSubmitting || childrenInputs.length >= MAX_CHILDREN}
                    >
                      <PlusCircle size={16} />
                      {childrenInputs.length === 0 ? "Adicionar um Filho (opcional)" : "Adicionar outro filho"}
                    </button>
                    {childrenInputs.length >= MAX_CHILDREN && (
                      <p className="text-[11px] text-slate-500 text-center">
                        Limite de {MAX_CHILDREN} acompanhantes por convidado.
                      </p>
                    )}
                  </div>
                  )}

                  {error && (
                    <p className="text-red-400 text-xs text-center">{error}</p>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-400 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-md shadow-blue-400/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Confirmando...</span>
                    ) : (
                      <>
                        <Heart size={18} className="fill-white/20" />
                        {attendanceStatus === 'yes' ? 'Confirmar Presença' : 'Enviar resposta'}
                      </>
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4 flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-1">
                    {attendanceStatus === 'yes' ? 'Presença confirmada!' : 'Resposta registrada!'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {attendanceStatus === 'yes' ? 'Obrigado por confirmar sua presença.' : 'Obrigado por avisar com antecedência.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contador */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center flex items-center justify-center gap-2 text-slate-500"
          >
            <span className="text-sm">Total de confirmados:</span>
            <span className="bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded-full text-sm">
              {rsvpCount}
            </span>
          </motion.div>
        </div>
      </motion.div>

      <p className="mt-8 text-slate-400 text-xs text-center max-w-xs">
        Esperamos você nesse momento especial!
      </p>

      {/* Créditos */}
      <p className="absolute bottom-2 right-4 text-[10px] text-slate-400 uppercase tracking-widest font-mono select-none">
        Feito pelos Vritra
      </p>
    </div>
  );
}
