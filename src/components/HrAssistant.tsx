import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContent } from "@/lib/use-content";
import { BRAND } from "@/lib/brand";
import {
  HR_QUICK_ACTIONS,
  buildHrResponse,
  buildWelcomeMessage,
  matchHrQuery,
  parseHrContext,
  type HrAction,
  type HrResponse,
} from "@/lib/hr-assistant";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  links?: HrResponse["links"];
  streaming?: boolean;
};

const HIDDEN_ROUTES = ["/admin"];

function renderBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={key++} className="font-semibold text-foreground">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

function MessageBody({
  text,
  links,
  streaming,
}: {
  text: string;
  links?: HrResponse["links"];
  streaming?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {renderBold(text)}
        {streaming && (
          <motion.span
            className="inline-block w-[2px] h-[1em] align-[-0.15em] ml-0.5 bg-foreground/70"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.85, repeat: Infinity }}
            aria-hidden
          />
        )}
      </div>
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {links.map((link) => {
            const isExternalOrFile =
              /^https?:\/\//i.test(link.href) ||
              link.href.startsWith("/api/") ||
              link.href.endsWith(".pdf");
            const pillClass =
              "inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15";
            return isExternalOrFile ? (
              <a
                key={link.href + link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={pillClass}
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.href + link.label} href={link.href} className={pillClass}>
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function HrAssistant() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimersRef = useRef<number[]>([]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const clearStream = useCallback(() => {
    streamTimersRef.current.forEach((t) => window.clearTimeout(t));
    streamTimersRef.current = [];
  }, []);

  const identity = useContent("identity");
  const about = useContent("about");
  const experience = useContent("experience");
  const education = useContent("education");
  const projects = useContent("projects");
  const contact = useContent("contact");
  const files = useContent("files");

  const ctx = useMemo(
    () =>
      parseHrContext({
        identity,
        about,
        experience,
        education,
        projects,
        contact,
        files,
      }),
    [identity, about, experience, education, projects, contact, files],
  );

  const hidden = HIDDEN_ROUTES.some(
    (route) => location === route || location.startsWith(`${route}/`),
  );

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const streamReply = useCallback(
    (id: string, fullText: string, links?: HrResponse["links"]) => {
      clearStream();

      const tokens = fullText.match(/\S+\s*/g) ?? [fullText];
      let index = 0;
      let built = "";

      const schedule = (delay: number) => {
        const timer = window.setTimeout(tick, delay);
        streamTimersRef.current.push(timer);
      };

      const tick = () => {
        if (index >= tokens.length) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, text: fullText, streaming: false, links }
                : m,
            ),
          );
          setBusy(false);
          scrollToEnd();
          return;
        }

        built += tokens[index];
        index += 1;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  text: built,
                  streaming: index < tokens.length,
                  links: undefined,
                }
              : m,
          ),
        );
        scrollToEnd();

        const last = tokens[index - 1] ?? "";
        const delay = /[.!?]\s*$/.test(last)
          ? 140
          : /[,;:]\s*$/.test(last)
            ? 90
            : last.includes("\n\n")
              ? 120
              : last.includes("\n")
                ? 70
                : 38;

        schedule(delay);
      };

      schedule(80);
    },
    [clearStream, scrollToEnd],
  );

  const pushAssistant = useCallback(
    (action: HrAction, userLabel?: string) => {
      if (busy) return;

      if (userLabel) {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-user`, role: "user", text: userLabel },
        ]);
      }

      const response = buildHrResponse(action, ctx);
      const botId = `${Date.now()}-bot`;
      setBusy(true);
      setIsThinking(true);

      window.setTimeout(() => {
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: "assistant",
            text: "",
            streaming: true,
          },
        ]);
        streamReply(botId, response.text, response.links);
      }, response.thinkMs ?? 600);
    },
    [busy, ctx, streamReply],
  );

  useEffect(() => {
    if (!open || messages.length > 0) return;
    const welcome = buildWelcomeMessage(ctx);
    const botId = "welcome";
    setBusy(true);
    setIsThinking(true);

    const t = window.setTimeout(() => {
      setIsThinking(false);
      setMessages([
        {
          id: botId,
          role: "assistant",
          text: "",
          streaming: true,
        },
      ]);
      streamReply(botId, welcome.text, welcome.links);
    }, welcome.thinkMs ?? 400);

    return () => window.clearTimeout(t);
  }, [open, messages.length, ctx, streamReply]);

  useEffect(() => {
    scrollToEnd();
  }, [messages, open, isThinking, scrollToEnd]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 250);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(
    () => () => {
      clearStream();
    },
    [clearStream],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    setInput("");
    const action = matchHrQuery(trimmed);
    pushAssistant(action, trimmed);
  };

  if (hidden) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-md"
            style={{
              right: "max(1rem, env(safe-area-inset-right, 0px) + 1rem)",
              bottom: "max(1rem, env(safe-area-inset-bottom, 0px) + 1rem)",
              width: "min(22rem, calc(100vw - 2rem))",
              maxHeight: "min(34rem, calc(100vh - 2.5rem))",
            }}
            role="dialog"
            aria-label="Fast Assistant"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.teal})` }}
                >
                  <Bot className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm font-semibold">Fast Assistant</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isThinking ? "Reviewing portfolio…" : "Fast candidacy summary & highlights"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            <ScrollArea className="flex-1 px-4 py-3" style={{ maxHeight: "18rem" }}>
              <div className="space-y-3 pr-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        msg.role === "user"
                          ? "max-w-[92%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
                          : "max-w-[96%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/50 px-3 py-2"
                      }
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      ) : msg.text ? (
                        <MessageBody text={msg.text} links={msg.links} streaming={msg.streaming} />
                      ) : null}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-border/70 bg-muted/50 px-3 py-2">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border/70 px-3 py-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {HR_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={busy}
                    onClick={() => pushAssistant(action.id, action.prompt)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about background, projects, skills, or contact…"
                  maxLength={200}
                  disabled={busy}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60"
                  aria-label="Message the assistant"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech bubble popup on hover */}
      <AnimatePresence>
        {!open && isHovered && !bubbleDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[60] flex flex-col pointer-events-auto"
            style={{
              right: "max(1rem, env(safe-area-inset-right, 0px) + 1rem)",
              bottom: "calc(max(1rem, env(safe-area-inset-bottom, 0px) + 1rem) + 4.1rem)",
              width: "min(19.5rem, calc(100vw - 2rem))",
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="tooltip"
          >
            <div
              onClick={() => {
                setOpen(true);
                setIsHovered(false);
              }}
              className="group relative cursor-pointer rounded-2xl border border-primary/25 bg-background/95 p-3.5 shadow-2xl backdrop-blur-md transition-all hover:border-primary/45 hover:shadow-primary/10"
            >
              {/* Pointer arrow pointing down toward trigger button */}
              <div
                className="absolute -bottom-1.5 right-6 sm:right-14 h-3 w-3 rotate-45 border-b border-r border-primary/25 bg-background"
                aria-hidden
              />

              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-full text-white"
                    style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.teal})` }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fast Assistant
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBubbleDismissed(true);
                  }}
                  className="rounded-full p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Dismiss preview"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="pt-2">
                <p className="text-[13px] font-semibold text-foreground leading-snug">
                  In a hurry? Buried with tons of applications?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  I'm here to sum it all up and help you review Lenna's work in seconds! ⚡
                </p>
              </div>

              <div
                className="mt-2.5 flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all group-hover:brightness-105"
                style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.teal})` }}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Get fast overview
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => {
          setOpen(true);
          setIsHovered(false);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className="fixed z-[60] flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-3 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-[0_4px_20px_-4px_rgba(31,103,241,0.25)]"
        style={{
          right: "max(1rem, env(safe-area-inset-right, 0px) + 1rem)",
          bottom: "max(1rem, env(safe-area-inset-bottom, 0px) + 1rem)",
        }}
        initial={false}
        animate={{
          opacity: open ? 0 : 1,
          scale: open ? 0.9 : 1,
          pointerEvents: open ? "none" : "auto",
        }}
        whileHover={open ? undefined : { scale: 1.03 }}
        whileTap={open ? undefined : { scale: 0.97 }}
        aria-expanded={open}
        aria-hidden={open}
        aria-label="Open Fast Assistant"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.teal})` }}
        >
          <Bot className="h-4 w-4" aria-hidden />
        </span>
        <span className="hidden sm:inline pr-1">Fast Assistant</span>
      </motion.button>
    </>
  );
}
