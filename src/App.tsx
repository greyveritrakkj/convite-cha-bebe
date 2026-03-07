import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { MapPin, Calendar, Clock, Baby, Star, Heart, CheckCircle2, Lock, ListOrdered, X, Users, LogOut } from 'lucide-react';

// ==========================================
// CONFIGURAÇÕES DO EVENTO (Fácil de editar)
// ==========================================
const EVENT_INFO = {
  babyName: "Miguel", // Nome do bebê
  title: "Chá de Bebê do", // Título antes do nome
  subtitle: "Estamos esperando você para celebrar esse momento especial!",
  message: "Com muito carinho, convidamos você para celebrar a chegada do nosso pequeno príncipe. Sua presença vai deixar esse momento ainda mais especial e inesquecível para nossa família.",
  location: "Chácara Capixaba - Av. Maria Caetano de Abreu, 230 - Jardim Cambiri, Ferraz de Vasconcelos - SP",
  date: "Sábado, 15 de Novembro",
  time: "15:00 às 19:00",
};

const ADMIN_PASSWORD = "admin";

interface RSVP {
  id: string;
  name: string;
  createdAt: Timestamp | null;
}

export default function App() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [rsvpsList, setRsvpsList] = useState<RSVP[]>([]);
  const [error, setError] = useState('');

  // Admin states
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Escutar o número de confirmações e a lista completa em tempo real
  useEffect(() => {
    const rsvpsRef = collection(db, 'rsvps');
    const q = query(rsvpsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRsvpCount(snapshot.size);

      const rsvpsData: RSVP[] = [];
      snapshot.forEach((doc) => {
        rsvpsData.push({ id: doc.id, ...doc.data() } as RSVP);
      });
      setRsvpsList(rsvpsData);
    }, (err) => {
      console.error("Erro ao carregar confirmações:", err);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, digite seu nome.');
      return;
    }
    if (name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'rsvps'), {
        name: name.trim(),
        createdAt: serverTimestamp()
      });
      setHasConfirmed(true);
    } catch (err) {
      console.error("Erro ao confirmar presença:", err);
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
        <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-10">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Convidados Confirmados</h1>
                <p className="text-slate-500 text-sm">Painel Administrativo do Chá de Bebê</p>
              </div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100/50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Total de confirmações:</span>
            <span className="bg-blue-500 text-white text-xl font-bold px-4 py-2 rounded-xl shadow-sm">
              {rsvpCount} pessoas
            </span>
          </div>

          {rsvpsList.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <ListOrdered size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Ninguém confirmou presença ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-400 text-sm uppercase tracking-wider">
                    <th className="pb-4 pl-4 font-medium">Nome do Convidado</th>
                    <th className="pb-4 font-medium">Data e Hora da Confirmação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rsvpsList.map((rsvp, index) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={rsvp.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                            {index + 1}
                          </div>
                          <span className="font-medium text-slate-700">{rsvp.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-slate-500 text-sm">
                        {formatDate(rsvp.createdAt)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN INVITATION RENDER

  return (
    <div className="min-h-screen bg-blue-50/50 font-sans text-slate-800 selection:bg-blue-200 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">

      {/* Botão Admin Secreto */}
      <button
        onClick={() => setShowAdminLogin(true)}
        className="fixed top-4 right-4 p-3 text-blue-200/50 hover:text-blue-400 hover:bg-blue-50 transition-all rounded-full z-50 opacity-50 hover:opacity-100"
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

          <h2 className="text-blue-400 font-medium tracking-widest uppercase text-sm mb-2">
            {EVENT_INFO.title}
          </h2>
          <h1 className="text-4xl sm:text-5xl font-serif text-blue-900 mb-3">
            {EVENT_INFO.babyName}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base px-4">
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
                <p className="text-slate-700 font-medium text-sm">{EVENT_INFO.date}</p>
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
                <p className="text-slate-700 font-medium text-sm">{EVENT_INFO.time}</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Área de Confirmação */}
        <div className="px-6 pb-8 pt-2">
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
                    placeholder="Digite seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all bg-white text-slate-700 placeholder:text-slate-400"
                    disabled={isSubmitting}
                  />

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
                        Confirmar Presença
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
                  <h3 className="text-lg font-medium text-slate-800 mb-1">Presença confirmada!</h3>
                  <p className="text-sm text-slate-500">Obrigado por confirmar sua presença 💙</p>
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
            <span className="text-sm">Total de confirmações:</span>
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
      <p className="absolute bottom-2 right-4 text-[10px] text-slate-300/50 uppercase tracking-widest font-mono select-none">
        Feito pelos Vritra
      </p>
    </div>
  );
}
