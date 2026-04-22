import { marked } from 'marked'
import katex from 'katex'

interface ProtectedBlock {
  placeholder: string
  content: string
}

function protectCodeBlocks(html: string): { html: string; blocks: ProtectedBlock[] } {
  const blocks: ProtectedBlock[] = []
  let counter = 0

  // Protect fenced code blocks (```...```)
  const protectedHtml = html.replace(
    /<pre><code[\s\S]*?<\/code><\/pre>/g,
    (match) => {
      const placeholder = `<!--CODEBLOCK_${counter++}-->`
      blocks.push({ placeholder, content: match })
      return placeholder
    }
  )

  return { html: protectedHtml, blocks }
}

function restoreCodeBlocks(html: string, blocks: ProtectedBlock[]): string {
  return blocks.reduce((acc, { placeholder, content }) => {
    return acc.replace(placeholder, content)
  }, html)
}

export function renderMarkdown(text: string): string {
  try {
    let html = marked.parse(text, { gfm: true, breaks: true }) as string

    // Protect code blocks before applying KaTeX regex
    const { html: protectedHtml, blocks } = protectCodeBlocks(html)

    // Display math: $$...$$
    let processed = protectedHtml.replace(
      /\$\$((?:[^$]|\$(?!\$))+?)\$\$/g,
      (_, tex) => {
        try {
          return katex.renderToString(tex.trim(), {
            displayMode: true,
            throwOnError: false,
          })
        } catch {
          return `<code class="katex-error">$$${tex}$$</code>`
        }
      }
    )

    // Inline math: $...$ (more permissive character set)
    processed = processed.replace(
      /\$((?:[^$\s]|\s(?!\$))+?)\$/g,
      (_, tex) => {
        try {
          return katex.renderToString(tex.trim(), {
            displayMode: false,
            throwOnError: false,
          })
        } catch {
          return `<code class="katex-error">$${tex}$</code>`
        }
      }
    )

    // Restore code blocks
    html = restoreCodeBlocks(processed, blocks)

    return html
  } catch {
    return text
  }
}