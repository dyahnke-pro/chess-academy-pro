import { useMemo } from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

interface ParsedBlock {
  type: 'heading' | 'hr' | 'table' | 'paragraph';
  level?: number;
  content?: string;
  rows?: string[][];
}

function parseBlocks(text: string): ParsedBlock[] {
  const lines = text.split('\n');
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule: --- or *** or ___ (alone on a line)
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading: # or ##
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // Table: | col | col |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const row = lines[i].trim();
        // Skip separator rows like |---|---|
        if (/^\|[\s:|-]+\|/.test(row) && !row.replace(/[\s|:-]/g, '')) {
          i++;
          continue;
        }
        const cells = row.split('|').slice(1, -1).map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      if (rows.length > 0) {
        blocks.push({ type: 'table', rows });
      }
      continue;
    }

    // Regular paragraph line (may be empty)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Accumulate paragraph lines
    let paraLines = line;
    i++;
    while (i < lines.length) {
      const next = lines[i];
      if (
        next.trim() === '' ||
        /^[-*_]{3,}\s*$/.test(next.trim()) ||
        /^#{1,3}\s+/.test(next) ||
        (next.trim().startsWith('|') && next.trim().endsWith('|'))
      ) {
        break;
      }
      paraLines += '\n' + next;
      i++;
    }
    blocks.push({ type: 'paragraph', content: paraLines });
  }

  return blocks;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** first, then *italic*
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={key++}>{match[2]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderParagraphContent(text: string): React.ReactNode[] {
  // Split into lines, handle list items
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];

  const flushList = (key: number): void => {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${key}`} className="list-disc list-inside space-y-0.5 my-1">
          {listItems.map((item, j) => (
            <li key={j}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length > 0) {
      result.push(
        <ol key={`ol-${key}`} className="list-decimal list-inside space-y-0.5 my-1">
          {orderedItems.map((item, j) => (
            <li key={j}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[-*+]\s+(.+)$/);
    const olMatch = line.match(/^\d+\.\s+(.+)$/);

    if (ulMatch) {
      if (orderedItems.length > 0) flushList(i);
      listItems.push(ulMatch[1]);
    } else if (olMatch) {
      if (listItems.length > 0) flushList(i);
      orderedItems.push(olMatch[1]);
    } else {
      flushList(i);
      if (result.length > 0 && line.trim()) {
        result.push(<br key={`br-${i}`} />);
      }
      result.push(...renderInlineMarkdown(line));
    }
  }

  flushList(lines.length);
  return result;
}

export function MarkdownText({ text, className }: MarkdownTextProps): JSX.Element {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'hr':
            return <hr key={i} className="my-2 border-theme-border" />;

          case 'heading': {
            const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5';
            const sizeClass = block.level === 1
              ? 'text-sm font-bold mt-3 mb-1'
              : block.level === 2
                ? 'text-sm font-semibold mt-2 mb-1'
                : 'text-xs font-semibold mt-2 mb-0.5';
            return (
              <Tag key={i} className={sizeClass} style={{ color: 'var(--color-text)' }}>
                {renderInlineMarkdown(block.content ?? '')}
              </Tag>
            );
          }

          case 'table':
            if (!block.rows || block.rows.length === 0) return null;
            return (
              <div key={i} className="overflow-x-auto my-2">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr>
                      {block.rows[0].map((cell, j) => (
                        <th
                          key={j}
                          className="px-2 py-1 text-left font-semibold border-b"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        >
                          {renderInlineMarkdown(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.slice(1).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1 border-b"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                          >
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'paragraph':
            return (
              <div key={i} className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                {renderParagraphContent(block.content ?? '')}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
