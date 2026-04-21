import { marked } from 'marked'
import katex from 'katex'

export function renderMarkdown(text: string): string {
  try {
    let html = marked.parse(text, { gfm: true, breaks: true }) as string
    html = html.replace(
      /\$\$((?:[^$]|\$(?!\$))+)\$\$/g,
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
    html = html.replace(
      /\$((?:[a-zA-Z0-9^\\()_{}[\]]|\s)+)\$/g,
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
    return html
  } catch {
    return text
  }
}