import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, X, Volume2 } from "lucide-react";

export default function GlobalNotification({ notification, onClose, isMuted = false }) {
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    if (notification) {
      // Tocar som de alerta estilo aeroporto (apenas se não estiver mudo)
      if (!isMuted) {
        playAirportAnnouncementSound();
        
        // Esperar 1.5 segundos (após o ding-dong) e então iniciar a leitura por voz
        setTimeout(() => {
          speakNotification();
        }, 1500);
      }
      
      // Limpar timer anterior se existir
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Fechar automaticamente após 30 segundos
      timerRef.current = setTimeout(() => {
        onClose();
      }, 30000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        // Limpar contexto de áudio ao desmontar
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        // Cancelar fala se estiver em andamento
        if (speechRef.current) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [notification, isMuted]);

  const speakNotification = () => {
    try {
      // Verificar se o navegador suporta síntese de voz
      if (!('speechSynthesis' in window)) {
        console.log('Síntese de voz não suportada neste navegador');
        return;
      }

      // Cancelar qualquer fala em andamento
      window.speechSynthesis.cancel();

      // Aguardar um momento para garantir que as vozes foram carregadas
      const loadVoicesAndSpeak = () => {
        // Criar o texto a ser lido
        let textoParaLer = '';
        
        if (notification.type === 'liberado') {
          textoParaLer = `Atenção! Equipamento liberado. ${notification.codigo} está liberado para operação. Repito: equipamento ${notification.codigo} liberado para operação.`;
        } else {
          const tipoManutencao = notification.tipo === 'preventiva' ? 'manutenção preventiva' : 'manutenção corretiva';
          textoParaLer = `Atenção! Equipamento parado. ${notification.codigo} está parado para ${tipoManutencao}. Motivo: ${notification.descricao}. Repito: equipamento ${notification.codigo} parado para ${tipoManutencao}.`;
        }

        // Criar utterance (fala)
        const utterance = new SpeechSynthesisUtterance(textoParaLer);
        speechRef.current = utterance;

        // Obter todas as vozes disponíveis
        const voices = window.speechSynthesis.getVoices();
        
        console.log('Vozes disponíveis:', voices.map(v => `${v.name} (${v.lang})`));

        // Priorizar voz masculina em Português do Brasil
        let selectedVoice = null;

        // 1ª Prioridade: Voz masculina em pt-BR
        selectedVoice = voices.find(voice => 
          voice.lang === 'pt-BR' && 
          (voice.name.toLowerCase().includes('male') ||
           voice.name.toLowerCase().includes('masculino') ||
           voice.name.toLowerCase().includes('homem') ||
           voice.name.toLowerCase().includes('luciano') ||
           voice.name.toLowerCase().includes('felipe'))
        );

        // 2ª Prioridade: Qualquer voz em pt-BR (Google Brasil geralmente é boa)
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang === 'pt-BR' &&
            (voice.name.includes('Google') || 
             voice.name.includes('Microsoft') ||
             voice.name.includes('Brazil'))
          );
        }

        // 3ª Prioridade: Qualquer voz pt-BR
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang === 'pt-BR');
        }

        // 4ª Prioridade: Qualquer voz que comece com 'pt'
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.startsWith('pt'));
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('Voz selecionada:', selectedVoice.name, selectedVoice.lang);
        } else {
          console.log('Nenhuma voz em português encontrada, usando voz padrão');
        }

        // Configurações da voz para soar como anunciante de aeroporto
        utterance.lang = 'pt-BR';
        utterance.rate = 0.85; // Velocidade mais devagar (profissional)
        utterance.pitch = 0.8; // Tom mais grave (masculino/profissional)
        utterance.volume = 1.0; // Volume máximo

        // Eventos de log
        utterance.onstart = () => {
          console.log('🎤 Iniciando anúncio por voz...');
        };

        utterance.onend = () => {
          console.log('✅ Anúncio por voz finalizado.');
        };

        utterance.onerror = (event) => {
          console.error('❌ Erro na síntese de voz:', event.error);
        };

        // Falar!
        window.speechSynthesis.speak(utterance);
      };

      // Se as vozes já foram carregadas, falar imediatamente
      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoicesAndSpeak();
      } else {
        // Caso contrário, aguardar o evento de carregamento
        window.speechSynthesis.onvoiceschanged = loadVoicesAndSpeak;
      }

    } catch (error) {
      console.error('Erro ao sintetizar voz:', error);
    }
  };

  const playAirportAnnouncementSound = () => {
    try {
      // Criar contexto de áudio
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const audioContext = audioContextRef.current;
      
      // ==== PARTE 1: "DING DONG" do aeroporto ====
      
      // Primeiro "DING" (nota mais alta)
      const ding1 = audioContext.createOscillator();
      const ding1Gain = audioContext.createGain();
      ding1.connect(ding1Gain);
      ding1Gain.connect(audioContext.destination);
      ding1.frequency.value = 800; // Mi
      ding1.type = 'sine';
      ding1Gain.gain.setValueAtTime(0, audioContext.currentTime);
      ding1Gain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
      ding1Gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      ding1.start(audioContext.currentTime);
      ding1.stop(audioContext.currentTime + 0.6);

      // Segundo "DONG" (nota mais baixa)
      const dong1 = audioContext.createOscillator();
      const dong1Gain = audioContext.createGain();
      dong1.connect(dong1Gain);
      dong1Gain.connect(audioContext.destination);
      dong1.frequency.value = 600; // Dó
      dong1.type = 'sine';
      dong1Gain.gain.setValueAtTime(0, audioContext.currentTime + 0.5);
      dong1Gain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.51);
      dong1Gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.2);
      dong1.start(audioContext.currentTime + 0.5);
      dong1.stop(audioContext.currentTime + 1.2);

      // ==== PARTE 2: "DING DONG" de encerramento (aos 28 segundos) ====
      
      // Primeiro "DING" final
      const ding2 = audioContext.createOscillator();
      const ding2Gain = audioContext.createGain();
      ding2.connect(ding2Gain);
      ding2Gain.connect(audioContext.destination);
      ding2.frequency.value = 800;
      ding2.type = 'sine';
      ding2Gain.gain.setValueAtTime(0, audioContext.currentTime + 28);
      ding2Gain.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 28.01);
      ding2Gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 28.5);
      ding2.start(audioContext.currentTime + 28);
      ding2.stop(audioContext.currentTime + 28.5);

      // Segundo "DONG" final
      const dong2 = audioContext.createOscillator();
      const dong2Gain = audioContext.createGain();
      dong2.connect(dong2Gain);
      dong2Gain.connect(audioContext.destination);
      dong2.frequency.value = 600;
      dong2.type = 'sine';
      dong2Gain.gain.setValueAtTime(0, audioContext.currentTime + 28.4);
      dong2Gain.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 28.41);
      dong2Gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 29);
      dong2.start(audioContext.currentTime + 28.4);
      dong2.stop(audioContext.currentTime + 29);

      // ==== PARTE 3: Harmônicos para enriquecer o som ====
      
      // Adicionar harmônico ao primeiro DING
      const harmonic1 = audioContext.createOscillator();
      const harmonic1Gain = audioContext.createGain();
      harmonic1.connect(harmonic1Gain);
      harmonic1Gain.connect(audioContext.destination);
      harmonic1.frequency.value = 1600; // Oitava acima
      harmonic1.type = 'sine';
      harmonic1Gain.gain.setValueAtTime(0, audioContext.currentTime);
      harmonic1Gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
      harmonic1Gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      harmonic1.start(audioContext.currentTime);
      harmonic1.stop(audioContext.currentTime + 0.4);

      // Adicionar harmônico ao segundo DONG
      const harmonic2 = audioContext.createOscillator();
      const harmonic2Gain = audioContext.createGain();
      harmonic2.connect(harmonic2Gain);
      harmonic2Gain.connect(audioContext.destination);
      harmonic2.frequency.value = 1200;
      harmonic2.type = 'sine';
      harmonic2Gain.gain.setValueAtTime(0, audioContext.currentTime + 0.5);
      harmonic2Gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.51);
      harmonic2Gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.9);
      harmonic2.start(audioContext.currentTime + 0.5);
      harmonic2.stop(audioContext.currentTime + 0.9);

    } catch (error) {
      console.error('Erro ao tocar som de aeroporto:', error);
    }
  };

  if (!notification) return null;

  const isLiberado = notification.type === 'liberado';
  const bgColor = isLiberado ? 'from-green-500 to-green-600' : 'from-orange-500 to-red-600';
  const Icon = isLiberado ? CheckCircle2 : AlertTriangle;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`relative bg-gradient-to-br ${bgColor} rounded-3xl shadow-2xl p-12 max-w-4xl w-full mx-8 border-8 border-white`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Indicador de Áudio Ativo */}
          {!isMuted && (
            <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full p-3 animate-pulse">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
          )}

          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
          >
            <X className="w-8 h-8 text-white" />
          </button>

          {/* Ícone */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-8">
              <Icon className="w-32 h-32 text-white" />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="text-center text-white">
            {isLiberado ? (
              <>
                <h2 className="text-6xl font-black mb-6 drop-shadow-lg">
                  EQUIPAMENTO LIBERADO
                </h2>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 mb-6">
                  <p className="text-7xl font-black mb-4">
                    {notification.codigo}
                  </p>
                  <p className="text-4xl font-bold">
                    ESTÁ LIBERADO PARA OPERAÇÃO
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-6xl font-black mb-6 drop-shadow-lg">
                  EQUIPAMENTO PARADO
                </h2>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 mb-6">
                  <p className="text-7xl font-black mb-4">
                    {notification.codigo}
                  </p>
                  <p className="text-3xl font-bold mb-3">
                    {notification.tipo === 'preventiva' ? 'MANUTENÇÃO PREVENTIVA' : 'MANUTENÇÃO CORRETIVA'}
                  </p>
                  <p className="text-2xl font-semibold">
                    {notification.descricao}
                  </p>
                </div>
              </>
            )}

            {/* Barra de Progresso */}
            <div className="mt-8">
              <div className="bg-white/30 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 30, ease: "linear" }}
                  className="bg-white h-full"
                />
              </div>
              <p className="text-sm font-semibold mt-3 text-white/80">
                Esta mensagem desaparecerá automaticamente em 30 segundos
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}