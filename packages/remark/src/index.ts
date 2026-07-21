import {relative} from 'node:path'
import type {
  BlockContent,
  Blockquote,
  Emphasis,
  Link,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Text
} from 'mdast'
import type {
  ContainerDirective,
  Directives
} from 'mdast-util-directive'
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement
} from 'mdast-util-mdx-jsx'
import type {Node, Parent} from 'unist'
import type {VFile} from 'vfile'
import {directiveDefinitions, isHandwrittenDirectiveName} from './schema.js'
import type {DirectiveDefinition, DirectiveKind} from './schema.js'
import {
  handwrittenComponentNames,
  handwrittenDirectiveNames
} from './types.js'
import type {
  HandwrittenComponentNames,
  HandwrittenDirectiveName,
  HandwrittenOptions,
  HandwrittenRuleId,
  HandwrittenUsage,
  RemarkMdxHandwrittenPlugin
} from './types.js'

export {
  handwrittenComponentNames,
  handwrittenDirectiveNames
} from './types.js'
export type {
  HandwrittenAlign,
  HandwrittenComponentNames,
  HandwrittenDiagnostics,
  HandwrittenDirectiveName,
  HandwrittenDistance,
  HandwrittenFileData,
  HandwrittenImports,
  HandwrittenLimits,
  HandwrittenOptions,
  HandwrittenOutput,
  HandwrittenRotation,
  HandwrittenRuleId,
  HandwrittenSize,
  HandwrittenTone,
  HandwrittenUsage,
  HandwrittenVariantOptions,
  HandwrittenWeight,
  RemarkMdxHandwrittenPlugin
} from './types.js'

type HandDirective = Directives & Node

interface ResolvedOptions {
  output: 'component' | 'element' | 'strip'
  imports: {mode: 'manual'} | {mode: 'auto'; source: string}
  components: HandwrittenComponentNames
  variant: {count: 1 | 2 | 3 | 4; seed: string; projectRoot?: string}
  diagnostics: 'strict' | 'warn'
  maxDirectivesPerFile: number
  recordUsage: boolean
}

interface ValidatedDirective {
  name: HandwrittenDirectiveName
  definition: DirectiveDefinition
  attributes: Record<string, string>
  containerLabel?: string
  containerBodyStart: number
  variant: string
  valid: boolean
}

interface ValidationContext {
  file: VFile
  options: ResolvedOptions
  metadata: WeakMap<HandDirective, ValidatedDirective>
  errors: Array<ReturnType<VFile['message']>>
  ordinal: number
  recognized: number
  warnedForPath: boolean
  canAutoImport: boolean
  usage: HandwrittenUsage
}

const sourceName = 'remark-mdx-handwritten'

function resolveOptions(options: HandwrittenOptions | undefined): ResolvedOptions {
  const variantCount = options?.variant?.count ?? 4
  const projectRoot = options?.variant?.projectRoot
  return {
    output: options?.output ?? 'component',
    imports: options?.imports ?? {mode: 'manual'},
    components: {...handwrittenComponentNames, ...options?.components},
    variant: {
      count: variantCount,
      seed: options?.variant?.seed ?? 'mdx-handwritten',
      ...(projectRoot === undefined ? {} : {projectRoot})
    },
    diagnostics: options?.diagnostics ?? 'strict',
    maxDirectivesPerFile: options?.limits?.maxDirectivesPerFile ?? 500,
    recordUsage: options?.recordUsage ?? false
  }
}

function report(
  context: ValidationContext,
  node: Node,
  ruleId: HandwrittenRuleId,
  reason: string,
  severity: 'error' | 'warning' = 'error'
): void {
  const message = context.file.message(reason, node)
  message.source = sourceName
  message.ruleId = ruleId
  message.fatal = severity === 'error' && context.options.diagnostics === 'strict'
  if (severity === 'error') context.errors.push(message)
}

function isParent(node: Node): node is Node & Parent {
  return Array.isArray((node as Node & {children?: unknown}).children)
}

function isDirective(node: Node): node is HandDirective {
  return (
    node.type === 'textDirective' ||
    node.type === 'leafDirective' ||
    node.type === 'containerDirective'
  )
}

function hasVisibleContent(node: Parent): boolean {
  return textContent(node).trim().length > 0 || node.children.some((child) => child.type !== 'text')
}

function textContent(node: Node): string {
  if (node.type === 'text') return (node as Text).value
  if (node.type === 'inlineCode' || node.type === 'code') {
    return String((node as Node & {value?: string}).value ?? '')
  }
  if (!isParent(node)) return ''
  return node.children.map(textContent).join('')
}

function containerLabel(node: ContainerDirective): {
  value?: string
  present: boolean
  pure: boolean
} {
  const first = node.children[0]
  if (
    !first ||
    first.type !== 'paragraph' ||
    first.data?.directiveLabel !== true
  ) {
    return {present: false, pure: false}
  }
  const pure = first.children.every((child) => child.type === 'text')
  return pure
    ? {value: first.children.map(textContent).join(''), present: true, pure}
    : {present: true, pure}
}

interface RawAttribute {
  name: string
  quoted: boolean
}

function rawAttributeTokens(node: Node, file: VFile): RawAttribute[] | undefined {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) return undefined
  const completeSource = String(file.value).slice(start, end)
  const source = (
    node.type === 'containerDirective'
      ? completeSource.split(/\r?\n/u, 1)[0] ?? ''
      : completeSource
  ).trimEnd()
  if (!source.endsWith('}')) return []

  let quote: '"' | "'" | undefined
  let escaped = false
  let depth = 0
  let blockStart = -1
  let finalBlockStart = -1
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = undefined
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
    } else if (character === '{') {
      if (depth === 0) blockStart = index
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth === 0 && source.slice(index + 1).trim() === '') finalBlockStart = blockStart
    }
  }
  if (finalBlockStart < 0) return []

  const body = source.slice(finalBlockStart + 1, -1)
  const result: RawAttribute[] = []
  let index = 0
  while (index < body.length) {
    while (/\s/u.test(body[index] ?? '')) index += 1
    if (index >= body.length) break
    if (body[index] === '#' || body[index] === '.') {
      const startIndex = index
      index += 1
      while (/[-\w]/u.test(body[index] ?? '')) index += 1
      result.push({name: body.slice(startIndex, index), quoted: false})
      continue
    }
    const nameMatch = /^[A-Za-z][A-Za-z0-9_-]*/u.exec(body.slice(index))
    if (!nameMatch) return result.concat({name: body.slice(index).trim(), quoted: false})
    const name = nameMatch[0]
    index += name.length
    while (/\s/u.test(body[index] ?? '')) index += 1
    if (body[index] !== '=') {
      result.push({name, quoted: false})
      continue
    }
    index += 1
    while (/\s/u.test(body[index] ?? '')) index += 1
    const valueQuote = body[index]
    if (valueQuote !== '"' && valueQuote !== "'") {
      while (index < body.length && !/\s/u.test(body[index] ?? '')) index += 1
      result.push({name, quoted: false})
      continue
    }
    index += 1
    escaped = false
    while (index < body.length) {
      const character = body[index]
      index += 1
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === valueQuote) break
    }
    result.push({name, quoted: true})
  }
  return result
}

function safeHref(value: string): boolean {
  if (value !== value.trim() || value.length === 0) return false
  if (
    value.startsWith('//') ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    value.includes('\\')
  ) {
    return false
  }
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/u.exec(value)?.[1]?.toLowerCase()
  return scheme === undefined || ['http', 'https', 'mailto', 'tel'].includes(scheme)
}

function stablePath(context: ValidationContext, node: Node): string {
  const filePath = context.file.path
  if (!filePath) {
    if (!context.warnedForPath) {
      report(
        context,
        node,
        'variant-path-missing',
        'A VFile path was not provided; visual variants use a stable anonymous path.',
        'warning'
      )
      context.warnedForPath = true
    }
    return '<anonymous>'
  }
  const root = context.options.variant.projectRoot ?? context.file.cwd
  const path = relative(root, filePath)
  return path.replaceAll('\\', '/')
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const reservedBindings = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield'
])

function validBinding(value: string): boolean {
  return (
    /^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*$/u.test(value) &&
    !reservedBindings.has(value)
  )
}

function objectValue(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined
}

function collectBindings(root: Root): Set<string> {
  const result = new Set<string>()
  const collectDeclaration = (statement: unknown): void => {
    const declarationId = objectValue(statement, 'id')
    const declarationName = objectValue(declarationId, 'name')
    if (typeof declarationName === 'string') result.add(declarationName)
    const declarations = objectValue(statement, 'declarations')
    if (Array.isArray(declarations)) {
      for (const declaration of declarations) {
        const name = objectValue(objectValue(declaration, 'id'), 'name')
        if (typeof name === 'string') result.add(name)
      }
    }
  }
  for (const child of root.children as Node[]) {
    if (child.type !== 'mdxjsEsm') continue
    const body = objectValue(objectValue(child.data, 'estree'), 'body')
    if (!Array.isArray(body)) continue
    for (const statement of body) {
      const specifiers = objectValue(statement, 'specifiers')
      if (Array.isArray(specifiers)) {
        for (const specifier of specifiers) {
          const name = objectValue(objectValue(specifier, 'local'), 'name')
          if (typeof name === 'string') result.add(name)
        }
      }
      collectDeclaration(statement)
      collectDeclaration(objectValue(statement, 'declaration'))
    }
  }
  return result
}

function usedComponentNames(context: ValidationContext): string[] {
  return [
    ...new Set(
      handwrittenDirectiveNames
        .filter((name) => context.usage.directives[name] > 0)
        .map(
          (name) =>
            context.options.components[directiveDefinitions[name].componentKey]
        )
    )
  ]
}

function validateConfiguration(root: Root, context: ValidationContext): void {
  if (context.options.output !== 'component') return
  const names = usedComponentNames(context)
  for (const name of names) {
    if (!validBinding(name)) {
      report(
        context,
        root,
        'component-invalid',
        `Component name ${JSON.stringify(name)} is not a valid JavaScript identifier.`
      )
      context.canAutoImport = false
    }
  }
  if (context.options.imports.mode !== 'auto') return
  const source = context.options.imports.source
  if (source.trim().length === 0 || /[\r\n\u0000]/u.test(source)) {
    report(context, root, 'import-conflict', 'Auto-import source must be a non-empty, single-line module specifier.')
    context.canAutoImport = false
  }
  const existing = collectBindings(root)
  const conflicts = names.filter((name) => existing.has(name))
  if (conflicts.length > 0) {
    report(
      context,
      root,
      'import-conflict',
      `Auto-import would redeclare: ${conflicts.join(', ')}.`
    )
    context.canAutoImport = false
  }
}

function autoImportNode(options: ResolvedOptions, names: string[]): RootContent {
  if (options.imports.mode !== 'auto') {
    throw new Error('Expected auto import options')
  }
  const source = options.imports.source
  const value = `import { ${names.join(', ')} } from ${JSON.stringify(source)}`
  const specifiers = names.map((name) => ({
    type: 'ImportSpecifier',
    imported: {type: 'Identifier', name},
    local: {type: 'Identifier', name}
  }))
  return {
    type: 'mdxjsEsm',
    value,
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ImportDeclaration',
            specifiers,
            source: {type: 'Literal', value: source, raw: JSON.stringify(source)}
          }
        ]
      }
    }
  } as unknown as RootContent
}

function variantFor(context: ValidationContext, node: Node): string {
  const input = [
    context.options.variant.seed,
    stablePath(context, node),
    String(context.ordinal),
    textContent(node).normalize('NFC')
  ].join('\u0000')
  return String((fnv1a(input) % context.options.variant.count) + 1)
}

function validateNesting(
  context: ValidationContext,
  node: HandDirective,
  name: HandwrittenDirectiveName,
  ancestors: HandwrittenDirectiveName[]
): void {
  const nearest = ancestors.at(-1)
  if (nearest === 'hw-text' && name !== 'hw-mark') {
    report(context, node, 'nesting-invalid', `${name} cannot be nested in hw-text.`)
  } else if (nearest === 'hw-note' && name !== 'hw-mark') {
    report(context, node, 'nesting-invalid', `${name} cannot be nested in hw-note.`)
  } else if (
    nearest === 'hw-link' ||
    nearest === 'hw-mark' ||
    nearest === 'hw-annotate'
  ) {
    report(context, node, 'nesting-invalid', `${nearest} cannot contain ${name}.`)
  }

  const ranks: Partial<Record<HandwrittenDirectiveName, number>> = {
    'hw-watermark': 0,
    'hw-margin': 1,
    'hw-brace': 2
  }
  const rank = ranks[name]
  if (rank === undefined) return
  for (const ancestor of ancestors) {
    const ancestorRank = ranks[ancestor]
    if (ancestorRank !== undefined && ancestorRank >= rank) {
      report(
        context,
        node,
        'nesting-invalid',
        'Container order must be hw-watermark > hw-margin > hw-brace > content, with no repeated container.'
      )
      return
    }
  }
}

function validateAttributes(
  context: ValidationContext,
  node: HandDirective,
  definition: DirectiveDefinition
): Record<string, string> {
  const result: Record<string, string> = {}
  const raw = rawAttributeTokens(node, context.file)
  if (raw) {
    const counts = new Map<string, number>()
    for (const token of raw) {
      const normalized = token.name.startsWith('#')
        ? 'id'
        : token.name.startsWith('.')
          ? 'className'
          : token.name
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
      if (!token.quoted) {
        report(
          context,
          node,
          'attribute-dynamic',
          `Attribute ${JSON.stringify(normalized)} must use a quoted static string value.`
        )
      }
    }
    for (const [name, count] of counts) {
      if (count > 1) {
        report(context, node, 'attribute-duplicate', `Attribute ${JSON.stringify(name)} is repeated.`)
      }
    }
  }

  const attributes = node.attributes ?? {}
  for (const [name, value] of Object.entries(attributes)) {
    const attribute = definition.attributes[name]
    if (!attribute) {
      report(context, node, 'attribute-unknown', `Unknown attribute ${JSON.stringify(name)} on ${node.name}.`)
      continue
    }
    if (typeof value !== 'string') {
      report(context, node, 'attribute-dynamic', `Attribute ${JSON.stringify(name)} must be a quoted static string.`)
      continue
    }
    if (attribute.values && !attribute.values.includes(value)) {
      report(
        context,
        node,
        'attribute-invalid',
        `Invalid ${name}=${JSON.stringify(value)}; expected one of ${attribute.values.join(', ')}.`
      )
      continue
    }
    if (attribute.required && value.trim().length === 0) {
      report(context, node, 'attribute-invalid', `Attribute ${JSON.stringify(name)} cannot be empty.`)
      continue
    }
    if (
      attribute.maximumLength !== undefined &&
      Array.from(value).length > attribute.maximumLength
    ) {
      report(
        context,
        node,
        'label-too-long',
        `${name} exceeds the ${attribute.maximumLength}-character limit.`
      )
      continue
    }
    result[name] = value
  }

  for (const [name, attribute] of Object.entries(definition.attributes)) {
    if (!(name in result)) {
      if (attribute.required && !(name in attributes)) {
        report(context, node, 'attribute-invalid', `Missing required attribute ${JSON.stringify(name)}.`)
      } else if (attribute.default !== undefined) {
        result[name] = attribute.default
      }
    }
  }

  if (node.name === 'hw-link' && result.href && !safeHref(result.href)) {
    report(context, node, 'url-unsafe', `Unsafe link URL ${JSON.stringify(result.href)}.`)
  }
  return result
}

const interactiveTags = new Set([
  'a',
  'area',
  'audio',
  'button',
  'details',
  'embed',
  'iframe',
  'input',
  'select',
  'summary',
  'textarea',
  'video'
])

function isInteractiveNode(node: Node): boolean {
  if (node.type === 'link' || node.type === 'linkReference') return true
  if (node.type === 'html') {
    const value = String((node as Node & {value?: string}).value ?? '')
    if (/<\/?(?:a|area|audio|button|details|embed|iframe|input|select|summary|textarea|video)\b/iu.test(value)) {
      return true
    }
  }
  if (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') {
    const element = node as Node & {
      name?: string | null
      attributes?: Array<{type: string; name?: string}>
    }
    if (element.name && interactiveTags.has(element.name.toLowerCase())) return true
    if (
      element.attributes?.some(
        (attribute) =>
          attribute.type === 'mdxJsxExpressionAttribute' ||
          attribute.name === 'href' ||
          attribute.name === 'tabIndex' ||
          attribute.name?.startsWith('on') === true
      )
    ) {
      return true
    }
  }
  return false
}

function containsInteractive(node: Node): boolean {
  return (
    isInteractiveNode(node) ||
    (isParent(node) && node.children.some(containsInteractive))
  )
}

function validateTree(
  node: Node,
  context: ValidationContext,
  ancestors: HandwrittenDirectiveName[] = [],
  interactiveAncestor = false
): void {
  if (!isDirective(node)) {
    if (isParent(node)) {
      const nextInteractive = interactiveAncestor || isInteractiveNode(node)
      for (const child of node.children) {
        validateTree(child, context, ancestors, nextInteractive)
      }
    }
    return
  }

  const resemblesHandwritten = node.name.toLowerCase().startsWith('hw-')
  if (!resemblesHandwritten) {
    for (const child of node.children) {
      validateTree(child, context, ancestors, interactiveAncestor)
    }
    return
  }

  context.ordinal += 1
  context.recognized += 1
  const errorsBefore = context.errors.length
  if (!isHandwrittenDirectiveName(node.name)) {
    report(context, node, 'directive-unknown', `Unknown handwritten directive ${JSON.stringify(node.name)}.`)
    for (const child of node.children) {
      validateTree(child, context, ancestors, interactiveAncestor)
    }
    return
  }

  const name = node.name
  const definition = directiveDefinitions[name]
  context.usage.directives[name] += 1
  context.usage.total += 1
  validateNesting(context, node, name, ancestors)
  if (
    interactiveAncestor &&
    (name === 'hw-link' || name === 'hw-annotate')
  ) {
    report(
      context,
      node,
      'nesting-invalid',
      `${name} cannot be placed inside a link or interactive JSX element.`
    )
  }
  if (node.type !== definition.kind) {
    report(
      context,
      node,
      'directive-wrong-kind',
      `${name} must use ${kindExample(definition.kind)} syntax.`
    )
  }
  const attributes = validateAttributes(context, node, definition)

  if (
    (name === 'hw-link' || name === 'hw-mark' || name === 'hw-annotate') &&
    node.children.some(containsInteractive)
  ) {
    report(
      context,
      node,
      'nesting-invalid',
      `${name} cannot contain a link, control, or interactive JSX element.`
    )
  }

  let label: string | undefined
  let bodyStart = 0
  if (node.type === 'containerDirective') {
    const parsedLabel = containerLabel(node)
    if (!parsedLabel.present) {
      report(context, node, 'directive-empty', `${name} requires a bracket label.`)
    } else {
      bodyStart = 1
      if (!parsedLabel.pure || parsedLabel.value === undefined) {
        report(context, node, 'attribute-invalid', `${name} label must contain plain text only.`)
      } else {
        label = parsedLabel.value
        if (label.trim().length === 0) {
          report(context, node, 'directive-empty', `${name} label cannot be empty.`)
        } else if (
          definition.containerLabelMaximum !== undefined &&
          Array.from(label).length > definition.containerLabelMaximum
        ) {
          report(
            context,
            node,
            'label-too-long',
            `${name} label exceeds the ${definition.containerLabelMaximum}-character limit.`
          )
        }
      }
    }
    const body = node.children.slice(bodyStart)
    if (
      definition.requiresContent &&
      !body.some((child) => textContent(child).trim().length > 0 || isParent(child))
    ) {
      report(context, node, 'directive-empty', `${name} body cannot be empty.`)
    }
  } else if (definition.requiresContent && !hasVisibleContent(node)) {
    report(context, node, 'directive-empty', `${name} content cannot be empty.`)
  }

  const variant = variantFor(context, node)
  const metadata: ValidatedDirective = {
    name,
    definition,
    attributes,
    containerBodyStart: bodyStart,
    variant,
    valid: context.errors.length === errorsBefore,
    ...(label === undefined ? {} : {containerLabel: label})
  }
  context.metadata.set(node, metadata)

  const nextAncestors = ancestors.concat(name)
  const children =
    node.type === 'containerDirective' ? node.children.slice(bodyStart) : node.children
  for (const child of children) {
    validateTree(
      child,
      context,
      nextAncestors,
      interactiveAncestor || name === 'hw-link'
    )
  }
}

function kindExample(kind: DirectiveKind): string {
  if (kind === 'textDirective') return 'a single-colon inline directive'
  if (kind === 'leafDirective') return 'a double-colon leaf directive'
  return 'a triple-colon container directive'
}

function camelCase(value: string): string {
  return value.replace(/-([a-z])/gu, (_, character: string) => character.toUpperCase())
}

function jsxAttributes(metadata: ValidatedDirective): MdxJsxAttribute[] {
  const attributes: MdxJsxAttribute[] = []
  for (const [name, value] of Object.entries(metadata.attributes)) {
    attributes.push({type: 'mdxJsxAttribute', name: camelCase(name), value})
  }
  if (metadata.containerLabel !== undefined) {
    attributes.push({type: 'mdxJsxAttribute', name: 'label', value: metadata.containerLabel})
  }
  attributes.push({
    type: 'mdxJsxAttribute',
    name: 'data-hw-variant',
    value: metadata.variant
  })
  return attributes
}

function componentNode(
  node: HandDirective,
  metadata: ValidatedDirective,
  components: HandwrittenComponentNames
): MdxJsxTextElement | MdxJsxFlowElement {
  const name = components[metadata.definition.componentKey]
  const children =
    node.type === 'containerDirective'
      ? node.children.slice(metadata.containerBodyStart)
      : node.type === 'leafDirective'
        ? [paragraph(node.children)]
        : node.children
  if (metadata.definition.kind === 'textDirective') {
    return {
      type: 'mdxJsxTextElement',
      name,
      attributes: jsxAttributes(metadata),
      children: children as PhrasingContent[],
      ...(node.position ? {position: node.position} : {})
    }
  }
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: jsxAttributes(metadata),
    children: children as BlockContent[],
    ...(node.position ? {position: node.position} : {})
  }
}

function elementProperties(
  metadata: ValidatedDirective,
  omit: readonly string[] = []
): Record<string, string> {
  const properties: Record<string, string> = {
    'data-hw': metadata.definition.componentKey,
    'data-hw-variant': metadata.variant
  }
  for (const [name, value] of Object.entries(metadata.attributes)) {
    if (!omit.includes(name)) properties[`data-hw-${name}`] = value
  }
  return properties
}

function paragraph(children: PhrasingContent[]): Paragraph {
  return {type: 'paragraph', children}
}

function hastData(
  hName: string,
  hProperties: Record<string, unknown>
): NonNullable<Paragraph['data']> {
  return {hName, hProperties} as NonNullable<Paragraph['data']>
}

function inlineElement(
  tagName: string,
  properties: Record<string, unknown>,
  children: PhrasingContent[]
): Emphasis {
  return {
    type: 'emphasis',
    data: hastData(tagName, properties),
    children
  }
}

function flowElement(
  tagName: string,
  properties: Record<string, unknown>,
  children: BlockContent[]
): Blockquote {
  return {
    type: 'blockquote',
    data: hastData(tagName, properties),
    children
  }
}

function labelText(value: string): Text {
  return {type: 'text', value}
}

const iconPaths: Readonly<Record<string, string>> = {
  check: 'M4 12.5 9.2 18 20 6',
  cross: 'M6 6 18 18M18 6 6 18',
  info: 'M12 10v7M12 7h.01M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
  warning: 'M12 3 22 20H2L12 3ZM12 9v5M12 17h.01',
  spark: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z',
  'arrow-forward': 'M4 12h15M13 6l6 6-6 6',
  'arrow-back': 'M20 12H5M11 6l-6 6 6 6',
  external: 'M10 5H5v14h14v-5M13 5h6v6M19 5l-9 9',
  'arrow-toward': 'M3 7c7 0 12 3 16 10M13 17h6v-6',
  'arrow-away': 'M21 17C14 17 9 14 5 7M11 7H5v6'
}

function resolvedIcon(attributes: Record<string, string>): string {
  const icon = attributes.icon ?? 'none'
  if (icon !== 'auto') return icon
  const tone = attributes.tone
  if (tone === 'success') return 'check'
  if (tone === 'warning') return 'warning'
  if (tone === 'danger') return 'cross'
  if (tone === 'info') return 'info'
  if (tone === 'accent') return 'spark'
  return 'none'
}

function svgElement(
  dataAttribute: string,
  path: string,
  options: {
    viewBox?: string
    preserveAspectRatio?: string
    dataValue?: string
  } = {}
): Emphasis {
  const pathNode = inlineElement(
    'path',
    {
      d: path,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    },
    []
  )
  return inlineElement(
    'svg',
    {
      [dataAttribute]: options.dataValue ?? '',
      ariaHidden: true,
      focusable: false,
      viewBox: options.viewBox ?? '0 0 24 24',
      ...(options.preserveAspectRatio
        ? {preserveAspectRatio: options.preserveAspectRatio}
        : {})
    },
    [pathNode]
  )
}

function flowSvgElement(
  dataAttribute: string,
  path: string,
  options: {
    viewBox?: string
    preserveAspectRatio?: string
    dataValue?: string
  } = {}
): Paragraph {
  const inline = svgElement(dataAttribute, path, options)
  const result = paragraph(inline.children)
  result.data = hastData('svg', {
    [dataAttribute]: options.dataValue ?? '',
    ariaHidden: true,
    focusable: false,
    viewBox: options.viewBox ?? '0 0 24 24',
    ...(options.preserveAspectRatio
      ? {preserveAspectRatio: options.preserveAspectRatio}
      : {})
  })
  return result
}

function elementNode(
  node: HandDirective,
  metadata: ValidatedDirective
): RootContent | PhrasingContent {
  const properties = elementProperties(metadata, ['href', 'target', 'label'])
  const body =
    node.type === 'containerDirective'
      ? (node.children.slice(metadata.containerBodyStart) as BlockContent[])
      : []

  switch (metadata.name) {
    case 'hw-text':
      return inlineElement('span', properties, node.children as PhrasingContent[])
    case 'hw-link': {
      const label = inlineElement(
        'span',
        {'data-hw-label': ''},
        node.children as PhrasingContent[]
      )
      const iconName = resolvedIcon(metadata.attributes)
      const icon =
        iconName === 'none'
          ? undefined
          : svgElement('data-hw-glyph', iconPaths[iconName] ?? iconPaths.external ?? '', {
              dataValue: iconName
            })
      const target = metadata.attributes.target === 'blank' ? '_blank' : undefined
      const link: Link = {
        type: 'link',
        url: metadata.attributes.href ?? '',
        data: {
          hProperties: {
            ...properties,
            ...(target ? {target, rel: ['noopener', 'noreferrer']} : {})
          }
        },
        children: icon
          ? iconName === 'arrow-back'
            ? [icon, label]
            : [label, icon]
          : [label]
      }
      return link
    }
    case 'hw-mark':
      return inlineElement(
        metadata.attributes.kind === 'highlight' ? 'mark' : 'em',
        properties,
        node.children as PhrasingContent[]
      )
    case 'hw-annotate': {
      const target = inlineElement(
        'span',
        {'data-hw-target': ''},
        node.children as PhrasingContent[]
      )
      const label = inlineElement(
        'span',
        {'data-hw-label': '', dir: 'auto'},
        [labelText(metadata.attributes.label ?? '')]
      )
      const connector =
        metadata.attributes.arrow === 'none'
          ? undefined
          : svgElement(
              'data-hw-connector',
              metadata.attributes.arrow === 'straight'
                ? 'M3 18 44 5M38 3l6 2-3 6'
                : 'M3 18C16 20 27 4 44 7M38 4l6 3-4 5',
              {viewBox: '0 0 48 24'}
            )
      return inlineElement(
        'span',
        properties,
        connector ? [target, label, connector] : [target, label]
      )
    }
    case 'hw-note': {
      const iconName = resolvedIcon(metadata.attributes)
      const icon = flowSvgElement('data-hw-glyph', iconPaths[iconName] ?? '', {
        dataValue: iconName
      })
      const bodyNode = flowElement('div', {'data-hw-body': ''}, [
        paragraph(node.children as PhrasingContent[])
      ])
      return flowElement(
        'div',
        properties,
        iconName === 'none' ? [bodyNode] : [icon, bodyNode]
      )
    }
    case 'hw-brace': {
      const bodyNode = flowElement('div', {'data-hw-body': ''}, body)
      const decoration = paragraph([
        svgElement(
          'data-hw-brace-glyph',
          'M22 1C10 1 16 38 3 44 16 50 10 99 22 99',
          {viewBox: '0 0 24 100', preserveAspectRatio: 'none'}
        )
      ])
      decoration.data = hastData('span', {
        'data-hw-brace': '',
        ariaHidden: true
      })
      const caption = paragraph([labelText(metadata.containerLabel ?? '')])
      caption.data = hastData('figcaption', {'data-hw-label': '', dir: 'auto'})
      return flowElement('figure', properties, [bodyNode, decoration, caption])
    }
    case 'hw-margin': {
      const bodyNode = flowElement('div', {'data-hw-body': ''}, body)
      const iconName = resolvedIcon(metadata.attributes)
      const note = paragraph([
        ...(iconName === 'none'
          ? []
          : [
              svgElement('data-hw-glyph', iconPaths[iconName] ?? '', {
                dataValue: iconName
              })
            ]),
        labelText(metadata.containerLabel ?? '')
      ])
      note.data = hastData('aside', {'data-hw-label': '', dir: 'auto'})
      return flowElement('div', properties, [bodyNode, note])
    }
    case 'hw-watermark': {
      const bodyNode = flowElement('div', {'data-hw-body': ''}, body)
      const label = paragraph([labelText(metadata.containerLabel ?? '')])
      label.data = hastData('span', {
        'data-hw-label': '',
        dir: 'auto',
        ariaHidden: true
      })
      return flowElement('div', properties, [bodyNode, label])
    }
  }
}

function stripNode(node: HandDirective, metadata?: ValidatedDirective): Node[] {
  const name = metadata?.name
  const bodyStart = metadata?.containerBodyStart ?? 0
  if (node.type === 'textDirective') {
    if (name === 'hw-link' && metadata?.attributes.href) {
      const link: Link = {
        type: 'link',
        url: metadata.attributes.href,
        children: node.children as PhrasingContent[]
      }
      return [link]
    }
    if (name === 'hw-mark') {
      return [
        {type: 'emphasis', children: node.children as PhrasingContent[]} as Emphasis
      ]
    }
    if (name === 'hw-annotate' && metadata?.attributes.label) {
      return [
        ...(node.children as Node[]),
        {type: 'text', value: ` (${metadata.attributes.label})`} as Text
      ]
    }
    return node.children as Node[]
  }
  if (node.type === 'leafDirective') {
    return [paragraph(node.children as PhrasingContent[])]
  }
  const body = node.children.slice(bodyStart) as Node[]
  if (name === 'hw-watermark') return body
  const label = metadata?.containerLabel
  if (!label) return body
  if (name === 'hw-margin') {
    return body.concat(
      flowElement('aside', {}, [paragraph([labelText(label)])]) as unknown as Node
    )
  }
  return body.concat(paragraph([labelText(label)]))
}

function transformChildren(
  parent: Parent,
  context: ValidationContext
): void {
  const transformed: Node[] = []
  for (const child of parent.children) {
    if (isParent(child)) transformChildren(child, context)
    if (!isDirective(child) || !child.name.toLowerCase().startsWith('hw-')) {
      transformed.push(child)
      continue
    }
    const metadata = context.metadata.get(child)
    if (!metadata || !metadata.valid) {
      transformed.push(...stripNode(child, metadata))
      continue
    }
    if (context.options.output === 'strip') {
      transformed.push(...stripNode(child, metadata))
    } else if (context.options.output === 'element') {
      transformed.push(elementNode(child, metadata) as Node)
    } else {
      transformed.push(
        componentNode(child, metadata, context.options.components) as Node
      )
    }
  }
  parent.children = transformed
}

function emptyUsage(): HandwrittenUsage {
  return {
    total: 0,
    directives: Object.fromEntries(
      handwrittenDirectiveNames.map((name) => [name, 0])
    ) as Record<HandwrittenDirectiveName, number>
  }
}

/**
 * Compile the eight strict `hw-*` directives after `remark-directive` has
 * parsed them. All author attributes stay static and schema-controlled.
 */
export const remarkMdxHandwritten: RemarkMdxHandwrittenPlugin = function (
  options
) {
  const resolved = resolveOptions(options)
  return (tree, file) => {
    const context: ValidationContext = {
      file,
      options: resolved,
      metadata: new WeakMap(),
      errors: [],
      ordinal: 0,
      recognized: 0,
      warnedForPath: false,
      canAutoImport: true,
      usage: emptyUsage()
    }
    validateTree(tree, context)
    validateConfiguration(tree, context)
    if (context.recognized > resolved.maxDirectivesPerFile) {
      report(
        context,
        tree,
        'directive-limit',
        `File contains ${context.recognized} handwritten directives; limit is ${resolved.maxDirectivesPerFile}.`
      )
    }
    if (resolved.recordUsage) {
      file.data.mdxHandwritten = context.usage
    }
    if (resolved.diagnostics === 'strict' && context.errors.length > 0) {
      throw context.errors[0]
    }
    transformChildren(tree, context)
    if (
      resolved.output === 'component' &&
      resolved.imports.mode === 'auto' &&
      context.canAutoImport &&
      context.usage.total > 0
    ) {
      tree.children.unshift(autoImportNode(resolved, usedComponentNames(context)))
    }
  }
}

export default remarkMdxHandwritten
