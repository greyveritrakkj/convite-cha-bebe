import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { MapPin, Calendar, Clock, Baby, Star, Heart, CheckCircle2 } from 'lucide-react';

// ==========================================
// CONFIGURAÇÕES DO EVENTO (Fácil de editar)
// ==========================================
const EVENT_INFO = {
  babyName: "Miguel", // Nome do bebê
  title: "Chá de Bebê do", // Título antes do nome
  subtitle: "Estamos esperando você para celebrar esse momento especial!",
  message: "Com muito carinho, convidamos você para celebrar a chegada do nosso pequeno príncipe. Sua presença vai deixar esse momento ainda mais especial e inesquecível para nossa família.",
  location: "Chácara Capixaba",
  date: "Sábado, 15 de Novembro",
  time: "15:00 às 19:00",
};

export default function App() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [error, setError] = useState('');

  // Escutar o número de confirmações em tempo real
  useEffect(() => {
    const rsvpsRef = collection(db, 'rsvps');
    const q = query(rsvpsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRsvpCount(snapshot.size);
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

  return (
    <div className="min-h-screen bg-blue-50/50 font-sans text-slate-800 selection:bg-blue-200 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      
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
    </div>
  );
}
