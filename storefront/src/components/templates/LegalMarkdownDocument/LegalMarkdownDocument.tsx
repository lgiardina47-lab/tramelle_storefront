import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** react-markdown inoltra `node` (mdast); non è un attributo HTML valido. */
type MdProps = { node?: unknown } & Record<string, unknown>

function stripNode<T extends MdProps>(props: T): Omit<T, "node"> {
  const { node: _n, ...rest } = props
  return rest
}

const components: Components = {
  h1: (props) => (
    <h1 className="heading-xl mb-6 mt-2 uppercase" {...stripNode(props)} />
  ),
  h2: (props) => (
    <h2
      className="heading-md mt-10 mb-4 border-b border-primary/15 pb-2 uppercase text-primary"
      {...stripNode(props)}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-6 mb-2 text-lg font-semibold text-primary"
      {...stripNode(props)}
    />
  ),
  p: (props) => (
    <p
      className="text-md text-secondary mb-4 leading-relaxed"
      {...stripNode(props)}
    />
  ),
  ul: (props) => (
    <ul
      className="mb-4 list-disc space-y-2 pl-6 text-md text-secondary"
      {...stripNode(props)}
    />
  ),
  ol: (props) => (
    <ol
      className="mb-4 list-decimal space-y-2 pl-6 text-md text-secondary"
      {...stripNode(props)}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...stripNode(props)} />,
  hr: (props) => <hr className="my-8 border-primary/20" {...stripNode(props)} />,
  strong: (props) => (
    <strong className="font-semibold text-primary" {...stripNode(props)} />
  ),
  a: ({ node: _n, href, children, ...props }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:opacity-90"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  table: ({ node: _n, children, ...props }) => (
    <div className="my-6 overflow-x-auto">
      <table
        className="w-full min-w-[32rem] border-collapse border border-primary/20 text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: (props) => <thead className="bg-primary/5" {...stripNode(props)} />,
  tbody: (props) => <tbody {...stripNode(props)} />,
  tr: (props) => <tr {...stripNode(props)} />,
  th: (props) => (
    <th
      className="border border-primary/20 px-3 py-2 text-left font-semibold text-primary"
      {...stripNode(props)}
    />
  ),
  td: (props) => (
    <td
      className="border border-primary/20 px-3 py-2 align-top text-secondary"
      {...stripNode(props)}
    />
  ),
}

export function LegalMarkdownDocument({ markdown }: { markdown: string }) {
  return (
    <div className="legal-markdown-md max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
