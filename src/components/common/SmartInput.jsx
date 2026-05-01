import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import SmartValidationModal from './SmartValidationModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartInput() {
  const { user } = useAuth();
  const { categories, partnership, addExpense, addIncome } = useData();
  const toast = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-CO';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setText(currentTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Error con el micrófono. Intenta escribir el texto.');
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (text.trim().length > 0) {
          handleAnalyze(text);
        }
      };
    } else {
      console.warn('SpeechRecognition API not supported in this browser.');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []); // Note: text might need to be tracked differently inside onend, using state might capture old value if not careful.

  // Helper to get latest text in onend
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [text]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.warning('Tu navegador no soporta entrada por voz. Puedes escribir tu registro.');
      setIsOpen(true);
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setText('');
      setIsOpen(true);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAnalyze = async (inputText) => {
    const textToProcess = inputText || text;
    if (!textToProcess.trim()) {
      toast.warning('No se detectó texto para procesar');
      return;
    }

    setIsProcessing(true);
    try {
      const categoryNames = categories.map(c => c.name);
      const { data, error } = await supabase.functions.invoke('process-transaction', {
        body: { text: textToProcess, categories: categoryNames }
      });

      if (error) throw error;
      
      if (data) {
        setParsedData(data);
      } else {
        throw new Error('Respuesta vacía de la IA');
      }
    } catch (err) {
      console.error('Error procesando texto:', err);
      toast.error('Error procesando tu petición. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
      if (recognitionRef.current) recognitionRef.current.stop();
    }
  };

  const handleConfirm = async (formData) => {
    try {
      const baseData = {
        amount: Number(formData.amount),
        category_id: formData.category_id,
        merchant: formData.merchant,
        description: formData.description,
        date: formData.date,
        user_id: user.id,
        partnership_id: partnership?.id
      };

      if (formData.type === 'expense') {
        await addExpense({
          ...baseData,
          expense_type: 'personal', // Default for smart input, user can edit later or we add it to the form
          cost_type: formData.cost_type || 'variable'
        });
        toast.success('Gasto registrado exitosamente');
      } else {
        await addIncome({
          ...baseData,
          income_type: 'personal' // Default
        });
        toast.success('Ingreso registrado exitosamente');
      }
      
      setParsedData(null);
      setIsOpen(false);
      setText('');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el registro');
    }
  };

  return (
    <>
      <div className="smart-input-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
        
        <AnimatePresence>
          {isOpen && !parsedData && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="glass-panel"
              style={{ width: '320px', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}
            >
              <div className="flex justify-between items-center mb-md">
                <h3 className="font-bold text-primary m-0 flex items-center gap-sm">
                  <span>🤖</span> Registro Inteligente
                </h3>
                <button onClick={() => { setIsOpen(false); setText(''); if(isRecording) recognitionRef.current?.stop(); }} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
              </div>
              
              <textarea 
                className="glass-input mb-md" 
                rows="3" 
                placeholder="Ej: Ayer gasté 30 lucas en uber..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isProcessing}
                style={{ resize: 'none' }}
              />

              <div className="flex gap-sm">
                <button 
                  className={`btn ${isRecording ? 'btn--danger animate-pulse' : 'btn--secondary'} flex-1`}
                  onClick={toggleRecording}
                  disabled={isProcessing}
                >
                  {isRecording ? '🛑 Detener' : '🎤 Hablar'}
                </button>
                <button 
                  className="btn btn--primary flex-1"
                  onClick={() => handleAnalyze(text)}
                  disabled={isProcessing || !text.trim()}
                >
                  {isProcessing ? '⏳ Procesando' : '✨ Analizar'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          className="fab-button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--accent-primary))',
            color: 'white', border: 'none', fontSize: '1.8rem',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s', transform: isOpen ? 'rotate(45deg)' : 'rotate(0)'
          }}
          title="Registro Inteligente"
        >
          {isOpen ? '+' : '🎤'}
        </button>
      </div>

      {parsedData && (
        <SmartValidationModal 
          parsedData={parsedData} 
          onClose={() => setParsedData(null)} 
          onConfirm={handleConfirm} 
        />
      )}
    </>
  );
}
