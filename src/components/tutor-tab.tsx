'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Send, 
  Bot, 
  Sparkles, 
  HelpCircle, 
  MessageSquare,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Brain,
  Paperclip,
  Mic,
  Database,
  GitFork,
  Activity,
  Layers,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CornerDownLeft,
  Compass
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LearnerContextSummary {
  lessonTitle: string;
  primaryWeakConcept?: string | null;
  primaryWeakConceptScore?: number | null;
  primaryTargetConcept?: string | null;
  primaryTargetLevel?: string | null;
  masteryScore?: number | null;
  hasActiveAssessment?: boolean;
  weakConcepts?: Array<{ concept: string; masteryScore: number }>;
  masteredConcepts?: Array<{ concept: string; masteryScore: number }>;
  memoryCount?: number;
  memoryEnabled?: boolean;
  tutorMemories?: Array<{
    id?: string;
    concept: string;
    memoryType: string;
    content: string;
    confidence: number;
    occurrenceCount: number;
    resolvedAt?: string | null;
    relevance?: string;
    reliabilityScore?: number;
  }>;
  memoryIntelligence?: Array<{
    concept: string;
    type: string;
    relevance: string;
    reliabilityScore: number;
  }>;
  teachingStrategy?: string;
  targetConcept?: string;
  explanationDepth?: string;
  strategyReasons?: string[];
}

interface TutorTabProps {
  learningPathId?: string;
  lessonId?: string;
  initialContext?: string;
}

export default function TutorTab({ learningPathId: propLearningPathId, lessonId: propLessonId, initialContext }: TutorTabProps) {
  const searchParams = useSearchParams();
  const urlLearningPathId = searchParams?.get('learningPathId') || searchParams?.get('courseId') || undefined;
  const urlLessonId = searchParams?.get('lessonId') || undefined;

  const effectiveLearningPathId = propLearningPathId || urlLearningPathId;
  const effectiveLessonId = propLessonId || urlLessonId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [learnerContext, setLearnerContext] = useState<LearnerContextSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initFailed, setInitFailed] = useState<boolean>(false);
  const [isStandaloneNoCourse, setIsStandaloneNoCourse] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    { label: "EXPLAIN SIMPLY", prompt: "Explain this concept simply for a beginner.", mode: "SIMPLIFY" },
    { label: "USE AN ANALOGY", prompt: "Give me an intuitive real-world analogy for this concept.", mode: "ANALOGY" },
    { label: "TEST MY UNDERSTANDING", prompt: "Quiz my understanding with a Socratic question.", mode: "QUIZ_ME" },
    { label: "CONNECT TO GRAPH", prompt: "How does this connect to my broader knowledge graph?", mode: "SOCRATIC" },
  ];

  const onboardingPrompts = [
    { label: "EXPLAIN A CONCEPT", prompt: "Explain the core intuition behind this lesson.", mode: "SIMPLIFY" },
    { label: "QUIZ MY UNDERSTANDING", prompt: "Give me a quick Socratic check question.", mode: "QUIZ_ME" },
    { label: "USE AN ANALOGY", prompt: "Provide a clear physical analogy for this topic.", mode: "ANALOGY" },
    { label: "CHALLENGE MY THINKING", prompt: "Challenge my assumptions with a counter-example.", mode: "SOCRATIC" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let isSubscribed = true;

    async function initTutor() {
      setErrorMsg(null);
      setInitFailed(false);
      setIsStandaloneNoCourse(false);

      try {
        const params = new URLSearchParams();
        if (effectiveLearningPathId) params.set('learningPathId', effectiveLearningPathId);
        if (effectiveLessonId) params.set('lessonId', effectiveLessonId);

        const response = await fetch(`/api/ai/tutor?${params.toString()}`, {
          method: 'GET',
        });

        const resData = await response.json();

        if (!isSubscribed) return;

        if (!response.ok || !resData.success) {
          if (response.status === 401 || resData.code === 'AUTH_REQUIRED') {
            setInitFailed(true);
            setErrorMsg('Authentication required to access tutor session.');
            return;
          }
          setInitFailed(true);
          setErrorMsg(resData.error || 'Failed to initialize AI Tutor context.');
          return;
        }

        const data = resData.data || {};

        if (data.isStandaloneNoCourse) {
          setIsStandaloneNoCourse(true);
          setInitFailed(true);
          return;
        }

        if (data.conversationId) setConversationId(data.conversationId);
        if (data.context) setLearnerContext(data.context);

        if (data.messages && data.messages.length > 0) {
          const mappedMsgs: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.id || `msg-${Math.random()}`,
            sender: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setMessages(mappedMsgs);
        } else if (initialContext) {
          setMessages([
            {
              id: 'init-greeting',
              sender: 'assistant',
              content: initialContext,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setInitFailed(true);
        setErrorMsg('Network error initializing AI Tutor.');
      }
    }

    initTutor();

    return () => {
      isSubscribed = false;
    };
  }, [effectiveLearningPathId, effectiveLessonId, initialContext]);

  const handleSendMessage = async (textToSend?: string, teachingMode?: string) => {
    const query = textToSend || inputValue;
    const trimmedMessage = query.trim();
    if (!trimmedMessage || isTyping || initFailed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: trimmedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationId,
          learningPathId: effectiveLearningPathId,
          lessonId: effectiveLessonId,
          mode: teachingMode,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        setErrorMsg(resData.error || resData.message || "CYRA couldn't generate a response. Please try again.");
        return;
      }

      const activeContext = resData.learnerContext || resData.data?.context;
      if (activeContext) setLearnerContext(activeContext);
      
      const activeConvId = resData.conversationId || resData.data?.conversationId;
      if (activeConvId && !conversationId) setConversationId(activeConvId);

      const replyText =
        resData.response ||
        resData.message ||
        resData.data?.reply ||
        resData.data?.message?.content ||
        resData.data?.response ||
        resData.content;

      if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
        setErrorMsg("CYRA couldn't generate a response. Please try again.");
        return;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: replyText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setErrorMsg('Network error communicating with AI Tutor.');
    } finally {
      setIsTyping(false);
    }
  };

  if (isStandaloneNoCourse) {
    return (
      <div className="p-10 text-center bg-[var(--cyra-panel)] border border-[var(--cyra-border)] rounded-2xl space-y-4 max-w-xl mx-auto font-mono transition-colors duration-200">
        <Bot className="w-10 h-10 text-[var(--cyra-cyan)] mx-auto animate-pulse" />
        <div>
          <h3 className="text-base font-bold text-[var(--cyra-text)] uppercase tracking-wider">NO ACTIVE COURSE CONTEXT</h3>
          <p className="text-xs text-[var(--cyra-text-secondary)] mt-1 font-sans">
            Select an active course or research brief to activate personalized AI tutoring.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/courses" className="os-button-primary">
            <span>Browse Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const targetConcept = learnerContext?.targetConcept || learnerContext?.primaryTargetConcept || 'ASTRONOMY';
  const activeLesson = learnerContext?.lessonTitle || 'What is Space Exploration?';
  const teachingStrategy = learnerContext?.teachingStrategy || 'GUIDED_REASONING';
  const masteryScore = learnerContext?.masteryScore ?? 92;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[740px] text-left transition-colors duration-200">
      
      {/* ── 1. LEFT PANEL: LEARNING CONTEXT (3 COLS) ─────────────────── */}
      <aside className="lg:col-span-3 space-y-4 flex flex-col h-full overflow-y-auto">
        
        {/* Active Context Card */}
        <div className="os-card p-4 space-y-3 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cyra-cyan)] uppercase border-b border-[var(--cyra-border)] pb-2">
            <BookOpen className="w-4 h-4 text-[var(--cyra-cyan)]" />
            <span>LEARNING CONTEXT</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <span className="text-[9px] text-[var(--cyra-text-muted)] uppercase block tracking-wider font-bold">ACTIVE LESSON</span>
              <p className="text-[var(--cyra-text)] font-bold truncate mt-0.5 font-sans">{activeLesson}</p>
            </div>

            <div>
              <span className="text-[9px] text-[var(--cyra-text-muted)] uppercase block tracking-wider font-bold">TARGET CONCEPT</span>
              <span className="os-badge os-badge-cyan mt-1">{targetConcept}</span>
            </div>
          </div>
        </div>

        {/* Learning Signal (Weak & Mastered Progress Visualization) */}
        <div className="os-card p-4 space-y-3 bg-[var(--cyra-panel)] border border-[var(--cyra-border)] flex-1">
          <div className="flex items-center justify-between border-b border-[var(--cyra-border)] pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cyra-text)] uppercase">
              <Activity className="w-4 h-4 text-[var(--cyra-violet)]" />
              <span>LEARNING SIGNAL</span>
            </div>
            <span className="os-badge os-badge-muted">REAL-TIME</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Weak Concepts */}
            <div>
              <span className="text-[9px] text-[var(--cyra-amber)] font-bold uppercase tracking-wider block mb-2">
                WEAK CONCEPTS
              </span>
              <div className="space-y-2">
                {learnerContext?.weakConcepts && learnerContext.weakConcepts.length > 0 ? (
                  learnerContext.weakConcepts.map((wc, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-[var(--pastel-peach-bg)] border border-[var(--cyra-border)] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--cyra-text)] truncate font-sans text-xs font-medium">{wc.concept}</span>
                        <span className="text-[var(--cyra-amber)] font-bold">{wc.masteryScore}%</span>
                      </div>
                      <div className="w-full bg-[var(--cyra-bg)] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[var(--cyra-amber)] h-full rounded-full" style={{ width: `${wc.masteryScore}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-lg bg-[var(--pastel-peach-bg)] border border-[var(--cyra-border)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--cyra-text)] truncate font-sans text-xs font-medium">TCP Congestion Control</span>
                      <span className="text-[var(--cyra-amber)] font-bold">65%</span>
                    </div>
                    <div className="w-full bg-[var(--cyra-bg)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--cyra-amber)] h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mastered Concepts */}
            <div>
              <span className="text-[9px] text-[var(--cyra-green)] font-bold uppercase tracking-wider block mb-2">
                MASTERED CONCEPTS
              </span>
              <div className="space-y-2">
                {learnerContext?.masteredConcepts && learnerContext.masteredConcepts.length > 0 ? (
                  learnerContext.masteredConcepts.map((mc, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-[var(--pastel-mint-bg)] border border-[var(--cyra-border)] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--cyra-text)] truncate font-sans text-xs font-medium">{mc.concept}</span>
                        <span className="text-[var(--cyra-green)] font-bold">{mc.masteryScore}%</span>
                      </div>
                      <div className="w-full bg-[var(--cyra-bg)] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[var(--cyra-green)] h-full rounded-full" style={{ width: `${mc.masteryScore}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-lg bg-[var(--pastel-mint-bg)] border border-[var(--cyra-border)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--cyra-text)] truncate font-sans text-xs font-medium">Sliding Windowing</span>
                      <span className="text-[var(--cyra-green)] font-bold">92%</span>
                    </div>
                    <div className="w-full bg-[var(--cyra-bg)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--cyra-green)] h-full rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Mode */}
            <div className="pt-2 border-t border-[var(--cyra-border)]">
              <span className="text-[9px] text-[var(--cyra-text-muted)] uppercase block tracking-wider font-bold mb-1">
                CURRENT LEARNING MODE
              </span>
              <div className="flex items-center gap-2">
                <span className="os-badge os-badge-cyan">SOCRATIC</span>
                <span className="os-badge os-badge-indigo">FOUNDATION</span>
              </div>
            </div>
          </div>
        </div>

      </aside>

      {/* ── 2. CENTER PANEL: CYRA TUTOR HERO AREA (6 COLS) ────────────── */}
      <main className="lg:col-span-6 flex flex-col h-full bg-[var(--cyra-panel)] border border-[var(--cyra-border)] rounded-2xl overflow-hidden shadow-sm relative">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[var(--cyra-panel)] border-b border-[var(--cyra-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] flex items-center justify-center text-[var(--cyra-cyan)] font-mono text-xs font-bold">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[var(--cyra-text)] uppercase tracking-wider">CYRA TUTOR ENGINE</span>
                <span className="os-badge os-badge-cyan text-[9px]">SOCRATIC</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--cyra-text-secondary)] block mt-0.5">
                Strategy: {teachingStrategy.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="os-badge os-badge-indigo text-[9px] hidden sm:inline-flex">
              ADAPTIVE STATE: FOUNDATION → EXPLORATION
            </span>
            <span className="flex items-center gap-1.5 text-[var(--cyra-green)] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyra-green)] animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[var(--cyra-bg)] relative">
          
          {/* Onboarding State if conversation is empty */}
          {messages.length === 0 && !isTyping && (
            <div className="py-10 text-center space-y-6 max-w-md mx-auto animate-os-fade">
              <div className="w-12 h-12 rounded-xl bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] flex items-center justify-center text-[var(--cyra-cyan)] mx-auto font-mono text-lg font-bold">
                C
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-[var(--cyra-text)] tracking-tight font-sans">
                  &ldquo;Let&apos;s understand this together.&rdquo;
                </h3>
                <p className="text-xs text-[var(--cyra-text-secondary)] leading-relaxed font-sans">
                  Socratic tutoring adapts dynamically to what you already know.
                </p>
              </div>

              {/* Onboarding Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2 font-mono">
                {onboardingPrompts.map((op, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(op.prompt, op.mode)}
                    className="p-3 rounded-lg bg-[var(--cyra-card)] border border-[var(--cyra-border)] hover:border-[var(--cyra-cyan)] hover:bg-[var(--cyra-card-soft)] transition-all text-left group"
                  >
                    <span className="text-[10px] font-bold text-[var(--cyra-cyan)] block group-hover:translate-x-0.5 transition-transform">
                      {op.label}
                    </span>
                    <span className="text-[11px] text-[var(--cyra-text-secondary)] block truncate mt-0.5 font-sans">
                      {op.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Messages Feed */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-[var(--pastel-lavender-bg)] text-[var(--cyra-violet)] border border-[var(--cyra-border)]'
                    : 'bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] text-[var(--cyra-cyan)]'
                }`}
              >
                {msg.sender === 'user' ? 'U' : 'C'}
              </div>

              <div
                className={`max-w-[82%] p-4 rounded-xl text-xs leading-relaxed font-sans ${
                  msg.sender === 'user'
                    ? 'bg-[var(--user-bubble-bg)] border border-[var(--user-bubble-border)] text-[var(--user-bubble-text)] rounded-tr-none'
                    : 'bg-[var(--cyra-card)] border border-[var(--cyra-border)] text-[var(--cyra-text)] rounded-tl-none space-y-2 shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="text-[9px] font-mono text-[var(--cyra-text-muted)] text-right mt-1">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {/* CYRA IS THINKING State (Custom Cybernetic Dots) */}
          {isTyping && (
            <div className="flex items-start gap-3 animate-os-fade">
              <div className="w-7 h-7 rounded-lg bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] flex items-center justify-center text-[var(--cyra-cyan)] font-mono text-xs font-bold flex-shrink-0">
                C
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--cyra-card)] border border-[var(--cyra-border)] text-xs font-mono text-[var(--cyra-cyan)] flex items-center gap-3">
                <span className="tracking-wider uppercase font-bold text-[10px]">CYRA IS THINKING</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyra-cyan)] animate-ping" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyra-cyan)] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyra-cyan)] animate-bounce" />
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[rgba(217,92,106,0.1)] border border-[var(--cyra-red)] text-xs font-mono text-[var(--cyra-red)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--cyra-red)] flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Pills Bar */}
        <div className="px-4 py-2 bg-[var(--cyra-panel)] border-t border-[var(--cyra-border)] flex items-center gap-2 overflow-x-auto">
          {suggestedPrompts.map((sp, idx) => (
            <button
              key={idx}
              disabled={isTyping}
              onClick={() => handleSendMessage(sp.prompt, sp.mode)}
              className="os-badge os-badge-indigo hover:border-[var(--cyra-cyan)] cursor-pointer whitespace-nowrap transition-all text-[9px]"
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Message Input Composer */}
        <div className="p-3.5 bg-[var(--cyra-panel)] border-t border-[var(--cyra-border)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-[var(--cyra-bg)] border border-[var(--cyra-border-strong)] focus-within:border-[var(--cyra-cyan)] rounded-xl p-2 transition-all duration-200"
          >
            <button type="button" className="p-1.5 text-[var(--cyra-text-muted)] hover:text-[var(--cyra-text)] transition-colors" title="Attach Context">
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder="Ask CYRA anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              className="flex-1 bg-transparent text-xs text-[var(--cyra-text)] placeholder-[var(--cyra-text-muted)] focus:outline-none font-sans"
            />

            <div className="flex items-center gap-2">
              <kbd className="os-badge os-badge-muted text-[8px] uppercase hidden sm:inline-flex">ENTER ↵</kbd>

              <button type="button" className="p-1 text-[var(--cyra-text-muted)] hover:text-[var(--cyra-text)] transition-colors" title="Voice Input">
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="os-button-primary py-1.5 px-3 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

      </main>

      {/* ── 3. RIGHT PANEL: LIVE KNOWLEDGE (3 COLS) ──────────────────── */}
      <aside className="lg:col-span-3 space-y-4 flex flex-col h-full overflow-y-auto">
        
        {/* Live Knowledge Panel & Retention Score */}
        <div className="os-card p-4 space-y-4 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
          <div className="flex items-center justify-between border-b border-[var(--cyra-border)] pb-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-[var(--cyra-text)] font-bold uppercase">
              <Activity className="w-4 h-4 text-[var(--cyra-cyan)]" />
              <span>LIVE KNOWLEDGE</span>
            </div>
            <span className="os-badge os-badge-emerald">ACTIVE</span>
          </div>

          {/* Current Concept */}
          <div className="space-y-1 font-mono text-xs">
            <span className="text-[9px] text-[var(--cyra-text-muted)] uppercase tracking-wider block font-bold">CURRENT CONCEPT</span>
            <span className="os-badge os-badge-cyan font-bold">{targetConcept}</span>
          </div>

          {/* Retention Confidence Large Numerical Score */}
          <div className="p-3 rounded-xl bg-[var(--pastel-mint-bg)] border border-[var(--cyra-border)] flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono text-[var(--cyra-text-secondary)] uppercase tracking-wider block font-bold">
                RETENTION CONFIDENCE
              </span>
              <div className="text-2xl font-extrabold text-[var(--cyra-green)] font-mono mt-0.5">{masteryScore}%</div>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-[var(--cyra-green)] flex items-center justify-center text-[var(--cyra-green)] font-mono text-xs font-bold">
              ✓
            </div>
          </div>

          {/* Connected Concepts SVG Mini-Graph */}
          <div className="space-y-2 pt-2 border-t border-[var(--cyra-border)] font-mono text-xs">
            <span className="text-[9px] text-[var(--cyra-text-muted)] uppercase tracking-wider block font-bold">
              KNOWLEDGE GRAPH CONNECTED NODES
            </span>

            <div className="p-3 rounded-xl bg-[var(--cyra-card-soft)] border border-[var(--cyra-border)] relative overflow-hidden">
              <svg className="w-full h-24" viewBox="0 0 200 90">
                {/* Connecting Edge Lines */}
                <line x1="100" y1="45" x2="35" y2="20" stroke="var(--cyra-border-strong)" strokeWidth="1.5" />
                <line x1="100" y1="45" x2="165" y2="20" stroke="var(--cyra-border-strong)" strokeWidth="1.5" />
                <line x1="100" y1="45" x2="100" y2="75" stroke="var(--cyra-border-strong)" strokeWidth="1.5" />

                {/* Satellite Nodes */}
                <circle cx="35" cy="20" r="12" fill="var(--cyra-panel)" stroke="var(--cyra-violet)" strokeWidth="1.5" />
                <text x="35" y="23" textAnchor="middle" fill="var(--cyra-violet)" fontSize="7" fontFamily="monospace">GRAVITY</text>

                <circle cx="165" cy="20" r="12" fill="var(--cyra-panel)" stroke="var(--cyra-violet)" strokeWidth="1.5" />
                <text x="165" y="23" textAnchor="middle" fill="var(--cyra-violet)" fontSize="7" fontFamily="monospace">ORBITS</text>

                <circle cx="100" cy="75" r="12" fill="var(--cyra-panel)" stroke="var(--cyra-violet)" strokeWidth="1.5" />
                <text x="100" y="78" textAnchor="middle" fill="var(--cyra-violet)" fontSize="6" fontFamily="monospace">SPACE</text>

                {/* Central Active Target Concept Node with Pulsing Ring */}
                <circle cx="100" cy="45" r="16" fill="var(--cyra-card)" stroke="var(--cyra-cyan)" strokeWidth="2" />
                <circle cx="100" cy="45" r="20" fill="none" stroke="var(--cyra-cyan)" strokeWidth="1" strokeDasharray="3 3" className="animate-spin" />
                <text x="100" y="48" textAnchor="middle" fill="var(--cyra-cyan)" fontSize="7" fontWeight="bold" fontFamily="monospace">ASTRO</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Adaptive Engine Strategy Card */}
        <div className="os-card p-4 space-y-2 bg-[var(--cyra-panel)] border border-[var(--cyra-border)] font-mono text-xs">
          <div className="flex items-center gap-2 text-[var(--cyra-violet)] font-bold uppercase">
            <Brain className="w-4 h-4" />
            <span>ADAPTIVE ENGINE</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--pastel-lavender-bg)] border border-[var(--cyra-border)] space-y-1">
            <span className="text-[9px] text-[var(--cyra-text-muted)] uppercase block font-bold">CURRENT STRATEGY</span>
            <span className="os-badge os-badge-indigo">FOUNDATION</span>
            <p className="text-[11px] text-[var(--cyra-text-secondary)] mt-1 font-sans leading-relaxed">
              &ldquo;Your recent responses suggest this concept needs conceptual reinforcement before testing.&rdquo;
            </p>
          </div>
        </div>

        {/* Suggested Next Best Action Card */}
        <div className="os-card p-4 space-y-3 bg-[var(--cyra-panel)] border-l-2 border-l-[var(--cyra-cyan)] border-r border-t border-b border-[var(--cyra-border)] flex-1 font-mono text-xs">
          <div className="flex items-center gap-2 text-[var(--cyra-cyan)] font-bold uppercase">
            <Compass className="w-4 h-4" />
            <span>NEXT BEST ACTION</span>
          </div>

          <div className="space-y-1 font-sans">
            <span className="text-[10px] font-mono text-[var(--cyra-text-muted)] uppercase block font-bold">CONTINUE TO:</span>
            <h4 className="text-xs font-bold text-[var(--cyra-text)]">Module 2: Paging & Virtualization</h4>
            <p className="text-[11px] text-[var(--cyra-text-secondary)] mt-1 leading-relaxed">
              Strengthen retention before introducing a dependent concept.
            </p>
          </div>

          <button
            onClick={() => handleSendMessage("Quiz me on Module 2 concepts", "QUIZ_ME")}
            className="os-button-secondary w-full justify-center py-1.5 text-[10px] uppercase font-bold"
          >
            <span>CONTINUE LEARNING →</span>
          </button>
        </div>

      </aside>

    </div>
  );
}
