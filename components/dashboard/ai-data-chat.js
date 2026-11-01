"use client";

import { useState } from "react";
import { ArrowUp, LoaderCircle, MessageCircle, RotateCcw } from "lucide-react";
import {
  Bubble,
  BubbleContent,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
  MarkdownContent,
  Message,
  MessageContent,
  MessageGroup,
} from "../ui/ai-elements";

const MAX_CONVERSATION_CHARACTERS = 8000;

function getRequestMessages(messages) {
  const recentMessages = messages.slice(-12);
  let totalCharacters = recentMessages.reduce(
    (total, message) => total + message.content.length,
    0,
  );

  while (
    recentMessages.length > 1 &&
    totalCharacters > MAX_CONVERSATION_CHARACTERS
  ) {
    totalCharacters -= recentMessages.shift().content.length;
  }

  return recentMessages;
}

export default function AiDataChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasConversation = messages.length > 0 || isLoading || Boolean(error);

  async function sendMessage(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user", content }].slice(-12);
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: getRequestMessages(nextMessages) }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || "The data assistant could not answer right now.",
        );
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.message },
      ]);
    } catch (requestError) {
      setError(
        requestError.message ||
          "The data assistant could not answer right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setError("");
  }

  return (
    <section
      aria-labelledby="ai-data-chat-heading"
      className="mt-8 overflow-hidden rounded-xl border bg-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <MessageCircle
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <h2 id="ai-data-chat-heading" className="font-semibold">
              Ask about market data
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Query the data in natrual language to get deeper insights and
              trends.
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Clear chat
          </button>
        )}
      </header>

      {hasConversation && (
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={isLoading}
          className="max-h-96 overflow-y-auto px-5 py-5"
        >
          <MessageGroup>
            {messages.map((message, index) => (
              <Message
                key={`${index}-${message.role}`}
                align={message.role === "user" ? "end" : "start"}
              >
                <MessageContent className="max-w-[90%]">
                  {message.role === "user" ? (
                    <Bubble align="end" variant="muted">
                      <BubbleContent>{message.content}</BubbleContent>
                    </Bubble>
                  ) : (
                    <Bubble>
                      <BubbleContent>
                        <MarkdownContent>{message.content}</MarkdownContent>
                      </BubbleContent>
                    </Bubble>
                  )}
                </MessageContent>
              </Message>
            ))}
            {isLoading && (
              <Message>
                <MessageContent>
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Checking saved quote data…
                  </p>
                </MessageContent>
              </Message>
            )}
          </MessageGroup>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className={`${hasConversation ? "border-t " : ""}p-4`}
      >
        <label className="sr-only" htmlFor="ai-data-chat-input">
          Ask a question about saved FX data
        </label>
        <InputGroup>
          <InputGroupTextarea
            id="ai-data-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="e.g. Which provider had the best EUR transfer rate?"
            disabled={isLoading}
            aria-label="Message"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <InputGroupAddon>
            <InputGroupButton
              type="submit"
              aria-label="Send message"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ArrowUp className="size-4" aria-hidden="true" />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
