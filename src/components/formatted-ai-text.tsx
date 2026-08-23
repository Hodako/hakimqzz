"use client";

import React from "react";

interface FormattedAiTextProps {
  content: string;
  lang?: "en" | "bn";
  className?: string;
}

// Inline markdown parser for **bold**, *italic*, `code`, and plain text
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match inline code, bold, italic
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[11px] font-medium text-primary border border-border/40"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function FormattedAiText({ content, lang = "en", className = "" }: FormattedAiTextProps) {
  // Extract think tags and contents if model produces reasoning
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/i;
  const thinkMatch = content.match(thinkRegex);
  let thought: string | null = null;
  let cleanContent = content;

  if (thinkMatch) {
    thought = thinkMatch[1].trim();
    cleanContent = content.replace(thinkRegex, "").trim();
  }

  // Parse markdown lines into blocks
  const lines = cleanContent.split("\n");
  const elements: React.ReactNode[] = [];

  let currentBulletList: string[] = [];
  let currentNumberedList: string[] = [];
  let currentCodeBlock: { lang: string; lines: string[] } | null = null;
  let currentTable: { headers: string[]; rows: string[][] } | null = null;

  const flushBulletList = (key: string | number) => {
    if (currentBulletList.length === 0) return null;
    const items = [...currentBulletList];
    currentBulletList = [];
    return (
      <ul key={`ul-${key}`} className="my-2 pl-5 list-disc space-y-1 text-xs leading-relaxed text-foreground">
        {items.map((item, i) => (
          <li key={i} className="pl-0.5">
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    );
  };

  const flushNumberedList = (key: string | number) => {
    if (currentNumberedList.length === 0) return null;
    const items = [...currentNumberedList];
    currentNumberedList = [];
    return (
      <ol key={`ol-${key}`} className="my-2 pl-5 list-decimal space-y-1 text-xs leading-relaxed text-foreground">
        {items.map((item, i) => (
          <li key={i} className="pl-0.5">
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ol>
    );
  };

  const flushCodeBlock = (key: string | number) => {
    if (!currentCodeBlock) return null;
    const block = currentCodeBlock;
    currentCodeBlock = null;
    return (
      <div key={`code-${key}`} className="my-2.5 rounded-xl overflow-hidden border border-border/80 bg-zinc-950 text-zinc-100 shadow-sm text-xs font-mono">
        {block.lang ? (
          <div className="px-3 py-1 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
            {block.lang}
          </div>
        ) : null}
        <pre className="p-3 overflow-x-auto leading-relaxed">
          <code>{block.lines.join("\n")}</code>
        </pre>
      </div>
    );
  };

  const flushTable = (key: string | number) => {
    if (!currentTable) return null;
    const table = currentTable;
    currentTable = null;
    return (
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs text-left">
          {table.headers.length > 0 && (
            <thead className="bg-muted/70 text-foreground font-semibold border-b border-border">
              <tr>
                {table.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 border-r border-border/50 last:border-r-0">
                    {parseInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border/60 bg-card">
            {table.rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/30">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 border-r border-border/40 last:border-r-0 text-foreground/90">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const flushAll = (key: string | number) => {
    const list: React.ReactNode[] = [];
    if (currentBulletList.length > 0) list.push(flushBulletList(key));
    if (currentNumberedList.length > 0) list.push(flushNumberedList(key));
    if (currentCodeBlock) list.push(flushCodeBlock(key));
    if (currentTable) list.push(flushTable(key));
    return list;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fences
    if (trimmed.startsWith("```")) {
      if (currentCodeBlock) {
        elements.push(flushCodeBlock(i));
      } else {
        elements.push(...flushAll(i));
        const codeLang = trimmed.replace(/^```/, "").trim();
        currentCodeBlock = { lang: codeLang, lines: [] };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.lines.push(line);
      continue;
    }

    // Markdown Table lines (| a | b |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Check if it's separator row (|---|---|)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator) {
        continue;
      }

      if (!currentTable) {
        elements.push(...flushAll(i));
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      elements.push(flushTable(i));
    }

    // Empty line -> flush lists and keep paragraph spacing
    if (!trimmed) {
      elements.push(...flushAll(i));
      continue;
    }

    // Headings: #, ##, ###, ####
    if (trimmed.startsWith("#")) {
      elements.push(...flushAll(i));
      const match = trimmed.match(/^(#+)\s*(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        if (level === 1) {
          elements.push(
            <h2 key={i} className="text-base font-bold text-foreground mt-3.5 mb-1.5 tracking-tight border-b border-border/50 pb-1">
              {parseInlineMarkdown(text)}
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">
              {parseInlineMarkdown(text)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={i} className="text-xs font-semibold text-foreground mt-2 mb-0.5">
              {parseInlineMarkdown(text)}
            </h4>
          );
        }
        continue;
      }
    }

    // Bullet points: - , * , •
    const bulletMatch = trimmed.match(/^([-*•])\s+(.*)$/);
    if (bulletMatch && !trimmed.startsWith("**")) {
      if (currentNumberedList.length > 0) elements.push(flushNumberedList(i));
      currentBulletList.push(bulletMatch[2]);
      continue;
    }

    // Numbered list: 1. , 2.
    const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numberMatch) {
      if (currentBulletList.length > 0) elements.push(flushBulletList(i));
      currentNumberedList.push(numberMatch[2]);
      continue;
    }

    // Blockquote: >
    if (trimmed.startsWith(">")) {
      elements.push(...flushAll(i));
      const quoteText = trimmed.replace(/^>\s*/, "");
      elements.push(
        <div key={i} className="my-2 border-l-2 border-primary/60 pl-3 py-0.5 text-xs italic text-muted-foreground bg-muted/20 rounded-r-lg">
          {parseInlineMarkdown(quoteText)}
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(...flushAll(i));
    elements.push(
      <p key={i} className="text-xs leading-relaxed text-foreground/90 my-1.5">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  }

  // Flush remaining blocks
  elements.push(...flushAll("end"));

  return (
    <div className={`space-y-0.5 font-sans ${className}`}>
      {/* Collapsible reasoning block if present */}
      {thought && (
        <details className="my-2 border border-border/60 rounded-xl bg-muted/40 overflow-hidden text-[11px] text-muted-foreground transition-all">
          <summary className="cursor-pointer p-2 font-medium hover:bg-muted/70 select-none flex items-center gap-1.5">
            <span>💭</span> {lang === "bn" ? "চিন্তাধারা (Reasoning)..." : "Thinking Process..."}
          </summary>
          <div className="p-2.5 leading-relaxed italic border-t border-border/40 bg-muted/20 whitespace-pre-wrap">
            {parseInlineMarkdown(thought)}
          </div>
        </details>
      )}

      {elements}
    </div>
  );
}
