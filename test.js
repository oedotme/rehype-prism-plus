import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { visit } from 'unist-util-visit'
import rehype from 'rehype'
import dedent from 'dedent'
import rehypePrism from './index.js'

/**
 * Mock meta in code block
 */
const addMeta = (metastring) => {
  if (!metastring) return
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'code') {
        node.data = { meta: metastring }
      }
    })
  }
}

const processHtml = (html, options, metastring) => {
  return rehype()
    .data('settings', { fragment: true })
    .use(addMeta, metastring)
    .use(rehypePrism, options)
    .processSync(html)
    .toString()
}

test('copies the language- class to pre tag', () => {
  const result = processHtml(dedent`
    <pre><code class="language-py"></code></pre>
  `)
  const expected = dedent`<pre class="language-py"><code class="language-py"></code></pre>`
  assert.is(result, expected)
})

test('add div with class code line for each line', () => {
  const result = processHtml(dedent`
    <pre><code>x = 6</code></pre>
  `)
  const expected = dedent`<pre><code><div class="code-line">x = 6</div></code></pre>`
  assert.is(result, expected)
})

test('finds code and highlights', () => {
  const result = processHtml(dedent`
    <div>
      <p>foo</p>
      <pre><code class="language-py">x = 6</code></pre>
    </div>
    `).trim()
  const expected = dedent`
    <div>
      <p>foo</p>
      <pre class="language-py"><code class="language-py"><div class="code-line">x <span class="token operator">=</span> <span class="token number">6</span></div></code></pre>
    </div>
    `
  assert.is(result, expected)
})

test('handles uppercase correctly', () => {
  const result = processHtml(dedent`
    <div>
      <p>foo</p>
      <pre><code class="language-PY">x = 6</code></pre>
    </div>
    `).trim()
  const expected = dedent`
    <div>
      <p>foo</p>
      <pre class="language-py"><code class="language-PY"><div class="code-line">x <span class="token operator">=</span> <span class="token number">6</span></div></code></pre>
    </div>
    `
  assert.is(result, expected)
})

test('each line of code should be a separate div', async () => {
  const result = processHtml(dedent`
    <div>
      <p>foo</p>
      <pre>
      <code class="language-py">x = 6
      y = 7
      </code>
      </pre>
    </div>
    `).trim()
  const codeLineCount = (result.match(/<div class="code-line">/g) || []).length
  assert.is(codeLineCount, 2)
})

test('should highlight line', async () => {
  const meta = '{1}'
  const result = processHtml(
    dedent`
    <div>
      <pre>
      <code class="language-py">x = 6
      y = 7 
      </code>
      </pre>
    </div>
    `,
    {},
    meta
  ).trim()
  const codeHighlightCount = (result.match(/<div class="code-line highlight-line">/g) || []).length
  assert.is(codeHighlightCount, 1)
})

test('should highlight comma separated lines', async () => {
  const meta = '{1,3}'
  const result = processHtml(
    dedent`
    <div>
      <pre>
      <code class="language-py">x = 6
      y = 7 
      z = 10
      </code>
      </pre>
    </div>
    `,
    {},
    meta
  ).trim()
  const codeHighlightCount = (result.match(/<div class="code-line highlight-line">/g) || []).length
  assert.is(codeHighlightCount, 2)
})

test('should highlight range separated lines', async () => {
  const meta = '{1-3}'
  const result = processHtml(
    dedent`
    <div>
      <pre>
      <code class="language-py">x = 6
      y = 7 
      z = 10
      </code>
      </pre>
    </div>
    `,
    {},
    meta
  ).trim()
  const codeHighlightCount = (result.match(/<div class="code-line highlight-line">/g) || []).length
  assert.is(codeHighlightCount, 3)
})

test('showLineNumbers option add line numbers', async () => {
  const result = processHtml(
    dedent`
    <div>
      <pre>
      <code class="language-py">x = 6
      y = 7
      </code>
      </pre>
    </div>
    `,
    { showLineNumbers: true }
  ).trim()
  assert.ok(result.match(/line="1"/g))
  assert.ok(result.match(/line="2"/g))
  assert.not(result.match(/line="3"/g))
})

test('showLineNumbers property works in meta field', async () => {
  const meta = 'showLineNumbers'
  const result = processHtml(
    dedent`
    <div>
      <pre>
      <code class="language-py">x = 6
      y = 7
      </code>
      </pre>
    </div>
    `,
    {},
    meta
  ).trim()
  assert.ok(result.match(/line="1"/g))
  assert.ok(result.match(/line="2"/g))
  assert.not(result.match(/line="3"/g))
})

test('should support both highlighting and add line number', async () => {
  const meta = '{1} showLineNumbers'
  const result = processHtml(
    dedent`
    <div>
      <pre>
      <code class="language-py">x = 6
      y = 7 
      z = 10
      </code>
      </pre>
    </div>
    `,
    {},
    meta
  ).trim()
  const codeHighlightCount = (result.match(/highlight-line/g) || []).length
  assert.is(codeHighlightCount, 1)
  assert.ok(result.match(/line="1"/g))
  assert.ok(result.match(/line="2"/g))
})

test('throw error with fake language- class', () => {
  assert.throws(
    () =>
      processHtml(dedent`
  <pre><code class="language-thisisnotalanguage">x = 6</code></pre>
`),
    /Unknown language/
  )
})

test('with options.ignoreMissing, does nothing to code block with fake language- class', () => {
  const result = processHtml(
    dedent`
    <pre><code class="language-thisisnotalanguage">x = 6</code></pre>
  `,
    { ignoreMissing: true }
  )
  const expected = dedent`<pre class="language-thisisnotalanguage"><code class="language-thisisnotalanguage"><div class="code-line">x = 6</div></code></pre>`
  assert.is(result, expected)
})

test.run()