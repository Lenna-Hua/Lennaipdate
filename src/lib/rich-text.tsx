import { Fragment, type ReactNode } from "react";

/**
 * Lightweight, XSS-safe rich text parser & renderer for portfolio text fields.
 * Supports:
 *   - Bold: **text** or <b>text</b> or <strong>text</strong>
 *   - Italic: *text* or <i>text</i> or <em>text</em>
 *   - Underline: <u>text</u> or __text__
 *   - Font sizes: <sm>text</sm>, <lg>text</lg>, <xl>text</xl>
 *   - Text color: <color=#E85D4A>text</color>
 *   - Links: [label](https://...)
 *   - Bullet lines (• item or - item) and numbered lines (1. item)
 */

const TOKEN_RE =
  /(\*\*[\s\S]+?\*\*|<b>[\s\S]+?<\/b>|<strong>[\s\S]+?<\/strong>|<u>[\s\S]+?<\/u>|__[\s\S]+?__|<i>[\s\S]+?<\/i>|<em>[\s\S]+?<\/em>|<sm>[\s\S]+?<\/sm>|<lg>[\s\S]+?<\/lg>|<xl>[\s\S]+?<\/xl>|<color=#[0-9a-fA-F]{3,8}>[\s\S]+?<\/color>|\[[^\]]+\]\((?:https?:\/\/|\/|mailto:)[^)]+\)|\*[^\s*][^*]*?\*)/g;

export function hasRichTextFormatting(text: string | undefined | null): boolean {
  if (!text) return false;
  return /(\*\*|<b>|<strong>|<u>|__|<i>|<em>|<sm>|<lg>|<xl>|<color=#[0-9a-fA-F]{3,8}>|\[[^\]]+\]\((?:https?:\/\/|\/|mailto:)|(?:^|\n)\s*(?:•|\d+\.)\s)/m.test(
    text,
  );
}

/** Strip formatting markers for plain-text contexts (TOC, aria-label, admin list titles). */
export function stripRichText(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/<(?:b|strong|i|em|u|sm|lg|xl)>([\s\S]+?)<\/(?:b|strong|i|em|u|sm|lg|xl)>/g, "$1")
    .replace(/<color=#[0-9a-fA-F]{3,8}>([\s\S]+?)<\/color>/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/|mailto:)[^)]+\)/g, "$1")
    .replace(/\*([^\s*][^*]*?)\*/g, "$1");
}

function parseInline(text: string, keyPrefix = "rt"): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE.source, "g");

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      out.push(
        <strong key={key} className="font-bold">
          {parseInline(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (token.startsWith("<b>") && token.endsWith("</b>")) {
      out.push(
        <strong key={key} className="font-bold">
          {parseInline(token.slice(3, -4), key)}
        </strong>,
      );
    } else if (token.startsWith("<strong>") && token.endsWith("</strong>")) {
      out.push(
        <strong key={key} className="font-bold">
          {parseInline(token.slice(8, -9), key)}
        </strong>,
      );
    } else if (token.startsWith("<u>") && token.endsWith("</u>")) {
      out.push(
        <span key={key} className="underline underline-offset-4">
          {parseInline(token.slice(3, -4), key)}
        </span>,
      );
    } else if (token.startsWith("__") && token.endsWith("__")) {
      out.push(
        <span key={key} className="underline underline-offset-4">
          {parseInline(token.slice(2, -2), key)}
        </span>,
      );
    } else if (token.startsWith("<i>") && token.endsWith("</i>")) {
      out.push(
        <em key={key} className="italic">
          {parseInline(token.slice(3, -4), key)}
        </em>,
      );
    } else if (token.startsWith("<em>") && token.endsWith("</em>")) {
      out.push(
        <em key={key} className="italic">
          {parseInline(token.slice(4, -5), key)}
        </em>,
      );
    } else if (token.startsWith("<sm>") && token.endsWith("</sm>")) {
      out.push(
        <span key={key} className="text-[0.82em] leading-normal">
          {parseInline(token.slice(4, -5), key)}
        </span>,
      );
    } else if (token.startsWith("<lg>") && token.endsWith("</lg>")) {
      out.push(
        <span key={key} className="text-[1.2em] font-medium leading-snug">
          {parseInline(token.slice(4, -5), key)}
        </span>,
      );
    } else if (token.startsWith("<xl>") && token.endsWith("</xl>")) {
      out.push(
        <span key={key} className="text-[1.42em] font-semibold leading-tight">
          {parseInline(token.slice(4, -5), key)}
        </span>,
      );
    } else if (token.startsWith("<color=#") && token.endsWith("</color>")) {
      const closeBracket = token.indexOf(">");
      const hex = token.slice(7, closeBracket);
      const inner = token.slice(closeBracket + 1, -8);
      out.push(
        <span key={key} style={{ color: hex }}>
          {parseInline(inner, key)}
        </span>,
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const splitIdx = token.indexOf("](");
      const label = token.slice(1, splitIdx);
      const href = token.slice(splitIdx + 2, -1);
      const isExternal = /^https?:\/\//i.test(href);
      out.push(
        <a
          key={key}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="underline underline-offset-4 hover:text-primary transition-colors"
        >
          {parseInline(label, key)}
        </a>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      out.push(
        <em key={key} className="italic">
          {parseInline(token.slice(1, -1), key)}
        </em>,
      );
    } else {
      out.push(token);
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }

  return out;
}

export function renderRichText(text: string | undefined | null): ReactNode {
  if (!text) return null;
  if (!hasRichTextFormatting(text)) return text;

  const lines = text.split("\n");
  if (lines.length === 1) {
    return parseInline(lines[0]!, "line-0");
  }

  return lines.map((line, idx) => (
    <Fragment key={idx}>
      {idx > 0 && "\n"}
      {parseInline(line, `line-${idx}`)}
    </Fragment>
  ));
}

export function RichText({ text }: { text: string | undefined | null }) {
  return <>{renderRichText(text)}</>;
}
