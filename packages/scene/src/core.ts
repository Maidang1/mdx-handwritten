export const annotationRecipeNames = ['task-explainer'] as const

export type AnnotationRecipeName = (typeof annotationRecipeNames)[number]

export type AnnotationSceneLocale = 'en' | 'zh-CN'

export type NonEmpty<T> = readonly [T, ...T[]]

export interface SourceRangeV1 {
  start: number
  end: number
  exactText: string
}

export interface AnnotationTargetV1 {
  id: string
  role: string
  semanticAnchor?: {name: string}
  ranges: NonEmpty<SourceRangeV1>
}

export interface AnnotationLabelV1 {
  id: string
  text: string
}

export type AnnotationRelationshipV1 =
  | {
      id: string
      kind: 'describes'
      labelId: string
      targetIds: NonEmpty<string>
      detailKind: 'short-description'
      legendText: string
    }
  | {
      id: string
      kind: 'relates'
      relation: 'depends-on' | 'contrasts' | 'changes-to'
      labelId: string
      fromTargetIds: NonEmpty<string>
      toTargetIds: NonEmpty<string>
      detailKind: 'short-description'
      legendText: string
    }

export type AnnotationGestureV1 =
  | {id: string; kind: 'annotate'; relationshipId: string}
  | {
      id: string
      kind: 'emphasize'
      targetIds: NonEmpty<string>
      intent: 'attention' | 'positive' | 'warning' | 'negative'
    }
  | {id: string; kind: 'group' | 'connect'; relationshipId: string}
  | {
      id: string
      kind: 'verdict'
      relationshipId: string
      intent: 'positive' | 'negative' | 'warning'
    }

export type ScenePlanProvenanceV1 =
  | {
      kind: 'deterministic-recipe'
      engine: {name: '@madinah/mdx-handwritten-scene'; version: string}
      appliedCorrections: readonly {
        kind: 'target' | 'label' | 'relationship'
        ref: string
      }[]
    }
  | {
      kind: 'reviewed-proposal'
      engine: {name: '@madinah/mdx-handwritten-scene'; version: string}
      generator: {id: string; version?: string}
      review: {status: 'approved'; id: string}
    }

export interface ScenePlanV1 {
  schema: 'mdx-handwritten/scene-plan'
  schemaVersion: 1
  recipe: {name: string; version: number}
  localization: {
    locale: string
    catalog: {id: string; version: number}
  }
  title: string
  source: {
    text: string
    identity: {
      normalization: 'trim-lf-v1'
      algorithm: 'sha256'
      digest: string
    }
  }
  targets: readonly AnnotationTargetV1[]
  labels: readonly AnnotationLabelV1[]
  relationships: readonly AnnotationRelationshipV1[]
  gestures: readonly AnnotationGestureV1[]
  provenance: ScenePlanProvenanceV1
}

export type RelationshipEndpointsV1 =
  | {kind: 'describes'; targetIds: NonEmpty<string>}
  | {
      kind: 'relates'
      fromTargetIds: NonEmpty<string>
      toTargetIds: NonEmpty<string>
    }

export type RelationshipCorrectionChangeV1 =
  | {endpoints: RelationshipEndpointsV1; legendText?: string}
  | {endpoints?: never; legendText: string}

export type SemanticCorrectionV1 =
  | {
      id: string
      kind: 'target'
      slot: string
      anchor: string
      ranges: NonEmpty<SourceRangeV1>
    }
  | {id: string; kind: 'label'; labelId: string; text: string}
  | {
      id: string
      kind: 'relationship'
      relationshipId: string
      change: RelationshipCorrectionChangeV1
    }

export const scenePlanLimitsV1 = Object.freeze({
  candidateJsonBytes: 65_536,
  sourceCodeUnits: 4_096,
  semanticCorrections: 16,
  targets: 64,
  rangesPerTarget: 16,
  ranges: 128,
  labels: 64,
  relationships: 64,
  gestures: 64,
  targetReferencesPerRelationship: 32,
  identifierCodeUnits: 80,
  localizedTextCodeUnits: 16_384,
  textCodeUnits: 240,
  diagnostics: 32,
  diagnosticCandidates: 32
} as const)

export interface AnnotationRecipeLimitsV1 {
  readonly sourceCodeUnits: number
  readonly targets: number
  readonly rangesPerTarget: number
  readonly ranges: number
  readonly labels: number
  readonly relationships: number
  readonly gestures: number
  readonly targetReferencesPerRelationship: number
  readonly localizedTextCodeUnits: number
  readonly textCodeUnits: number
}

export const annotationRecipeLimitsV1: Readonly<AnnotationRecipeLimitsV1> =
  Object.freeze({
    sourceCodeUnits: scenePlanLimitsV1.sourceCodeUnits,
    targets: scenePlanLimitsV1.targets,
    rangesPerTarget: scenePlanLimitsV1.rangesPerTarget,
    ranges: scenePlanLimitsV1.ranges,
    labels: scenePlanLimitsV1.labels,
    relationships: scenePlanLimitsV1.relationships,
    gestures: scenePlanLimitsV1.gestures,
    targetReferencesPerRelationship:
      scenePlanLimitsV1.targetReferencesPerRelationship,
    localizedTextCodeUnits: scenePlanLimitsV1.localizedTextCodeUnits,
    textCodeUnits: scenePlanLimitsV1.textCodeUnits
  })

export const annotationRecipePackageProtocolV1 =
  'mdx-handwritten/annotation-recipe-package' as const

export interface AnnotationRecipeMessagesV1 {
  readonly title: string
  readonly [key: string]: string
}

export interface AnnotationRecipeCatalogV1 {
  readonly id: string
  readonly version: number
  readonly messages: Readonly<{
    en: AnnotationRecipeMessagesV1
    'zh-CN': AnnotationRecipeMessagesV1
  }>
}

export interface AnnotationRecipeCorrectionSlotsV1 {
  readonly targets: readonly string[]
  readonly labels: readonly string[]
  readonly relationships: readonly string[]
}

export interface AnnotationRecipeCompileContextV1 {
  readonly source: string
  readonly locale: AnnotationSceneLocale
  readonly messages: Readonly<AnnotationRecipeMessagesV1>
  readonly targetCorrections: readonly Extract<
    SemanticCorrectionV1,
    {kind: 'target'}
  >[]
  readonly limits: Readonly<AnnotationRecipeLimitsV1>
}

export interface AnnotationRecipeDraftV1 {
  readonly targets: readonly AnnotationTargetV1[]
  readonly labels: readonly AnnotationLabelV1[]
  readonly relationships: readonly AnnotationRelationshipV1[]
  readonly gestures: readonly AnnotationGestureV1[]
}

export interface AnnotationRecipeDiagnosticV1 {
  readonly reason: string
  readonly message: string
  readonly sourceRange?: {readonly start: number; readonly end: number}
  readonly candidates?: readonly {
    readonly start: number
    readonly end: number
  }[]
}

export type AnnotationRecipeCompileResultV1 =
  | {
      readonly ok: true
      readonly draft: AnnotationRecipeDraftV1
      readonly diagnostics?: never
    }
  | {
      readonly ok: false
      readonly draft?: never
      readonly diagnostics: NonEmpty<AnnotationRecipeDiagnosticV1>
    }

export interface AnnotationRecipeValidationContextV1 {
  readonly source: string
  readonly locale: AnnotationSceneLocale
  readonly messages: Readonly<AnnotationRecipeMessagesV1>
  readonly draft: Readonly<AnnotationRecipeDraftV1>
  readonly appliedCorrections: readonly SemanticCorrectionV1[]
}

export type AnnotationRecipeValidationResultV1 =
  | {readonly ok: true; readonly diagnostics?: never}
  | {
      readonly ok: false
      readonly diagnostics: NonEmpty<AnnotationRecipeDiagnosticV1>
    }

export interface AnnotationRecipeDefinitionV1 {
  readonly ref: {readonly name: string; readonly version: number}
  readonly roles: readonly string[]
  readonly correctionSlots: AnnotationRecipeCorrectionSlotsV1
  readonly catalog: AnnotationRecipeCatalogV1
  readonly limits: AnnotationRecipeLimitsV1
  compile(
    context: AnnotationRecipeCompileContextV1
  ): AnnotationRecipeCompileResultV1
  validate(
    context: AnnotationRecipeValidationContextV1
  ): AnnotationRecipeValidationResultV1
}

export interface AnnotationRecipePackageV1 {
  readonly protocol: typeof annotationRecipePackageProtocolV1
  readonly protocolVersion: 1
  readonly packageName: string
  readonly recipes: readonly AnnotationRecipeDefinitionV1[]
  readonly activeVersions: Readonly<Record<string, number>>
}

export interface AnnotationRecipePackageBindingV1 {
  readonly packageName: string
  readonly definition: AnnotationRecipePackageV1
}

export interface CreateSceneCompilerOptions {
  readonly recipePackages: readonly AnnotationRecipePackageBindingV1[]
}

export interface ConfiguredSceneCompiler {
  readonly createScenePlan: (input: CreateScenePlanInput) => ScenePlanResult
}

export type SceneCompilerConfigurationErrorCode =
  | 'scene-compiler-package-invalid'
  | 'scene-compiler-package-protocol-unsupported'
  | 'scene-compiler-package-name-mismatch'
  | 'scene-compiler-recipe-duplicate'
  | 'scene-compiler-active-version-missing'

export class SceneCompilerConfigurationError extends Error {
  override readonly name = 'SceneCompilerConfigurationError'
  readonly code: SceneCompilerConfigurationErrorCode
  readonly path: readonly (string | number)[]

  constructor(
    code: SceneCompilerConfigurationErrorCode,
    path: readonly (string | number)[],
    message: string
  ) {
    super(message)
    this.code = code
    this.path = Object.freeze([...path])
  }
}

const internalConfigurationErrors = new WeakSet<SceneCompilerConfigurationError>()

export type SceneDiagnosticCodeV1 =
  | 'scene-input-invalid'
  | 'scene-recipe-unknown'
  | 'scene-recipe-version-unsupported'
  | 'scene-locale-unsupported'
  | 'scene-source-empty'
  | 'scene-source-too-long'
  | 'scene-source-unpaired-surrogate'
  | 'scene-recipe-rejected'
  | 'scene-correction-invalid'
  | 'scene-correction-anchor-missing'
  | 'scene-plan-json-invalid'
  | 'scene-plan-schema-unsupported'
  | 'scene-plan-shape-invalid'
  | 'scene-plan-field-unknown'
  | 'scene-plan-limit-exceeded'
  | 'scene-plan-source-stale'
  | 'scene-plan-id-invalid'
  | 'scene-plan-id-duplicate'
  | 'scene-plan-anchor-duplicate'
  | 'scene-plan-reference-missing'
  | 'scene-plan-range-invalid'
  | 'scene-plan-range-surrogate-split'
  | 'scene-plan-range-overlap'
  | 'scene-plan-text-mismatch'
  | 'scene-plan-localization-invalid'
  | 'scene-plan-provenance-invalid'
  | 'target-text-empty'
  | 'target-text-not-found'
  | 'target-text-ambiguous'

export interface SceneDiagnosticV1 {
  code: SceneDiagnosticCodeV1
  message: string
  path?: readonly (string | number)[]
  sourceRange?: {start: number; end: number}
  candidates?: readonly {start: number; end: number}[]
  recipeCode?: string
  limit?: {
    name: keyof typeof scenePlanLimitsV1
    maximum: number
    actual: number
  }
}

export type CreateScenePlanInput =
  | {
      source: string
      recipe: string
      locale?: string
      corrections?: readonly SemanticCorrectionV1[]
      candidateJson?: never
    }
  | {
      source: string
      candidateJson: string
      recipe?: never
      locale?: never
      corrections?: never
    }

export type ScenePlanResult =
  | {ok: true; plan: ScenePlanV1; diagnostics: readonly []}
  | {
      ok: false
      plan: null
      diagnostics: NonEmpty<SceneDiagnosticV1>
    }

export type AnnotationTargetRole =
  | 'state'
  | 'stable-id'
  | 'description'
  | 'tag'
  | 'priority'
  | 'field'

/** A half-open range of UTF-16 code units in the normalized Scene plan source. */
export interface AnnotationSourceRange {
  start: number
  end: number
}

export interface AnnotationSceneTarget {
  id: string
  role: AnnotationTargetRole
  exactText: string
  ranges: readonly [AnnotationSourceRange, ...AnnotationSourceRange[]]
}

export interface AnnotationSceneAnnotation {
  id: string
  label: string
  targetIds: readonly [string, ...string[]]
  fallback: string
}

export interface AnnotationScenePlanV1 {
  schemaVersion: 1
  recipe: {
    name: 'task-explainer'
    version: 1
  }
  locale: AnnotationSceneLocale
  title: string
  /** Normalized source addressed by every target range. */
  source: string
  targets: readonly AnnotationSceneTarget[]
  annotations: readonly AnnotationSceneAnnotation[]
}

type LegacyAnnotationSceneDiagnosticCode =
  | 'scene-recipe-unknown'
  | 'scene-locale-unsupported'
  | 'scene-source-empty'
  | 'scene-source-too-long'
  | 'scene-task-syntax-invalid'
  | 'scene-task-priority-ambiguous'

export type AnnotationSceneDiagnosticCode =
  | LegacyAnnotationSceneDiagnosticCode
  | SceneDiagnosticCodeV1

export interface AnnotationSceneDiagnostic {
  code: AnnotationSceneDiagnosticCode
  message: string
}

export type AnnotationSceneResult =
  | {
      ok: true
      plan: AnnotationScenePlanV1
      diagnostics: readonly []
    }
  | {
      ok: false
      plan: null
      diagnostics: readonly AnnotationSceneDiagnostic[]
    }

export interface DeriveAnnotationSceneInput {
  recipe: string
  source: string
  locale?: string
}

const maximumSourceLength = 4096

const diagnosticMessages: Record<LegacyAnnotationSceneDiagnosticCode, string> = {
  'scene-recipe-unknown': 'The Annotation recipe is not supported.',
  'scene-locale-unsupported': 'The Annotation scene locale is not supported.',
  'scene-source-empty': 'The Annotation scene source is empty.',
  'scene-source-too-long': `The Annotation scene source exceeds ${maximumSourceLength} UTF-16 code units.`,
  'scene-task-syntax-invalid':
    'The task must start with "[ ] ID Title" or "- [ ] ID Title".',
  'scene-task-priority-ambiguous':
    'The task has more than one priority token.'
}

interface MetadataMatch {
  role: 'tag' | 'priority' | 'field'
  text: string
  start: number
  end: number
}

interface ParsedTask {
  state: {text: string; range: AnnotationSourceRange; checked: boolean}
  stableId: {text: string; range: AnnotationSourceRange}
  descriptionRanges: [AnnotationSourceRange, ...AnnotationSourceRange[]]
  metadata: MetadataMatch[]
}

interface TaskParseFailure {
  code: 'scene-recipe-rejected'
  recipeCode:
    | 'task-explainer@1/task-syntax-invalid'
    | 'task-explainer@1/description-missing'
    | 'task-explainer@1/metadata-invalid'
    | 'task-explainer@1/priority-ambiguous'
    | 'task-explainer@1/structured-key-conflict'
  sourceRange?: {start: number; end: number}
  candidates?: readonly {start: number; end: number}[]
}

interface TaskCorrectionFailure {
  diagnostic: SceneDiagnosticV1
}

const localizedText = {
  en: {
    title: 'Task explainer',
    stateOpen: 'open task',
    stateChecked: 'completed task',
    stableId: 'stable ID',
    description: 'description',
    tag: 'tag',
    priority: 'priority',
    field: 'custom field'
  },
  'zh-CN': {
    title: '任务解析',
    stateOpen: '未完成任务',
    stateChecked: '已完成任务',
    stableId: '稳定 ID',
    description: '描述',
    tag: '标签',
    priority: '优先级',
    field: '自定义字段'
  }
} as const

const sceneEngineVersion = '0.1.0'
const taskExplainerCatalog = {
  id: 'mdx-handwritten/task-explainer/reader-text',
  version: 1
} as const

interface RecipeRuntimeContract {
  readonly ref: {readonly name: string; readonly version: number}
  readonly roles: ReadonlySet<string>
  readonly correctionSlots: AnnotationRecipeCorrectionSlotsV1
  readonly catalog: {
    readonly id: string
    readonly version: number
    readonly messages: Readonly<
      Record<AnnotationSceneLocale, Readonly<AnnotationRecipeMessagesV1>>
    >
  }
  readonly limits: Readonly<AnnotationRecipeLimitsV1>
  readonly compile?: AnnotationRecipeDefinitionV1['compile']
  readonly validate?: AnnotationRecipeDefinitionV1['validate']
  readonly builtInTaskExplainer: boolean
}

interface RecipeRuntimeEnvironment {
  readonly activeByName: ReadonlyMap<string, RecipeRuntimeContract>
  readonly exactByRef: ReadonlyMap<string, RecipeRuntimeContract>
}

const taskExplainerRuntimeContract: RecipeRuntimeContract = {
  ref: Object.freeze({name: 'task-explainer', version: 1}),
  roles: new Set<AnnotationTargetRole>([
    'state',
    'stable-id',
    'description',
    'tag',
    'priority',
    'field'
  ]),
  correctionSlots: Object.freeze({
    targets: Object.freeze(['priority']),
    labels: Object.freeze([
      'state-label',
      'stable-id-label',
      'description-label',
      'tag-label',
      'priority-label',
      'field-label'
    ]),
    relationships: Object.freeze([
      'state-annotation',
      'stable-id-annotation',
      'description-annotation',
      'tag-annotation',
      'priority-annotation',
      'field-annotation'
    ])
  }),
  catalog: Object.freeze({
    ...taskExplainerCatalog,
    messages: Object.freeze({
      en: Object.freeze({...localizedText.en}),
      'zh-CN': Object.freeze({...localizedText['zh-CN']})
    })
  }),
  limits: annotationRecipeLimitsV1,
  builtInTaskExplainer: true
}

const builtInRuntimeEnvironment: RecipeRuntimeEnvironment = {
  activeByName: new Map([['task-explainer', taskExplainerRuntimeContract]]),
  exactByRef: new Map([['task-explainer@1', taskExplainerRuntimeContract]])
}

const sceneDiagnosticMessages: Record<SceneDiagnosticCodeV1, string> = {
  'scene-input-invalid': 'The Scene plan input is invalid.',
  'scene-recipe-unknown': 'The Annotation recipe is not supported.',
  'scene-recipe-version-unsupported':
    'The exact Annotation recipe version is not supported.',
  'scene-locale-unsupported': 'The Annotation scene locale is not supported.',
  'scene-source-empty': 'The Annotation scene source is empty.',
  'scene-source-too-long':
    `The Annotation scene source exceeds ${scenePlanLimitsV1.sourceCodeUnits} UTF-16 code units.`,
  'scene-source-unpaired-surrogate':
    'The Annotation scene source contains an unpaired UTF-16 surrogate.',
  'scene-recipe-rejected': 'The Annotation recipe rejected the source.',
  'scene-correction-invalid': 'A Semantic correction is invalid.',
  'scene-correction-anchor-missing':
    'A Semantic correction references an unknown anchor.',
  'scene-plan-json-invalid': 'The candidate Scene plan is not valid JSON.',
  'scene-plan-schema-unsupported': 'The Scene plan schema is not supported.',
  'scene-plan-shape-invalid': 'The candidate Scene plan shape is invalid.',
  'scene-plan-field-unknown': 'The candidate Scene plan contains an unknown field.',
  'scene-plan-limit-exceeded': 'A fixed Scene plan limit was exceeded.',
  'scene-plan-source-stale':
    'The candidate Scene plan does not address the current canonical source.',
  'scene-plan-id-invalid': 'A Scene plan identifier is invalid.',
  'scene-plan-id-duplicate': 'A Scene plan identifier is duplicated.',
  'scene-plan-anchor-duplicate': 'A semantic anchor is duplicated.',
  'scene-plan-reference-missing': 'A Scene plan reference does not resolve.',
  'scene-plan-range-invalid': 'A Scene plan source range is invalid.',
  'scene-plan-range-surrogate-split':
    'A Scene plan source range splits a surrogate pair.',
  'scene-plan-range-overlap': 'Scene plan source ranges overlap.',
  'scene-plan-text-mismatch':
    'A Scene plan range does not match its declared exact text.',
  'scene-plan-localization-invalid':
    'The Scene plan Localization catalog is invalid or unsupported.',
  'scene-plan-provenance-invalid': 'The Scene plan provenance is invalid.',
  'target-text-empty': 'The target text is empty.',
  'target-text-not-found': 'The target text was not found.',
  'target-text-ambiguous': 'The target text has more than one exact match.'
}

/**
 * Materialize one deterministic or reviewed Scene plan through the closed V1
 * Interface. Expected input failures are returned and never thrown.
 */
export function createScenePlan(input: CreateScenePlanInput): ScenePlanResult {
  if (!isRecord(input)) return sceneFailure('scene-input-invalid')

  const hasCandidate = Object.hasOwn(input, 'candidateJson')
  const hasRecipe = Object.hasOwn(input, 'recipe')
  if (hasCandidate === hasRecipe || typeof input.source !== 'string') {
    return sceneFailure('scene-input-invalid')
  }
  if (hasCandidate) {
    if (
      typeof input.candidateJson !== 'string' ||
      !hasOnlyKeys(input, ['source', 'candidateJson'])
    ) {
      return sceneFailure('scene-input-invalid')
    }
    return createCandidateScenePlan(input.source, input.candidateJson)
  }
  if (
    typeof input.recipe !== 'string' ||
    (input.locale !== undefined && typeof input.locale !== 'string') ||
    (input.corrections !== undefined && !Array.isArray(input.corrections)) ||
    !hasOnlyKeys(input, ['source', 'recipe', 'locale', 'corrections'])
  ) {
    return sceneFailure('scene-input-invalid')
  }

  const source = normalizeSource(input.source)
  const sourceProblem = validateCanonicalSource(source)
  if (sourceProblem) return {ok: false, plan: null, diagnostics: [sourceProblem]}
  if (!isRecipeName(input.recipe)) return sceneFailure('scene-recipe-unknown')

  const locale = resolveLocale(input.locale ?? 'en')
  if (locale === null) return sceneFailure('scene-locale-unsupported')
  if ((input.corrections?.length ?? 0) > scenePlanLimitsV1.semanticCorrections) {
    return sceneFailure('scene-plan-limit-exceeded', {
      path: ['corrections'],
      limit: {
        name: 'semanticCorrections',
        maximum: scenePlanLimitsV1.semanticCorrections,
        actual: input.corrections?.length ?? 0
      }
    })
  }
  const decodedCorrections = decodeSemanticCorrections(input.corrections ?? [])
  if ('diagnostic' in decodedCorrections) {
    return {
      ok: false,
      plan: null,
      diagnostics: [decodedCorrections.diagnostic]
    }
  }
  const parsed = parseTask(source, decodedCorrections.corrections)
  if ('diagnostic' in parsed) {
    return {ok: false, plan: null, diagnostics: [parsed.diagnostic]}
  }
  if ('code' in parsed) {
    if (
      parsed.candidates !== undefined &&
      parsed.candidates.length > scenePlanLimitsV1.diagnosticCandidates
    ) {
      return sceneFailure('scene-plan-limit-exceeded', {
        limit: {
          name: 'diagnosticCandidates',
          maximum: scenePlanLimitsV1.diagnosticCandidates,
          actual: parsed.candidates.length
        }
      })
    }
    return sceneFailure(parsed.code, {
      recipeCode: parsed.recipeCode,
      ...(parsed.sourceRange === undefined
        ? {}
        : {sourceRange: parsed.sourceRange}),
      ...(parsed.candidates === undefined ? {} : {candidates: parsed.candidates})
    })
  }

  const targets = createSceneTargetsV1(source, parsed)
  const graph = createTaskSceneGraph(targets, parsed.state.checked, locale)
  const plan: ScenePlanV1 = {
    schema: 'mdx-handwritten/scene-plan',
    schemaVersion: 1,
    recipe: {name: 'task-explainer', version: 1},
    localization: {locale, catalog: taskExplainerCatalog},
    title: localizedText[locale].title,
    source: {
      text: source,
      identity: {
        normalization: 'trim-lf-v1',
        algorithm: 'sha256',
        digest: sha256(source)
      }
    },
    targets,
    ...graph,
    provenance: {
      kind: 'deterministic-recipe',
      engine: {name: '@madinah/mdx-handwritten-scene', version: sceneEngineVersion},
      appliedCorrections: []
    }
  }
  const corrected = applySemanticCorrections(plan, decodedCorrections.corrections)
  if ('diagnostic' in corrected) {
    return {ok: false, plan: null, diagnostics: [corrected.diagnostic]}
  }
  const planProblem = validateCandidateCollections(
    corrected.plan,
    'deterministic-recipe'
  )
  if (planProblem) return {ok: false, plan: null, diagnostics: [planProblem]}
  return {
    ok: true,
    plan: corrected.plan,
    diagnostics: []
  }
}

export function createSceneCompiler(
  options: CreateSceneCompilerOptions
): ConfiguredSceneCompiler {
  let environment: RecipeRuntimeEnvironment
  try {
    environment = createRecipeRuntimeEnvironment(options)
  } catch (error) {
    if (internalConfigurationErrors.delete(error as SceneCompilerConfigurationError)) {
      throw error
    }
    throw new SceneCompilerConfigurationError(
      'scene-compiler-package-invalid',
      ['recipePackages'],
      'The Scene compiler configuration is invalid.'
    )
  }
  return Object.freeze({
    createScenePlan: (input: CreateScenePlanInput): ScenePlanResult =>
      createConfiguredScenePlan(input, environment)
  })
}

function createConfiguredScenePlan(
  input: CreateScenePlanInput,
  environment: RecipeRuntimeEnvironment
): ScenePlanResult {
  if (!isRecord(input)) return sceneFailure('scene-input-invalid')
  const hasCandidate = Object.hasOwn(input, 'candidateJson')
  const hasRecipe = Object.hasOwn(input, 'recipe')
  if (hasCandidate === hasRecipe || typeof input.source !== 'string') {
    return sceneFailure('scene-input-invalid')
  }
  if (hasCandidate) {
    if (
      typeof input.candidateJson !== 'string' ||
      !hasOnlyKeys(input, ['source', 'candidateJson'])
    ) {
      return sceneFailure('scene-input-invalid')
    }
    return createCandidateScenePlan(
      input.source,
      input.candidateJson,
      environment
    )
  }
  if (
    typeof input.recipe !== 'string' ||
    (input.locale !== undefined && typeof input.locale !== 'string') ||
    (input.corrections !== undefined && !Array.isArray(input.corrections)) ||
    !hasOnlyKeys(input, ['source', 'recipe', 'locale', 'corrections'])
  ) {
    return sceneFailure('scene-input-invalid')
  }

  const source = normalizeSource(input.source)
  const sourceProblem = validateCanonicalSource(source)
  if (sourceProblem) return {ok: false, plan: null, diagnostics: [sourceProblem]}
  const contract = environment.activeByName.get(input.recipe)
  if (contract === undefined) return sceneFailure('scene-recipe-unknown')
  if (contract.builtInTaskExplainer) return createScenePlan(input)
  return compileExternalRecipe(input, source, contract)
}

function compileExternalRecipe(
  input: Extract<CreateScenePlanInput, {recipe: string}>,
  source: string,
  contract: RecipeRuntimeContract
): ScenePlanResult {
  if (source.length > contract.limits.sourceCodeUnits) {
    return configuredSourceTooLongFailure(
      contract.limits.sourceCodeUnits,
      source.length
    )
  }
  const locale = resolveLocale(input.locale ?? 'en')
  if (locale === null) return sceneFailure('scene-locale-unsupported')
  const correctionCount = input.corrections?.length ?? 0
  if (correctionCount > scenePlanLimitsV1.semanticCorrections) {
    return sceneFailure('scene-plan-limit-exceeded', {
      path: ['corrections'],
      limit: {
        name: 'semanticCorrections',
        maximum: scenePlanLimitsV1.semanticCorrections,
        actual: correctionCount
      }
    })
  }
  const decodedCorrections = decodeSemanticCorrections(input.corrections ?? [])
  if ('diagnostic' in decodedCorrections) {
    return {ok: false, plan: null, diagnostics: [decodedCorrections.diagnostic]}
  }
  const permissionProblem = validateCorrectionPermissions(
    decodedCorrections.corrections,
    contract.correctionSlots,
    'before-compile'
  )
  if (permissionProblem) {
    return {ok: false, plan: null, diagnostics: [permissionProblem]}
  }
  const targetCorrectionProblem = validateTargetCorrectionInputs(
    decodedCorrections.corrections,
    source,
    contract.limits
  )
  if (targetCorrectionProblem) {
    return {ok: false, plan: null, diagnostics: [targetCorrectionProblem]}
  }

  const messages = contract.catalog.messages[locale]
  const targetCorrections = decodedCorrections.corrections
    .filter(
      (
        correction
      ): correction is Extract<SemanticCorrectionV1, {kind: 'target'}> =>
        correction.kind === 'target'
    )
    .map((correction) => freezeTargetCorrection(correction))
  const compileContext: AnnotationRecipeCompileContextV1 = Object.freeze({
    source,
    locale,
    messages,
    targetCorrections: Object.freeze(targetCorrections),
    limits: contract.limits
  })

  const compile = contract.compile
  if (compile === undefined) {
    return externalRecipeFailure(contract, 'package-compile-result-invalid')
  }
  let compileValue: unknown
  try {
    compileValue = compile(compileContext)
  } catch {
    return externalRecipeFailure(contract, 'package-compile-threw')
  }
  let compileResult: RecipeDraftDecodeResult
  try {
    compileResult = decodeRecipeCompileResult(compileValue, contract, source)
  } catch {
    return externalRecipeFailure(contract, 'package-compile-result-invalid')
  }
  if ('result' in compileResult) return compileResult.result
  const draft = compileResult.draft
  const draftPermissionProblem = validateCorrectionPermissions(
    decodedCorrections.corrections,
    contract.correctionSlots,
    'after-draft'
  )
  if (draftPermissionProblem) {
    return {ok: false, plan: null, diagnostics: [draftPermissionProblem]}
  }
  const plan: ScenePlanV1 = {
    schema: 'mdx-handwritten/scene-plan',
    schemaVersion: 1,
    recipe: {...contract.ref},
    localization: {
      locale,
      catalog: {id: contract.catalog.id, version: contract.catalog.version}
    },
    title: messages.title,
    source: {
      text: source,
      identity: {
        normalization: 'trim-lf-v1',
        algorithm: 'sha256',
        digest: sha256(source)
      }
    },
    targets: [...draft.targets].sort(compareTargets),
    labels: draft.labels,
    relationships: draft.relationships,
    gestures: draft.gestures,
    provenance: {
      kind: 'deterministic-recipe',
      engine: {name: '@madinah/mdx-handwritten-scene', version: sceneEngineVersion},
      appliedCorrections: []
    }
  }
  const corrected = applySemanticCorrections(
    plan,
    decodedCorrections.corrections
  )
  if ('diagnostic' in corrected) {
    return {ok: false, plan: null, diagnostics: [corrected.diagnostic]}
  }
  const problem = validateCandidateCollections(
    corrected.plan,
    'deterministic-recipe',
    contract
  )
  if (problem) return {ok: false, plan: null, diagnostics: [problem]}
  const validation = invokeRecipeValidation(
    contract,
    source,
    locale,
    messages,
    corrected.plan,
    decodedCorrections.corrections
  )
  if (validation) return validation
  return {ok: true, plan: corrected.plan, diagnostics: []}
}

function freezeTargetCorrection(
  correction: Extract<SemanticCorrectionV1, {kind: 'target'}>
): Extract<SemanticCorrectionV1, {kind: 'target'}> {
  return Object.freeze({
    ...correction,
    ranges: Object.freeze(
      correction.ranges.map((range) => Object.freeze({...range}))
    ) as unknown as NonEmpty<SourceRangeV1>
  })
}

function validateCorrectionPermissions(
  corrections: readonly SemanticCorrectionV1[],
  slots: AnnotationRecipeCorrectionSlotsV1,
  phase: 'before-compile' | 'after-draft'
): SceneDiagnosticV1 | undefined {
  for (const [index, correction] of corrections.entries()) {
    if (
      (phase === 'before-compile' && correction.kind !== 'target') ||
      (phase === 'after-draft' && correction.kind === 'target')
    ) {
      continue
    }
    const allowed =
      correction.kind === 'target'
        ? slots.targets.includes(correction.slot)
        : correction.kind === 'label'
          ? slots.labels.includes(correction.labelId)
          : slots.relationships.includes(correction.relationshipId)
    if (!allowed) {
      return sceneDiagnostic('scene-correction-invalid', {
        path: [
          'corrections',
          index,
          correction.kind === 'target'
            ? 'slot'
            : correction.kind === 'label'
              ? 'labelId'
              : 'relationshipId'
        ]
      })
    }
  }
  return undefined
}

function validateTargetCorrectionInputs(
  corrections: readonly SemanticCorrectionV1[],
  source: string,
  limits: Readonly<AnnotationRecipeLimitsV1>
): SceneDiagnosticV1 | undefined {
  const claimedRanges: Array<{start: number; end: number}> = []
  let rangeCount = 0
  for (const [correctionIndex, correction] of corrections.entries()) {
    if (correction.kind !== 'target') continue
    if (correction.ranges.length > limits.rangesPerTarget) {
      return sceneDiagnostic('scene-plan-limit-exceeded', {
        path: ['corrections', correctionIndex, 'ranges'],
        limit: {
          name: 'rangesPerTarget',
          maximum: limits.rangesPerTarget,
          actual: correction.ranges.length
        }
      })
    }
    rangeCount += correction.ranges.length
    if (rangeCount > limits.ranges) {
      return sceneDiagnostic('scene-plan-limit-exceeded', {
        path: ['corrections'],
        limit: {
          name: 'ranges',
          maximum: limits.ranges,
          actual: rangeCount
        }
      })
    }
    let priorEnd = -1
    for (const [rangeIndex, range] of correction.ranges.entries()) {
      const path = ['corrections', correctionIndex, 'ranges', rangeIndex] as const
      if (
        range.start < 0 ||
        range.end <= range.start ||
        range.end > source.length ||
        range.start < priorEnd ||
        splitsSurrogatePair(source, range.start) ||
        splitsSurrogatePair(source, range.end) ||
        source.slice(range.start, range.end) !== range.exactText ||
        claimedRanges.some(
          claimed => range.start < claimed.end && range.end > claimed.start
        )
      ) {
        return sceneDiagnostic('scene-correction-invalid', {path})
      }
      claimedRanges.push({start: range.start, end: range.end})
      priorEnd = range.end
    }
  }
  return undefined
}

type RecipeDraftDecodeResult =
  | {draft: AnnotationRecipeDraftV1; result?: never}
  | {draft?: never; result: ScenePlanResult}

function consumeAsyncRecipeResult(value: Record<string, unknown>): boolean {
  if (value instanceof Promise) {
    try {
      void Promise.prototype.then.call(value, undefined, () => undefined)
      return true
    } catch {
      // A Proxy around a native Promise has no Promise internal slots. Its
      // exposed then may still be bound to the underlying Promise.
    }
  }
  let then: unknown
  try {
    then = value.then
  } catch {
    return true
  }
  if (typeof then !== 'function') return false
  const settled = Promise.resolve(value)
  void Promise.prototype.then.call(settled, undefined, () => undefined)
  return true
}

function decodeRecipeCompileResult(
  value: unknown,
  contract: RecipeRuntimeContract,
  source: string
): RecipeDraftDecodeResult {
  if (!isRecord(value) || consumeAsyncRecipeResult(value)) {
    return {result: externalRecipeFailure(contract, 'package-compile-result-invalid')}
  }
  if (value.ok === false) {
    if (!hasOnlyKeys(value, ['ok', 'diagnostics'])) {
      return {result: externalRecipeFailure(contract, 'package-compile-result-invalid')}
    }
    const diagnostics = decodeRecipeDiagnostics(value.diagnostics, contract, source)
    return diagnostics ?? {
      result: externalRecipeFailure(contract, 'package-diagnostic-invalid')
    }
  }
  if (
    value.ok !== true ||
    !hasOnlyKeys(value, ['ok', 'draft']) ||
    !isRecord(value.draft)
  ) {
    return {result: externalRecipeFailure(contract, 'package-compile-result-invalid')}
  }
  const topLevelUnknown = unknownObjectField(
    value.draft,
    ['targets', 'labels', 'relationships', 'gestures'],
    []
  )
  if (topLevelUnknown !== undefined) {
    return {
      result: sceneFailure('scene-plan-field-unknown', {
        path: ['draft', ...topLevelUnknown]
      })
    }
  }
  const names = ['targets', 'labels', 'relationships', 'gestures'] as const
  const collections: (readonly unknown[])[] = []
  for (const name of names) {
    const raw = value.draft[name]
    const maximum = contract.limits[name]
    const decoded = decodeDenseDataArray(raw, maximum)
    if (typeof decoded === 'number') {
      return {
        result: sceneFailure('scene-plan-limit-exceeded', {
          path: [name],
          limit: {name, maximum, actual: decoded}
        })
      }
    }
    if (decoded === undefined) {
      return {result: externalRecipeFailure(contract, 'package-compile-result-invalid')}
    }
    collections.push(decoded)
  }
  const [targets, labels, relationships, gestures] = collections as [
    readonly unknown[],
    readonly unknown[],
    readonly unknown[],
    readonly unknown[]
  ]
  const decodedCollections = {targets, labels, relationships, gestures}
  const earlyLimitProblem = validateDraftLimitsBeforeDecode(
    decodedCollections,
    contract.limits
  )
  if (earlyLimitProblem) return {result: earlyLimitProblem}
  const unknown = findUnknownDraftField(decodedCollections)
  if (unknown !== undefined) {
    return {
      result: sceneFailure('scene-plan-field-unknown', {
        path: ['draft', ...unknown]
      })
    }
  }
  return {
    draft: {
      targets: cloneDraftTargets(targets),
      labels: cloneDraftLabels(labels),
      relationships: cloneDraftRelationships(relationships),
      gestures: cloneDraftGestures(gestures)
    }
  }
}

function validateDraftLimitsBeforeDecode(
  draft: Record<
    'targets' | 'labels' | 'relationships' | 'gestures',
    readonly unknown[]
  >,
  limits: Readonly<AnnotationRecipeLimitsV1>
): ScenePlanResult | undefined {
  let rangeCount = 0
  for (const [targetIndex, target] of draft.targets.entries()) {
    if (!isRecord(target) || !Array.isArray(target.ranges)) continue
    const rangeLength = target.ranges.length
    if (rangeLength > limits.rangesPerTarget) {
      return sceneFailure('scene-plan-limit-exceeded', {
        path: ['targets', targetIndex, 'ranges'],
        limit: {
          name: 'rangesPerTarget',
          maximum: limits.rangesPerTarget,
          actual: rangeLength
        }
      })
    }
    rangeCount += rangeLength
    if (rangeCount > limits.ranges) {
      return sceneFailure('scene-plan-limit-exceeded', {
        path: ['targets'],
        limit: {
          name: 'ranges',
          maximum: limits.ranges,
          actual: rangeCount
        }
      })
    }
  }

  for (const [relationshipIndex, relationship] of draft.relationships.entries()) {
    if (!isRecord(relationship)) continue
    let referenceCount = 0
    for (const field of ['targetIds', 'fromTargetIds', 'toTargetIds'] as const) {
      const endpoint = relationship[field]
      if (!Array.isArray(endpoint)) continue
      referenceCount += endpoint.length
      if (referenceCount > limits.targetReferencesPerRelationship) {
        return sceneFailure('scene-plan-limit-exceeded', {
          path: ['relationships', relationshipIndex, field],
          limit: {
            name: 'targetReferencesPerRelationship',
            maximum: limits.targetReferencesPerRelationship,
            actual: referenceCount
          }
        })
      }
    }
  }

  for (const [gestureIndex, gesture] of draft.gestures.entries()) {
    if (
      !isRecord(gesture) ||
      gesture.kind !== 'emphasize' ||
      !Array.isArray(gesture.targetIds) ||
      gesture.targetIds.length <= limits.targets
    ) {
      continue
    }
    return sceneFailure('scene-plan-limit-exceeded', {
      path: ['gestures', gestureIndex, 'targetIds'],
      limit: {
        name: 'targets',
        maximum: limits.targets,
        actual: gesture.targetIds.length
      }
    })
  }
  return undefined
}

function decodeRecipeDiagnostics(
  value: unknown,
  contract: RecipeRuntimeContract,
  source: string
): {result: ScenePlanResult} | undefined {
  const entries = decodeDenseDataArray(value, scenePlanLimitsV1.diagnostics)
  if (!Array.isArray(entries) || entries.length === 0) return undefined
  const diagnostics: SceneDiagnosticV1[] = []
  for (const entry of entries) {
    if (
      !isRecord(entry) ||
      !hasOnlyKeys(entry, ['reason', 'message', 'sourceRange', 'candidates']) ||
      typeof entry.reason !== 'string' ||
      !/^[a-z][a-z0-9-]{0,79}$/u.test(entry.reason) ||
      !validBoundedText(entry.message, contract.limits.textCodeUnits)
    ) {
      return undefined
    }
    const sourceRange = decodeDiagnosticRange(entry.sourceRange, source)
    if (entry.sourceRange !== undefined && sourceRange === undefined) {
      return undefined
    }
    let candidates: readonly {start: number; end: number}[] | undefined
    if (entry.candidates !== undefined) {
      const candidateEntries = decodeDenseDataArray(
        entry.candidates,
        scenePlanLimitsV1.diagnosticCandidates
      )
      if (!Array.isArray(candidateEntries)) return undefined
      const decoded = candidateEntries.map(candidate =>
        decodeDiagnosticRange(candidate, source)
      )
      if (decoded.some((candidate) => candidate === undefined)) return undefined
      const decodedCandidates = decoded as {start: number; end: number}[]
      if (
        decodedCandidates.some(
          (candidate, index) =>
            index > 0 &&
            (candidate.start < decodedCandidates[index - 1]!.start ||
              (candidate.start === decodedCandidates[index - 1]!.start &&
                candidate.end <= decodedCandidates[index - 1]!.end))
        )
      ) {
        return undefined
      }
      candidates = decodedCandidates
    }
    diagnostics.push(
      {
        code: 'scene-recipe-rejected',
        message: entry.message,
        recipeCode: `${contract.ref.name}@${contract.ref.version}/${entry.reason}`,
        ...(sourceRange === undefined ? {} : {sourceRange}),
        ...(candidates === undefined ? {} : {candidates})
      }
    )
  }
  return {
    result: {
      ok: false,
      plan: null,
      diagnostics: diagnostics as unknown as NonEmpty<SceneDiagnosticV1>
    }
  }
}

function decodeDiagnosticRange(
  value: unknown,
  source: string
): {start: number; end: number} | undefined {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['start', 'end']) ||
    !Number.isInteger(value.start) ||
    !Number.isInteger(value.end) ||
    (value.start as number) < 0 ||
    (value.end as number) <= (value.start as number) ||
    (value.end as number) > source.length ||
    splitsSurrogatePair(source, value.start as number) ||
    splitsSurrogatePair(source, value.end as number)
  ) {
    return undefined
  }
  return {start: value.start as number, end: value.end as number}
}

function externalRecipeFailure(
  contract: RecipeRuntimeContract,
  reason: string
): ScenePlanResult {
  return sceneFailure('scene-recipe-rejected', {
    recipeCode: `${contract.ref.name}@${contract.ref.version}/${reason}`
  })
}

function configuredSourceTooLongFailure(
  maximum: number,
  actual: number,
  path?: readonly (string | number)[]
): ScenePlanResult {
  return {
    ok: false,
    plan: null,
    diagnostics: [
      {
        code: 'scene-source-too-long',
        message: `The Annotation scene source exceeds ${maximum} UTF-16 code units.`,
        ...(path === undefined ? {} : {path}),
        limit: {name: 'sourceCodeUnits', maximum, actual}
      }
    ]
  }
}

function invokeRecipeValidation(
  contract: RecipeRuntimeContract,
  source: string,
  locale: AnnotationSceneLocale,
  messages: Readonly<AnnotationRecipeMessagesV1>,
  plan: ScenePlanV1,
  corrections: readonly SemanticCorrectionV1[]
): ScenePlanResult | undefined {
  const draft = freezeValidationDraft(plan)
  const context: AnnotationRecipeValidationContextV1 = Object.freeze({
    source,
    locale,
    messages,
    draft,
    appliedCorrections: freezeCorrections(corrections)
  })
  const validate = contract.validate
  if (validate === undefined) {
    return externalRecipeFailure(contract, 'package-validate-result-invalid')
  }
  let value: unknown
  try {
    value = validate(context)
  } catch {
    return externalRecipeFailure(contract, 'package-validate-threw')
  }
  try {
    if (!isRecord(value) || consumeAsyncRecipeResult(value)) {
      return externalRecipeFailure(contract, 'package-validate-result-invalid')
    }
    if (value.ok === true && hasOnlyKeys(value, ['ok'])) return undefined
    if (value.ok === false && hasOnlyKeys(value, ['ok', 'diagnostics'])) {
      return (
        decodeRecipeDiagnostics(value.diagnostics, contract, source)?.result ??
        externalRecipeFailure(contract, 'package-diagnostic-invalid')
      )
    }
  } catch {
    return externalRecipeFailure(contract, 'package-validate-result-invalid')
  }
  return externalRecipeFailure(contract, 'package-validate-result-invalid')
}

function freezeValidationDraft(
  plan: Pick<
    ScenePlanV1,
    'targets' | 'labels' | 'relationships' | 'gestures'
  >
): Readonly<AnnotationRecipeDraftV1> {
  return Object.freeze({
    targets: Object.freeze(
      plan.targets.map((target) =>
        Object.freeze({
          ...target,
          ...(target.semanticAnchor === undefined
            ? {}
            : {semanticAnchor: Object.freeze({...target.semanticAnchor})}),
          ranges: Object.freeze(
            target.ranges.map((range) => Object.freeze({...range}))
          ) as unknown as NonEmpty<SourceRangeV1>
        })
      )
    ),
    labels: Object.freeze(
      plan.labels.map((label) => Object.freeze({...label}))
    ),
    relationships: Object.freeze(
      plan.relationships.map((relationship) =>
        Object.freeze(
          relationship.kind === 'describes'
            ? {
                ...relationship,
                targetIds: Object.freeze([...relationship.targetIds]) as unknown as NonEmpty<string>
              }
            : {
                ...relationship,
                fromTargetIds: Object.freeze([...relationship.fromTargetIds]) as unknown as NonEmpty<string>,
                toTargetIds: Object.freeze([...relationship.toTargetIds]) as unknown as NonEmpty<string>
              }
        )
      )
    ),
    gestures: Object.freeze(
      plan.gestures.map((gesture) =>
        Object.freeze(
          gesture.kind === 'emphasize'
            ? {
                ...gesture,
                targetIds: Object.freeze([...gesture.targetIds]) as unknown as NonEmpty<string>
              }
            : {...gesture}
        )
      )
    )
  })
}

function freezeCorrections(
  corrections: readonly SemanticCorrectionV1[]
): readonly SemanticCorrectionV1[] {
  return Object.freeze(
    corrections.map((correction) => {
      if (correction.kind === 'target') return freezeTargetCorrection(correction)
      if (correction.kind === 'relationship') {
        const endpoints = correction.change.endpoints
        return Object.freeze({
          ...correction,
          change: Object.freeze({
            ...correction.change,
            ...(endpoints === undefined
              ? {}
              : {
                  endpoints: Object.freeze(
                    endpoints.kind === 'describes'
                      ? {
                          ...endpoints,
                          targetIds: Object.freeze([...endpoints.targetIds])
                        }
                      : {
                          ...endpoints,
                          fromTargetIds: Object.freeze([
                            ...endpoints.fromTargetIds
                          ]),
                          toTargetIds: Object.freeze([...endpoints.toTargetIds])
                        }
                  )
                })
          })
        })
      }
      return Object.freeze({...correction})
    })
  ) as unknown as readonly SemanticCorrectionV1[]
}

function findUnknownDraftField(
  draft: Record<string, unknown>
): readonly (string | number)[] | undefined {
  const unknown = unknownObjectField(
    draft,
    ['targets', 'labels', 'relationships', 'gestures'],
    []
  )
  if (unknown) return unknown
  const wrapper: Record<string, unknown> = {
    schema: 'mdx-handwritten/scene-plan',
    schemaVersion: 1,
    recipe: {name: 'fixture', version: 1},
    localization: {locale: 'en', catalog: {id: 'fixture', version: 1}},
    title: 'fixture',
    source: {
      text: 'fixture',
      identity: {
        normalization: 'trim-lf-v1',
        algorithm: 'sha256',
        digest: '0'.repeat(64)
      }
    },
    targets: draft.targets,
    labels: draft.labels,
    relationships: draft.relationships,
    gestures: draft.gestures,
    provenance: {
      kind: 'deterministic-recipe',
      engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
      appliedCorrections: []
    }
  }
  return findUnknownCandidateField(wrapper)
}

function cloneDraftTargets(value: readonly unknown[]): readonly AnnotationTargetV1[] {
  return value.map((entry) => {
    if (!isRecord(entry)) return entry as unknown as AnnotationTargetV1
    return {
      ...entry,
      ...(isRecord(entry.semanticAnchor)
        ? {semanticAnchor: {...entry.semanticAnchor}}
        : {}),
      ...(Array.isArray(entry.ranges)
        ? {ranges: copyArrayByIndex(entry.ranges).map((range) =>
            isRecord(range) ? {...range} : range)}
        : {})
    } as unknown as AnnotationTargetV1
  })
}

function cloneDraftLabels(value: readonly unknown[]): readonly AnnotationLabelV1[] {
  return value.map((entry) =>
    (isRecord(entry) ? {...entry} : entry) as unknown as AnnotationLabelV1
  )
}

function cloneDraftRelationships(
  value: readonly unknown[]
): readonly AnnotationRelationshipV1[] {
  return value.map((entry) => {
    if (!isRecord(entry)) return entry as unknown as AnnotationRelationshipV1
    return {
      ...entry,
      ...(Array.isArray(entry.targetIds)
        ? {targetIds: copyArrayByIndex(entry.targetIds)}
        : {}),
      ...(Array.isArray(entry.fromTargetIds)
        ? {fromTargetIds: copyArrayByIndex(entry.fromTargetIds)}
        : {}),
      ...(Array.isArray(entry.toTargetIds)
        ? {toTargetIds: copyArrayByIndex(entry.toTargetIds)}
        : {})
    } as unknown as AnnotationRelationshipV1
  })
}

function cloneDraftGestures(value: readonly unknown[]): readonly AnnotationGestureV1[] {
  return value.map((entry) => {
    if (!isRecord(entry)) return entry as unknown as AnnotationGestureV1
    return {
      ...entry,
      ...(Array.isArray(entry.targetIds)
        ? {targetIds: copyArrayByIndex(entry.targetIds)}
        : {})
    } as unknown as AnnotationGestureV1
  })
}

function copyArrayByIndex(value: readonly unknown[]): unknown[] {
  const copy = decodeDenseDataArray(value)
  if (copy === undefined) throw 0
  return copy as unknown[]
}

function createRecipeRuntimeEnvironment(
  options: CreateSceneCompilerOptions
): RecipeRuntimeEnvironment {
  const recipePackages = isRecord(options)
    ? decodeDenseDataArray(options.recipePackages)
    : undefined
  if (
    !isRecord(options) ||
    !hasOnlyKeys(options, ['recipePackages']) ||
    recipePackages === undefined
  ) {
    throw configurationError(
      'scene-compiler-package-invalid',
      ['recipePackages'],
      'The Scene compiler configuration is invalid.'
    )
  }
  const activeByName = new Map(builtInRuntimeEnvironment.activeByName)
  const exactByRef = new Map(builtInRuntimeEnvironment.exactByRef)
  const packageNames = new Set<string>()

  for (const [packageIndex, unknownBinding] of recipePackages.entries()) {
    const path = ['recipePackages', packageIndex] as const
    if (
      !isRecord(unknownBinding) ||
      !hasOnlyKeys(unknownBinding, ['packageName', 'definition']) ||
      typeof unknownBinding.packageName !== 'string' ||
      !isRecord(unknownBinding.definition)
    ) {
      throw configurationError(
        'scene-compiler-package-invalid',
        path,
        'The Recipe package binding is invalid.'
      )
    }
    const binding = unknownBinding as unknown as AnnotationRecipePackageBindingV1
    const definition = unknownBinding.definition
    if (definition.protocol !== annotationRecipePackageProtocolV1) {
      throw configurationError(
        'scene-compiler-package-protocol-unsupported',
        [...path, 'definition', 'protocol'],
        'The Recipe package protocol is unsupported.'
      )
    }
    if (definition.protocolVersion !== 1) {
      throw configurationError(
        'scene-compiler-package-protocol-unsupported',
        [...path, 'definition', 'protocolVersion'],
        'The Recipe package protocol is unsupported.'
      )
    }
    if (definition.packageName !== binding.packageName) {
      throw configurationError(
        'scene-compiler-package-name-mismatch',
        [...path, 'definition', 'packageName'],
        'The host package name and definition package name must match.'
      )
    }
    const recipes = decodeDenseDataArray(definition.recipes)
    if (
      !isPackageName(binding.packageName) ||
      !hasOnlyKeys(definition, [
        'protocol',
        'protocolVersion',
        'packageName',
        'recipes',
        'activeVersions'
      ]) ||
      recipes === undefined ||
      recipes.length === 0 ||
      !isPlainRecord(definition.activeVersions) ||
      ownEnumerableDataStringKeys(definition.activeVersions) === undefined
    ) {
      throw configurationError(
        'scene-compiler-package-invalid',
        [...path, 'definition'],
        'The Recipe package metadata is invalid.'
      )
    }
    if (packageNames.has(binding.packageName)) {
      throw configurationError(
        'scene-compiler-package-invalid',
        [...path, 'packageName'],
        'The Recipe package binding is duplicated.'
      )
    }
    packageNames.add(binding.packageName)

    const packageRecipes = new Map<string, RecipeRuntimeContract>()
    const recipeNames = new Set<string>()
    for (const [recipeIndex, unknownRecipe] of recipes.entries()) {
      const recipePath = [...path, 'definition', 'recipes', recipeIndex] as const
      const runtime = snapshotRecipeDefinition(
        unknownRecipe,
        binding.packageName,
        recipePath
      )
      const exactKey = recipeRefKey(runtime.ref)
      if (exactByRef.has(exactKey)) {
        throw configurationError(
          'scene-compiler-recipe-duplicate',
          [...recipePath, 'ref'],
          'The exact Recipe identity is duplicated.'
        )
      }
      exactByRef.set(exactKey, runtime)
      packageRecipes.set(exactKey, runtime)
      recipeNames.add(runtime.ref.name)
    }

    const activeKeys = [
      ...ownEnumerableDataStringKeys(definition.activeVersions)!
    ].sort()
    for (const name of activeKeys) {
      const version = definition.activeVersions[name]
      const activePath = [...path, 'definition', 'activeVersions', name] as const
      if (
        !isCanonicalRecipeName(name, binding.packageName) ||
        !isPositiveInteger(version)
      ) {
        throw configurationError(
          'scene-compiler-package-invalid',
          activePath,
          'The active Recipe identity is invalid.'
        )
      }
      const runtime = packageRecipes.get(recipeRefKey({name, version}))
      if (runtime === undefined) {
        throw configurationError(
          'scene-compiler-active-version-missing',
          activePath,
          'The active Recipe version is not exposed by this package.'
        )
      }
      activeByName.set(name, runtime)
    }
    for (const name of [...recipeNames].sort()) {
      if (!Object.hasOwn(definition.activeVersions, name)) {
        throw configurationError(
          'scene-compiler-active-version-missing',
          [...path, 'definition', 'activeVersions', name],
          'Every Recipe name must select one active version.'
        )
      }
    }
  }
  return {activeByName, exactByRef}
}

function snapshotRecipeDefinition(
  value: unknown,
  packageName: string,
  path: readonly (string | number)[]
): RecipeRuntimeContract {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'ref',
      'roles',
      'correctionSlots',
      'catalog',
      'limits',
      'compile',
      'validate'
    ]) ||
    !isRecord(value.ref) ||
    !hasOnlyKeys(value.ref, ['name', 'version']) ||
    !isCanonicalRecipeName(value.ref.name, packageName) ||
    !isPositiveInteger(value.ref.version) ||
    !isNonEmptyUniqueIdentifierArray(value.roles) ||
    !isRecord(value.correctionSlots) ||
    !hasOnlyKeys(value.correctionSlots, ['targets', 'labels', 'relationships']) ||
    !isUniqueIdentifierArray(value.correctionSlots.targets) ||
    !isUniqueIdentifierArray(value.correctionSlots.labels) ||
    !isUniqueIdentifierArray(value.correctionSlots.relationships) ||
    typeof value.compile !== 'function' ||
    typeof value.validate !== 'function'
  ) {
    throw configurationError(
      'scene-compiler-package-invalid',
      path,
      'The Recipe definition is invalid.'
    )
  }
  const limits = snapshotRecipeLimits(
    value.limits,
    [...path, 'limits']
  )
  const catalog = snapshotRecipeCatalog(
    value.catalog,
    [...path, 'catalog'],
    limits
  )
  const roles = Object.freeze(copyArrayByIndex(value.roles) as string[])
  const correctionSlots = Object.freeze({
    targets: Object.freeze(copyArrayByIndex(value.correctionSlots.targets) as string[]),
    labels: Object.freeze(copyArrayByIndex(value.correctionSlots.labels) as string[]),
    relationships: Object.freeze(
      copyArrayByIndex(value.correctionSlots.relationships) as string[]
    )
  })
  return Object.freeze({
    ref: Object.freeze({
      name: value.ref.name as string,
      version: value.ref.version as number
    }),
    roles: new Set(roles),
    correctionSlots,
    catalog,
    limits,
    compile: value.compile as AnnotationRecipeDefinitionV1['compile'],
    validate: value.validate as AnnotationRecipeDefinitionV1['validate'],
    builtInTaskExplainer: false
  })
}

function snapshotRecipeCatalog(
  value: unknown,
  path: readonly (string | number)[],
  limits: Readonly<AnnotationRecipeLimitsV1>
): RecipeRuntimeContract['catalog'] {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['id', 'version', 'messages']) ||
    !isIdentifier(value.id) ||
    !isPositiveInteger(value.version) ||
    !isRecord(value.messages) ||
    !hasOnlyKeys(value.messages, ['en', 'zh-CN']) ||
    !isPlainStringRecord(value.messages.en) ||
    !isPlainStringRecord(value.messages['zh-CN'])
  ) {
    throw configurationError(
      'scene-compiler-package-invalid',
      path,
      'The Recipe catalog is invalid.'
    )
  }
  const rawMessages = value.messages as Record<
    AnnotationSceneLocale,
    Record<string, unknown>
  >
  const enKeys = Object.keys(rawMessages.en).sort()
  const zhKeys = Object.keys(rawMessages['zh-CN']).sort()
  if (
    !enKeys.includes('title') ||
    enKeys.length !== zhKeys.length ||
    enKeys.some((key, index) => key !== zhKeys[index]) ||
    enKeys.some(
      (key) =>
        !isIdentifier(key) ||
        !validBoundedText(
          rawMessages.en[key],
          limits.textCodeUnits
        ) ||
        !validBoundedText(
          rawMessages['zh-CN'][key],
          limits.textCodeUnits
        )
    ) ||
    enKeys.reduce(
      (total, key) => total + (rawMessages.en[key] as string).length,
      0
    ) > limits.localizedTextCodeUnits ||
    zhKeys.reduce(
      (total, key) => total + (rawMessages['zh-CN'][key] as string).length,
      0
    ) > limits.localizedTextCodeUnits
  ) {
    throw configurationError(
      'scene-compiler-package-invalid',
      [...path, 'messages'],
      'The Recipe catalogs must have identical bounded string keys including title.'
    )
  }
  const messages = value.messages as Record<
    AnnotationSceneLocale,
    AnnotationRecipeMessagesV1
  >
  return Object.freeze({
    id: value.id as string,
    version: value.version as number,
    messages: Object.freeze({
      en: Object.freeze({...messages.en}),
      'zh-CN': Object.freeze({...messages['zh-CN']})
    })
  })
}

function snapshotRecipeLimits(
  value: unknown,
  path: readonly (string | number)[]
): Readonly<AnnotationRecipeLimitsV1> {
  const keys = Object.keys(annotationRecipeLimitsV1) as Array<
    keyof AnnotationRecipeLimitsV1
  >
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, keys) ||
    Object.keys(value).length !== keys.length ||
    keys.some(
      (key) =>
        !isPositiveInteger(value[key]) ||
        (value[key] as number) > annotationRecipeLimitsV1[key]
    )
  ) {
    throw configurationError(
      'scene-compiler-package-invalid',
      path,
      'The Recipe limits are incomplete or exceed protocol maxima.'
    )
  }
  return Object.freeze(
    Object.fromEntries(keys.map((key) => [key, value[key]]))
  ) as unknown as Readonly<AnnotationRecipeLimitsV1>
}

function configurationError(
  code: SceneCompilerConfigurationErrorCode,
  path: readonly (string | number)[],
  message: string
): SceneCompilerConfigurationError {
  const error = new SceneCompilerConfigurationError(code, path, message)
  internalConfigurationErrors.add(error)
  return error
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isPlainStringRecord(value: unknown): value is Record<string, string> {
  if (!isPlainRecord(value)) return false
  const keys = ownEnumerableDataStringKeys(value)
  return keys !== undefined && keys.every((key) => typeof value[key] === 'string')
}

function isPackageName(value: string): boolean {
  return /^(?:[a-z0-9][a-z0-9._-]{0,63}|@[a-z0-9][a-z0-9._-]{0,31}\/[a-z0-9][a-z0-9._-]{0,63})$/u.test(
    value
  )
}

function isCanonicalRecipeName(value: unknown, packageName: string): value is string {
  if (typeof value !== 'string' || value.length > 160) return false
  if (!value.startsWith(`${packageName}/`)) return false
  const localName = value.slice(packageName.length + 1)
  return (
    isPackageName(packageName) &&
    /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(localName)
  )
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0
}

function isUniqueIdentifierArray(value: unknown): value is string[] {
  const decoded = decodeDenseDataArray(value)
  return decoded !== undefined &&
    decoded.every(isIdentifier) &&
    new Set(decoded).size === decoded.length
}

function isNonEmptyUniqueIdentifierArray(value: unknown): value is string[] {
  return isUniqueIdentifierArray(value) && value.length > 0
}

function recipeRefKey(ref: {name: string; version: number}): string {
  return `${ref.name}@${ref.version}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[]
): boolean {
  const keys = ownEnumerableDataStringKeys(value)
  return keys !== undefined && keys.every((key) => allowed.includes(key))
}

function ownEnumerableDataStringKeys(
  value: object
): readonly string[] | undefined {
  const keys = Reflect.ownKeys(value)
  const stringKeys: string[] = []
  for (const key of keys) {
    if (typeof key !== 'string') return undefined
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, 'value')
    ) {
      return undefined
    }
    stringKeys.push(key)
  }
  return stringKeys
}

function decodeDenseDataArray(value: unknown): readonly unknown[] | undefined
function decodeDenseDataArray(
  value: unknown,
  maximum: number
): readonly unknown[] | number | undefined
function decodeDenseDataArray(
  value: unknown,
  maximum = Infinity
): readonly unknown[] | number | undefined {
  if (!Array.isArray(value)) return undefined
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const length = (descriptors.length as unknown as PropertyDescriptor).value as number
  if (length > maximum) return length
  const decoded: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[index]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      return undefined
    }
    decoded.push(descriptor.value)
  }
  return Reflect.ownKeys(descriptors).length === length + 1
    ? decoded
    : undefined
}

type SemanticCorrectionDecodeResult =
  | {corrections: readonly SemanticCorrectionV1[]; diagnostic?: never}
  | {corrections?: never; diagnostic: SceneDiagnosticV1}

type SemanticCorrectionApplicationResult =
  | {plan: ScenePlanV1; diagnostic?: never}
  | {plan?: never; diagnostic: SceneDiagnosticV1}

function decodeSemanticCorrections(
  values: readonly unknown[]
): SemanticCorrectionDecodeResult {
  const corrections: SemanticCorrectionV1[] = []
  const correctionIds = new Set<string>()
  let targetRangeCount = 0
  const writtenRefs = {
    target: new Set<string>(),
    label: new Set<string>(),
    relationship: new Set<string>()
  }

  for (const [index, value] of values.entries()) {
    const path = ['corrections', index] as const
    if (!isRecord(value) || !isIdentifier(value.id)) {
      return invalidCorrection(path)
    }
    if (correctionIds.has(value.id)) {
      return invalidCorrection([...path, 'id'])
    }
    correctionIds.add(value.id)

    if (value.kind === 'target') {
      if (
        !hasOnlyKeys(value, ['id', 'kind', 'slot', 'anchor', 'ranges']) ||
        !isIdentifier(value.slot) ||
        !isIdentifier(value.anchor) ||
        writtenRefs.target.has(value.slot)
      ) {
        return invalidCorrection(path)
      }
      const ranges = decodeCorrectionRanges(value.ranges)
      if (ranges === undefined) {
        return invalidCorrection([...path, 'ranges'])
      }
      targetRangeCount += ranges.length
      if (targetRangeCount > scenePlanLimitsV1.ranges) {
        return invalidCorrection([...path, 'ranges'])
      }
      writtenRefs.target.add(value.slot)
      corrections.push({
        id: value.id,
        kind: 'target',
        slot: value.slot,
        anchor: value.anchor,
        ranges
      })
      continue
    }

    if (value.kind === 'label') {
      if (
        !hasOnlyKeys(value, ['id', 'kind', 'labelId', 'text']) ||
        !isIdentifier(value.labelId) ||
        !validBoundedText(value.text, scenePlanLimitsV1.textCodeUnits) ||
        writtenRefs.label.has(value.labelId)
      ) {
        return invalidCorrection(path)
      }
      writtenRefs.label.add(value.labelId)
      corrections.push({
        id: value.id,
        kind: 'label',
        labelId: value.labelId,
        text: value.text
      })
      continue
    }

    if (value.kind === 'relationship') {
      if (
        !hasOnlyKeys(value, [
          'id',
          'kind',
          'relationshipId',
          'change'
        ]) ||
        !isIdentifier(value.relationshipId) ||
        writtenRefs.relationship.has(value.relationshipId) ||
        !isRecord(value.change) ||
        !hasOnlyKeys(value.change, ['endpoints', 'legendText'])
      ) {
        return invalidCorrection(path)
      }
      const hasEndpoints = Object.hasOwn(value.change, 'endpoints')
      const hasLegendText = Object.hasOwn(value.change, 'legendText')
      if (!hasEndpoints && !hasLegendText) {
        return invalidCorrection([...path, 'change'])
      }
      const legendText = value.change.legendText
      if (
        hasLegendText &&
        !validBoundedText(legendText, scenePlanLimitsV1.textCodeUnits)
      ) {
        return invalidCorrection([...path, 'change', 'legendText'])
      }
      const endpoints = hasEndpoints
        ? decodeRelationshipEndpoints(value.change.endpoints)
        : undefined
      if (hasEndpoints && endpoints === undefined) {
        return invalidCorrection([...path, 'change', 'endpoints'])
      }
      const change: RelationshipCorrectionChangeV1 =
        endpoints === undefined
          ? {legendText: legendText as string}
          : hasLegendText
            ? {endpoints, legendText: legendText as string}
            : {endpoints}
      writtenRefs.relationship.add(value.relationshipId)
      corrections.push({
        id: value.id,
        kind: 'relationship',
        relationshipId: value.relationshipId,
        change
      })
      continue
    }

    return invalidCorrection([...path, 'kind'])
  }

  return {corrections}
}

function decodeCorrectionRanges(value: unknown): NonEmpty<SourceRangeV1> | undefined {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > scenePlanLimitsV1.rangesPerTarget
  ) {
    return undefined
  }
  const ranges: SourceRangeV1[] = []
  for (const range of value) {
    if (
      !isRecord(range) ||
      !hasOnlyKeys(range, ['start', 'end', 'exactText']) ||
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      typeof range.exactText !== 'string' ||
      hasUnpairedSurrogate(range.exactText)
    ) {
      return undefined
    }
    ranges.push({
      start: range.start as number,
      end: range.end as number,
      exactText: range.exactText
    })
  }
  return ranges as unknown as NonEmpty<SourceRangeV1>
}

function decodeRelationshipEndpoints(
  value: unknown
): RelationshipEndpointsV1 | undefined {
  if (!isRecord(value)) return undefined
  if (
    value.kind === 'describes' &&
    hasOnlyKeys(value, ['kind', 'targetIds']) &&
    isNonEmptyIdentifierArray(
      value.targetIds,
      scenePlanLimitsV1.targetReferencesPerRelationship
    )
  ) {
    return {kind: 'describes', targetIds: [...value.targetIds]}
  }
  if (
    value.kind === 'relates' &&
    hasOnlyKeys(value, ['kind', 'fromTargetIds', 'toTargetIds']) &&
    isNonEmptyIdentifierArray(
      value.fromTargetIds,
      scenePlanLimitsV1.targetReferencesPerRelationship
    ) &&
    isNonEmptyIdentifierArray(
      value.toTargetIds,
      scenePlanLimitsV1.targetReferencesPerRelationship
    ) &&
    value.fromTargetIds.length + value.toTargetIds.length <=
      scenePlanLimitsV1.targetReferencesPerRelationship
  ) {
    return {
      kind: 'relates',
      fromTargetIds: [...value.fromTargetIds],
      toTargetIds: [...value.toTargetIds]
    }
  }
  return undefined
}

function isNonEmptyIdentifierArray(
  value: unknown,
  maximum: number = scenePlanLimitsV1.targets
): value is NonEmpty<string> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= maximum &&
    value.every((entry) => isIdentifier(entry))
  )
}

function invalidCorrection(
  path: readonly (string | number)[]
): SemanticCorrectionDecodeResult {
  return {
    diagnostic: sceneDiagnostic('scene-correction-invalid', {path})
  }
}

function applySemanticCorrections(
  plan: ScenePlanV1,
  corrections: readonly SemanticCorrectionV1[]
): SemanticCorrectionApplicationResult {
  if (corrections.length === 0) return {plan}
  if (plan.provenance.kind !== 'deterministic-recipe') {
    return correctionApplicationFailure('scene-correction-invalid', [
      'provenance'
    ])
  }

  const targetCorrections = corrections.filter(
    (correction): correction is Extract<SemanticCorrectionV1, {kind: 'target'}> =>
      correction.kind === 'target'
  )
  const targetCorrectionById = new Map<
    string,
    Extract<SemanticCorrectionV1, {kind: 'target'}>
  >()
  const renameTarget = new Map<string, string>()
  const resolvedTargets = new Set<string>()

  for (const correction of targetCorrections) {
    const target = plan.targets.find(
      (entry) =>
        entry.id === correction.slot ||
        entry.semanticAnchor?.name === correction.slot
    )
    if (target === undefined) {
      return correctionApplicationFailure('scene-correction-anchor-missing', [
        'corrections',
        corrections.indexOf(correction),
        'slot'
      ])
    }
    if (resolvedTargets.has(target.id)) {
      return correctionApplicationFailure('scene-correction-invalid', [
        'corrections',
        corrections.indexOf(correction),
        'slot'
      ])
    }
    resolvedTargets.add(target.id)
    targetCorrectionById.set(target.id, correction)
    renameTarget.set(target.id, correction.anchor)
  }

  const resultingTargetIds = new Set<string>()
  for (const target of plan.targets) {
    const resultingId = renameTarget.get(target.id) ?? target.id
    if (resultingTargetIds.has(resultingId)) {
      const correction = targetCorrectionById.get(target.id)
      return correctionApplicationFailure('scene-correction-invalid', [
        'corrections',
        correction === undefined ? 0 : corrections.indexOf(correction),
        'anchor'
      ])
    }
    resultingTargetIds.add(resultingId)
  }

  const targets = plan.targets
    .map((target): AnnotationTargetV1 => {
      const correction = targetCorrectionById.get(target.id)
      if (correction === undefined) {
        return {
          ...target,
          ...(target.semanticAnchor === undefined
            ? {}
            : {semanticAnchor: {...target.semanticAnchor}}),
          ranges: target.ranges.map((range) => ({...range})) as unknown as NonEmpty<SourceRangeV1>
        }
      }
      return {
        ...target,
        id: correction.anchor,
        semanticAnchor: {name: correction.anchor},
        ranges: correction.ranges.map((range) => ({...range})) as unknown as NonEmpty<SourceRangeV1>
      }
    })
    .sort(compareTargets)

  let relationships = plan.relationships.map(cloneRelationship)
  let gestures = plan.gestures.map(cloneGesture)
  if (renameTarget.size > 0) {
    relationships = relationships.map((relationship) =>
      rewriteRelationshipTargets(relationship, renameTarget)
    )
    gestures = gestures.map((gesture) =>
      rewriteGestureTargets(gesture, renameTarget)
    )
  }

  const labels = plan.labels.map((label) => ({...label}))
  for (const correction of corrections) {
    if (correction.kind !== 'label') continue
    const index = labels.findIndex(({id}) => id === correction.labelId)
    if (index === -1) {
      return correctionApplicationFailure('scene-correction-anchor-missing', [
        'corrections',
        corrections.indexOf(correction),
        'labelId'
      ])
    }
    labels[index] = {...labels[index]!, text: correction.text}
  }

  for (const correction of corrections) {
    if (correction.kind !== 'relationship') continue
    const index = relationships.findIndex(
      ({id}) => id === correction.relationshipId
    )
    if (index === -1) {
      return correctionApplicationFailure('scene-correction-anchor-missing', [
        'corrections',
        corrections.indexOf(correction),
        'relationshipId'
      ])
    }
    const relationship = relationships[index]!
    const {endpoints, legendText} = correction.change
    if (endpoints !== undefined && endpoints.kind !== relationship.kind) {
      return correctionApplicationFailure('scene-correction-invalid', [
        'corrections',
        corrections.indexOf(correction),
        'change',
        'endpoints',
        'kind'
      ])
    }
    const nextLegendText = legendText ?? relationship.legendText
    if (relationship.kind === 'describes') {
      const targetIds =
        endpoints?.kind === 'describes'
          ? rewriteTargetIds(endpoints.targetIds, renameTarget)
          : relationship.targetIds
      relationships[index] = {
        ...relationship,
        targetIds,
        legendText: nextLegendText
      }
    } else {
      const fromTargetIds =
        endpoints?.kind === 'relates'
          ? rewriteTargetIds(endpoints.fromTargetIds, renameTarget)
          : relationship.fromTargetIds
      const toTargetIds =
        endpoints?.kind === 'relates'
          ? rewriteTargetIds(endpoints.toTargetIds, renameTarget)
          : relationship.toTargetIds
      relationships[index] = {
        ...relationship,
        fromTargetIds,
        toTargetIds,
        legendText: nextLegendText
      }
    }
  }

  return {
    plan: {
      ...plan,
      targets,
      labels,
      relationships,
      gestures,
      provenance: {
        kind: 'deterministic-recipe',
        engine: {...plan.provenance.engine},
        appliedCorrections: corrections.map(({id, kind}) => ({kind, ref: id}))
      }
    }
  }
}

function cloneRelationship(
  relationship: AnnotationRelationshipV1
): AnnotationRelationshipV1 {
  return relationship.kind === 'describes'
    ? {...relationship, targetIds: [...relationship.targetIds]}
    : {
        ...relationship,
        fromTargetIds: [...relationship.fromTargetIds],
        toTargetIds: [...relationship.toTargetIds]
      }
}

function cloneGesture(gesture: AnnotationGestureV1): AnnotationGestureV1 {
  return gesture.kind === 'emphasize'
    ? {...gesture, targetIds: [...gesture.targetIds]}
    : {...gesture}
}

function rewriteTargetIds(
  targetIds: NonEmpty<string>,
  renameTarget: ReadonlyMap<string, string>
): NonEmpty<string> {
  return targetIds.map(
    (targetId) => renameTarget.get(targetId) ?? targetId
  ) as unknown as NonEmpty<string>
}

function rewriteRelationshipTargets(
  relationship: AnnotationRelationshipV1,
  renameTarget: ReadonlyMap<string, string>
): AnnotationRelationshipV1 {
  return relationship.kind === 'describes'
    ? {
        ...relationship,
        targetIds: rewriteTargetIds(relationship.targetIds, renameTarget)
      }
    : {
        ...relationship,
        fromTargetIds: rewriteTargetIds(
          relationship.fromTargetIds,
          renameTarget
        ),
        toTargetIds: rewriteTargetIds(relationship.toTargetIds, renameTarget)
      }
}

function rewriteGestureTargets(
  gesture: AnnotationGestureV1,
  renameTarget: ReadonlyMap<string, string>
): AnnotationGestureV1 {
  return gesture.kind === 'emphasize'
    ? {...gesture, targetIds: rewriteTargetIds(gesture.targetIds, renameTarget)}
    : gesture
}

function correctionApplicationFailure(
  code: 'scene-correction-invalid' | 'scene-correction-anchor-missing',
  path: readonly (string | number)[]
): SemanticCorrectionApplicationResult {
  return {diagnostic: sceneDiagnostic(code, {path})}
}

function createCandidateScenePlan(
  rawSource: string,
  candidateJson: string,
  environment: RecipeRuntimeEnvironment = builtInRuntimeEnvironment
): ScenePlanResult {
  const source = normalizeSource(rawSource)
  const sourceProblem = validateCanonicalSource(source)
  if (sourceProblem) return {ok: false, plan: null, diagnostics: [sourceProblem]}

  const byteLength = new TextEncoder().encode(candidateJson).byteLength
  if (byteLength > scenePlanLimitsV1.candidateJsonBytes) {
    return sceneFailure('scene-plan-limit-exceeded', {
      path: ['candidateJson'],
      limit: {
        name: 'candidateJsonBytes',
        maximum: scenePlanLimitsV1.candidateJsonBytes,
        actual: byteLength
      }
    })
  }

  let value: unknown
  try {
    value = JSON.parse(candidateJson) as unknown
  } catch {
    return sceneFailure('scene-plan-json-invalid', {path: ['candidateJson']})
  }
  const decoded = decodeCandidatePlan(value, environment)
  if (!decoded.ok) return decoded

  const candidateSource = normalizeSource(decoded.plan.source.text)
  const sourceDigest = sha256(source)
  if (
    candidateSource !== source ||
    decoded.plan.source.identity.digest !== sourceDigest
  ) {
    return sceneFailure('scene-plan-source-stale', {path: ['source']})
  }

  const contract = environment.exactByRef.get(
    recipeRefKey(decoded.plan.recipe)
  )!
  const finalizedPlan: ScenePlanV1 = {
    ...decoded.plan,
    source: {
      text: source,
      identity: {
        normalization: 'trim-lf-v1',
        algorithm: 'sha256',
        digest: sourceDigest
      }
    }
  }
  if (!contract.builtInTaskExplainer) {
    const locale = finalizedPlan.localization.locale as AnnotationSceneLocale
    const validation = invokeRecipeValidation(
      contract,
      source,
      locale,
      contract.catalog.messages[locale],
      finalizedPlan,
      []
    )
    if (validation) return validation
  }

  return {
    ok: true,
    plan: finalizedPlan,
    diagnostics: []
  }
}

function decodeCandidatePlan(
  value: unknown,
  environment: RecipeRuntimeEnvironment = builtInRuntimeEnvironment
): ScenePlanResult {
  if (!isRecord(value)) return sceneFailure('scene-plan-shape-invalid')
  const unknownPath = findUnknownCandidateField(value)
  if (unknownPath) {
    return sceneFailure('scene-plan-field-unknown', {path: unknownPath})
  }
  if (value.schema !== 'mdx-handwritten/scene-plan' || value.schemaVersion !== 1) {
    return sceneFailure('scene-plan-schema-unsupported')
  }
  if (!isRecord(value.recipe)) return sceneFailure('scene-plan-shape-invalid')
  if (
    typeof value.recipe.name !== 'string' ||
    !isPositiveInteger(value.recipe.version)
  ) {
    return sceneFailure('scene-plan-shape-invalid', {path: ['recipe']})
  }
  const contract = environment.exactByRef.get(
    recipeRefKey({
      name: value.recipe.name,
      version: value.recipe.version
    })
  )
  if (contract === undefined) {
    return sceneFailure('scene-recipe-version-unsupported', {path: ['recipe']})
  }
  if (!isRecord(value.localization) || !isRecord(value.localization.catalog)) {
    return sceneFailure('scene-plan-shape-invalid')
  }
  if (
    (value.localization.locale !== 'en' && value.localization.locale !== 'zh-CN') ||
    value.localization.catalog.id !== contract.catalog.id ||
    value.localization.catalog.version !== contract.catalog.version
  ) {
    return sceneFailure('scene-plan-localization-invalid', {
      path: ['localization']
    })
  }
  if (
    typeof value.title !== 'string' ||
    !isRecord(value.source) ||
    typeof value.source.text !== 'string' ||
    !isRecord(value.source.identity) ||
    value.source.identity.normalization !== 'trim-lf-v1' ||
    value.source.identity.algorithm !== 'sha256' ||
    typeof value.source.identity.digest !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(value.source.identity.digest) ||
    !Array.isArray(value.targets) ||
    !Array.isArray(value.labels) ||
    !Array.isArray(value.relationships) ||
    !Array.isArray(value.gestures)
  ) {
    return sceneFailure('scene-plan-shape-invalid')
  }
  if (
    !contract.builtInTaskExplainer &&
    value.title !==
      contract.catalog.messages[
        value.localization.locale as AnnotationSceneLocale
      ].title
  ) {
    return sceneFailure('scene-plan-localization-invalid', {path: ['title']})
  }
  if (
    !isRecord(value.provenance) ||
    value.provenance.kind !== 'reviewed-proposal' ||
    !isRecord(value.provenance.engine) ||
    value.provenance.engine.name !== '@madinah/mdx-handwritten-scene' ||
    typeof value.provenance.engine.version !== 'string' ||
    !isRecord(value.provenance.generator) ||
    typeof value.provenance.generator.id !== 'string' ||
    !isRecord(value.provenance.review) ||
    value.provenance.review.status !== 'approved' ||
    typeof value.provenance.review.id !== 'string'
  ) {
    return sceneFailure('scene-plan-provenance-invalid', {
      path: ['provenance']
    })
  }
  const decodedPlan = value as unknown as ScenePlanV1
  const plan: ScenePlanV1 = {
    ...decodedPlan,
    source: {
      ...decodedPlan.source,
      text: normalizeSource(decodedPlan.source.text)
    }
  }
  if (plan.source.text.length > contract.limits.sourceCodeUnits) {
    return configuredSourceTooLongFailure(
      contract.limits.sourceCodeUnits,
      plan.source.text.length,
      ['source', 'text']
    )
  }
  const problem = validateCandidateCollections(plan, 'reviewed-proposal', contract)
  if (problem) return {ok: false, plan: null, diagnostics: [problem]}
  return {
    ok: true,
    plan: {
      ...plan,
      targets: [...plan.targets].sort(compareTargets)
    },
    diagnostics: []
  }
}

function validateCandidateCollections(
  plan: ScenePlanV1,
  provenanceKind: ScenePlanProvenanceV1['kind'],
  contract: RecipeRuntimeContract = taskExplainerRuntimeContract
): SceneDiagnosticV1 | undefined {
  const limits = contract.limits
  if (!validBoundedText(plan.title, limits.textCodeUnits)) {
    return sceneDiagnostic('scene-plan-shape-invalid', {path: ['title']})
  }
  if (hasUnpairedSurrogate(plan.source.text)) {
    return sceneDiagnostic('scene-source-unpaired-surrogate', {
      path: ['source', 'text']
    })
  }
  const collectionLimits: Array<[
    readonly unknown[],
    keyof typeof scenePlanLimitsV1,
    number,
    string
  ]> = [
    [plan.targets, 'targets', limits.targets, 'targets'],
    [plan.labels, 'labels', limits.labels, 'labels'],
    [
      plan.relationships,
      'relationships',
      limits.relationships,
      'relationships'
    ],
    [plan.gestures, 'gestures', limits.gestures, 'gestures']
  ]
  for (const [items, name, maximum, path] of collectionLimits) {
    if (items.length > maximum) {
      return sceneDiagnostic('scene-plan-limit-exceeded', {
        path: [path],
        limit: {name, maximum, actual: items.length}
      })
    }
  }

  const ids = new Set<string>()
  const anchors = new Set<string>()
  const targetIds = new Set<string>()
  const referencedTargets = new Set<string>()
  const labelIds = new Set<string>()
  const relationshipIds = new Set<string>()
  const referencedLabels = new Set<string>()
  const referencedRelationships = new Set<string>()
  const allRanges: Array<{
    start: number
    end: number
    path: readonly (string | number)[]
  }> = []
  let rangeCount = 0
  let localizedTextLength = plan.title.length

  for (const [targetIndex, unknownTarget] of (
    plan.targets as readonly unknown[]
  ).entries()) {
    const path = ['targets', targetIndex] as const
    if (!isRecord(unknownTarget)) {
      return sceneDiagnostic('scene-plan-shape-invalid', {path})
    }
    const target = unknownTarget
    const idProblem = registerPlanId(target.id, path, ids)
    if (idProblem) return idProblem
    const id = target.id as string
    targetIds.add(id)
    if (
      !isIdentifier(target.role) ||
      !contract.roles.has(target.role as string)
    ) {
      return sceneDiagnostic('scene-plan-id-invalid', {path: [...path, 'role']})
    }
    if (
      contract.builtInTaskExplainer &&
      !validTaskExplainerTargetIdentity(target)
    ) {
      return sceneDiagnostic('scene-plan-id-invalid', {path: [...path, 'id']})
    }
    if (target.semanticAnchor !== undefined) {
      if (
        !isRecord(target.semanticAnchor) ||
        !isIdentifier(target.semanticAnchor.name)
      ) {
        return sceneDiagnostic('scene-plan-id-invalid', {
          path: [...path, 'semanticAnchor', 'name']
        })
      }
      const anchor = target.semanticAnchor.name as string
      if (anchors.has(anchor)) {
        return sceneDiagnostic('scene-plan-anchor-duplicate', {
          path: [...path, 'semanticAnchor', 'name']
        })
      }
      anchors.add(anchor)
    }
    if (!Array.isArray(target.ranges) || target.ranges.length === 0) {
      return sceneDiagnostic('scene-plan-shape-invalid', {
        path: [...path, 'ranges']
      })
    }
    if (target.ranges.length > limits.rangesPerTarget) {
      return sceneDiagnostic('scene-plan-limit-exceeded', {
        path: [...path, 'ranges'],
        limit: {
          name: 'rangesPerTarget',
          maximum: limits.rangesPerTarget,
          actual: target.ranges.length
        }
      })
    }
    rangeCount += target.ranges.length
    let priorEnd = -1
    for (const [rangeIndex, unknownRange] of target.ranges.entries()) {
      const rangePath = [...path, 'ranges', rangeIndex] as const
      if (!isRecord(unknownRange)) {
        return sceneDiagnostic('scene-plan-shape-invalid', {path: rangePath})
      }
      const {start, end, exactText} = unknownRange
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        (start as number) < 0 ||
        (end as number) <= (start as number) ||
        (end as number) > plan.source.text.length
      ) {
        return sceneDiagnostic('scene-plan-range-invalid', {path: rangePath})
      }
      if ((start as number) < priorEnd) {
        return sceneDiagnostic('scene-plan-range-overlap', {path: rangePath})
      }
      if (
        splitsSurrogatePair(plan.source.text, start as number) ||
        splitsSurrogatePair(plan.source.text, end as number)
      ) {
        return sceneDiagnostic('scene-plan-range-surrogate-split', {
          path: rangePath
        })
      }
      if (
        typeof exactText !== 'string' ||
        exactText !== plan.source.text.slice(start as number, end as number)
      ) {
        return sceneDiagnostic('scene-plan-text-mismatch', {path: rangePath})
      }
      priorEnd = end as number
      allRanges.push({start: start as number, end: end as number, path: rangePath})
    }
  }
  if (rangeCount > limits.ranges) {
    return sceneDiagnostic('scene-plan-limit-exceeded', {
      path: ['targets'],
      limit: {
        name: 'ranges',
        maximum: limits.ranges,
        actual: rangeCount
      }
    })
  }
  allRanges.sort(
    (left, right) => left.start - right.start || left.end - right.end
  )
  for (let index = 1; index < allRanges.length; index += 1) {
    const prior = allRanges[index - 1]!
    const current = allRanges[index]!
    if (current.start < prior.end) {
      return sceneDiagnostic('scene-plan-range-overlap', {path: current.path})
    }
  }
  for (const [targetIndex, target] of (
    plan.targets as readonly unknown[]
  ).entries()) {
    if (
      !isRecord(target) ||
      (contract.builtInTaskExplainer && !validTaskExplainerTargetMeaning(target))
    ) {
      return sceneDiagnostic('scene-plan-id-invalid', {
        path: ['targets', targetIndex, 'id']
      })
    }
  }

  for (const [labelIndex, unknownLabel] of (
    plan.labels as readonly unknown[]
  ).entries()) {
    const path = ['labels', labelIndex] as const
    if (!isRecord(unknownLabel)) {
      return sceneDiagnostic('scene-plan-shape-invalid', {path})
    }
    const idProblem = registerPlanId(unknownLabel.id, path, ids)
    if (idProblem) return idProblem
    labelIds.add(unknownLabel.id as string)
    if (!validBoundedText(unknownLabel.text, limits.textCodeUnits)) {
      return sceneDiagnostic('scene-plan-shape-invalid', {
        path: [...path, 'text']
      })
    }
    localizedTextLength += (unknownLabel.text as string).length
  }

  for (const [relationshipIndex, unknownRelationship] of (
    plan.relationships as readonly unknown[]
  ).entries()) {
    const path = ['relationships', relationshipIndex] as const
    if (!isRecord(unknownRelationship)) {
      return sceneDiagnostic('scene-plan-shape-invalid', {path})
    }
    const relationship = unknownRelationship
    const idProblem = registerPlanId(relationship.id, path, ids)
    if (idProblem) return idProblem
    const relationshipId = relationship.id as string
    relationshipIds.add(relationshipId)
    if (
      typeof relationship.labelId !== 'string' ||
      !labelIds.has(relationship.labelId)
    ) {
      return sceneDiagnostic('scene-plan-reference-missing', {
        path: [...path, 'labelId']
      })
    }
    referencedLabels.add(relationship.labelId)
    if (
      relationship.detailKind !== 'short-description' ||
      !validBoundedText(
        relationship.legendText,
        limits.textCodeUnits
      )
    ) {
      return sceneDiagnostic('scene-plan-shape-invalid', {path})
    }
    localizedTextLength += (relationship.legendText as string).length
    if (relationship.kind === 'describes') {
      const referenceProblem = validateTargetReferences(
        relationship.targetIds,
        [...path, 'targetIds'],
        targetIds,
        referencedTargets,
        limits.targetReferencesPerRelationship
      )
      if (referenceProblem) return referenceProblem
    } else if (relationship.kind === 'relates') {
      if (!['depends-on', 'contrasts', 'changes-to'].includes(relationship.relation as string)) {
        return sceneDiagnostic('scene-plan-shape-invalid', {
          path: [...path, 'relation']
        })
      }
      if (
        Array.isArray(relationship.fromTargetIds) &&
        Array.isArray(relationship.toTargetIds) &&
        relationship.fromTargetIds.length + relationship.toTargetIds.length >
          limits.targetReferencesPerRelationship
      ) {
        return sceneDiagnostic('scene-plan-limit-exceeded', {
          path,
          limit: {
            name: 'targetReferencesPerRelationship',
            maximum: limits.targetReferencesPerRelationship,
            actual:
              relationship.fromTargetIds.length +
              relationship.toTargetIds.length
          }
        })
      }
      const fromProblem = validateTargetReferences(
        relationship.fromTargetIds,
        [...path, 'fromTargetIds'],
        targetIds,
        referencedTargets
      )
      if (fromProblem) return fromProblem
      const toProblem = validateTargetReferences(
        relationship.toTargetIds,
        [...path, 'toTargetIds'],
        targetIds,
        referencedTargets
      )
      if (toProblem) return toProblem
      const from = new Set(relationship.fromTargetIds as string[])
      if ((relationship.toTargetIds as string[]).some((id) => from.has(id))) {
        return sceneDiagnostic('scene-plan-id-duplicate', {
          path: [...path, 'toTargetIds']
        })
      }
    } else {
      return sceneDiagnostic('scene-plan-shape-invalid', {
        path: [...path, 'kind']
      })
    }
  }

  for (const [gestureIndex, unknownGesture] of (
    plan.gestures as readonly unknown[]
  ).entries()) {
    const path = ['gestures', gestureIndex] as const
    if (!isRecord(unknownGesture)) {
      return sceneDiagnostic('scene-plan-shape-invalid', {path})
    }
    const gesture = unknownGesture
    const idProblem = registerPlanId(gesture.id, path, ids)
    if (idProblem) return idProblem
    if (gesture.kind === 'emphasize') {
      if (!['attention', 'positive', 'warning', 'negative'].includes(gesture.intent as string)) {
        return sceneDiagnostic('scene-plan-shape-invalid', {path})
      }
      const targetProblem = validateTargetReferences(
        gesture.targetIds,
        [...path, 'targetIds'],
        targetIds,
        undefined
      )
      if (targetProblem) return targetProblem
      continue
    }
    if (!['annotate', 'group', 'connect', 'verdict'].includes(gesture.kind as string)) {
      return sceneDiagnostic('scene-plan-shape-invalid', {
        path: [...path, 'kind']
      })
    }
    if (
      typeof gesture.relationshipId !== 'string' ||
      !relationshipIds.has(gesture.relationshipId)
    ) {
      return sceneDiagnostic('scene-plan-reference-missing', {
        path: [...path, 'relationshipId']
      })
    }
    if (
      gesture.kind === 'verdict' &&
      !['positive', 'negative', 'warning'].includes(gesture.intent as string)
    ) {
      return sceneDiagnostic('scene-plan-shape-invalid', {
        path: [...path, 'intent']
      })
    }
    referencedRelationships.add(gesture.relationshipId)
  }

  const orphanLabel = plan.labels.find(({id}) => !referencedLabels.has(id))
  if (orphanLabel) {
    return sceneDiagnostic('scene-plan-reference-missing', {
      path: ['labels', plan.labels.indexOf(orphanLabel), 'id']
    })
  }
  const orphanRelationship = plan.relationships.find(
    ({id}) => !referencedRelationships.has(id)
  )
  if (orphanRelationship) {
    return sceneDiagnostic('scene-plan-reference-missing', {
      path: [
        'relationships',
        plan.relationships.indexOf(orphanRelationship),
        'id'
      ]
    })
  }
  if (plan.targets.length === 0 || plan.gestures.length === 0) {
    return sceneDiagnostic('scene-plan-shape-invalid')
  }
  const orphanTarget = plan.targets.find(({id}) => !referencedTargets.has(id))
  if (orphanTarget) {
    return sceneDiagnostic('scene-plan-reference-missing', {
      path: ['targets', plan.targets.indexOf(orphanTarget), 'id']
    })
  }
  if (localizedTextLength > limits.localizedTextCodeUnits) {
    return sceneDiagnostic('scene-plan-limit-exceeded', {
      path: ['localization'],
      limit: {
        name: 'localizedTextCodeUnits',
        maximum: limits.localizedTextCodeUnits,
        actual: localizedTextLength
      }
    })
  }
  return provenanceKind === 'reviewed-proposal'
    ? validateReviewedProvenance(plan.provenance)
    : validateDeterministicProvenance(plan.provenance)
}

function registerPlanId(
  value: unknown,
  path: readonly (string | number)[],
  ids: Set<string>
): SceneDiagnosticV1 | undefined {
  if (!isIdentifier(value)) {
    return sceneDiagnostic('scene-plan-id-invalid', {path: [...path, 'id']})
  }
  if (ids.has(value)) {
    return sceneDiagnostic('scene-plan-id-duplicate', {path: [...path, 'id']})
  }
  ids.add(value)
  return undefined
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= scenePlanLimitsV1.identifierCodeUnits &&
    !hasUnpairedSurrogate(value) &&
    /^[\p{L}\p{N}][\p{L}\p{N}._:@/-]*$/u.test(value)
  )
}

function validBoundedText(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    !hasUnpairedSurrogate(value)
  )
}

function validTaskExplainerTargetIdentity(
  target: Record<string, unknown>
): boolean {
  if (typeof target.id !== 'string' || typeof target.role !== 'string') {
    return false
  }
  if (
    isRecord(target.semanticAnchor) &&
    typeof target.semanticAnchor.name === 'string'
  ) {
    return target.id === target.semanticAnchor.name
  }
  switch (target.role) {
    case 'state':
    case 'stable-id':
    case 'description':
    case 'priority':
      return target.id === target.role
    case 'tag':
      return /^tag:[\p{L}\p{N}_-]+$/u.test(target.id)
    case 'field':
      return /^field:[A-Za-z][A-Za-z0-9_-]*$/u.test(target.id)
    default:
      return false
  }
}

function validTaskExplainerTargetMeaning(
  target: Record<string, unknown>
): boolean {
  if (!Array.isArray(target.ranges) || typeof target.role !== 'string') {
    return false
  }
  const exactTexts = target.ranges.map((range) =>
    isRecord(range) && typeof range.exactText === 'string'
      ? range.exactText
      : undefined
  )
  if (exactTexts.some((text) => text === undefined)) return false
  const texts = exactTexts as string[]
  const hasSemanticAnchor = target.semanticAnchor !== undefined

  switch (target.role) {
    case 'state':
      return texts.length === 1 && /^\[(?: |x|X)\]$/u.test(texts[0]!)
    case 'stable-id':
      return texts.length === 1 && /^[A-Z][A-Z0-9]*-\d+$/u.test(texts[0]!)
    case 'description':
      return true
    case 'priority':
      return (
        texts.length === 1 &&
        /^!(?:low|medium|high|urgent)$/iu.test(texts[0]!)
      )
    case 'tag': {
      const keys = texts.map((text) => /^#([\p{L}\p{N}_-]+)$/u.exec(text)?.[1])
      return (
        keys.every((key) => key !== undefined) &&
        (hasSemanticAnchor || keys.every((key) => target.id === `tag:${key}`))
      )
    }
    case 'field': {
      const keys = texts.map(
        (text) => /^@([A-Za-z][A-Za-z0-9_-]*):\S+$/u.exec(text)?.[1]
      )
      return (
        keys.every((key) => key !== undefined) &&
        (hasSemanticAnchor ||
          keys.every((key) => target.id === `field:${key}`))
      )
    }
    default:
      return false
  }
}

function splitsSurrogatePair(source: string, offset: number): boolean {
  if (offset <= 0 || offset >= source.length) return false
  const prior = source.charCodeAt(offset - 1)
  const current = source.charCodeAt(offset)
  return prior >= 0xd800 && prior <= 0xdbff && current >= 0xdc00 && current <= 0xdfff
}

function validateTargetReferences(
  value: unknown,
  path: readonly (string | number)[],
  targetIds: ReadonlySet<string>,
  referencedTargets: Set<string> | undefined,
  maximum?: number
): SceneDiagnosticV1 | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return sceneDiagnostic('scene-plan-shape-invalid', {path})
  }
  if (maximum !== undefined && value.length > maximum) {
    return sceneDiagnostic('scene-plan-limit-exceeded', {
      path,
      limit: {
        name: 'targetReferencesPerRelationship',
        maximum,
        actual: value.length
      }
    })
  }
  const seen = new Set<string>()
  for (const [index, id] of value.entries()) {
    if (typeof id !== 'string' || !targetIds.has(id)) {
      return sceneDiagnostic('scene-plan-reference-missing', {
        path: [...path, index]
      })
    }
    if (seen.has(id)) {
      return sceneDiagnostic('scene-plan-id-duplicate', {
        path: [...path, index]
      })
    }
    seen.add(id)
    referencedTargets?.add(id)
  }
  return undefined
}

function validateReviewedProvenance(
  provenance: ScenePlanProvenanceV1
): SceneDiagnosticV1 | undefined {
  if (
    provenance.kind !== 'reviewed-proposal' ||
    !isIdentifier(provenance.engine.version) ||
    !isIdentifier(provenance.generator.id) ||
    (provenance.generator.version !== undefined &&
      !isIdentifier(provenance.generator.version)) ||
    !isIdentifier(provenance.review.id) ||
    provenance.review.status !== 'approved'
  ) {
    return sceneDiagnostic('scene-plan-provenance-invalid', {
      path: ['provenance']
    })
  }
  return undefined
}

function validateDeterministicProvenance(
  provenance: ScenePlanProvenanceV1
): SceneDiagnosticV1 | undefined {
  if (
    provenance.kind !== 'deterministic-recipe' ||
    !isIdentifier(provenance.engine.version) ||
    !Array.isArray(provenance.appliedCorrections) ||
    provenance.appliedCorrections.length > scenePlanLimitsV1.semanticCorrections ||
    provenance.appliedCorrections.some(
      (correction) =>
        !['target', 'label', 'relationship'].includes(correction.kind) ||
        !isIdentifier(correction.ref)
    )
  ) {
    return sceneDiagnostic('scene-plan-provenance-invalid', {
      path: ['provenance']
    })
  }
  return undefined
}

function compareTargets(left: AnnotationTargetV1, right: AnnotationTargetV1): number {
  const byRange = left.ranges[0].start - right.ranges[0].start
  if (byRange !== 0) return byRange
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function findUnknownCandidateField(value: Record<string, unknown>): readonly (
  | string
  | number
)[] | undefined {
  const topLevel = unknownObjectField(
    value,
    [
      'schema',
      'schemaVersion',
      'recipe',
      'localization',
      'title',
      'source',
      'targets',
      'labels',
      'relationships',
      'gestures',
      'provenance'
    ],
    []
  )
  if (topLevel) return topLevel

  const fixedObjects: Array<[
    unknown,
    readonly string[],
    readonly (string | number)[]
  ]> = [
    [value.recipe, ['name', 'version'], ['recipe']],
    [value.localization, ['locale', 'catalog'], ['localization']],
    [
      isRecord(value.localization) ? value.localization.catalog : undefined,
      ['id', 'version'],
      ['localization', 'catalog']
    ],
    [value.source, ['text', 'identity'], ['source']],
    [
      isRecord(value.source) ? value.source.identity : undefined,
      ['normalization', 'algorithm', 'digest'],
      ['source', 'identity']
    ]
  ]
  for (const [entry, allowed, path] of fixedObjects) {
    if (!isRecord(entry)) continue
    const unknown = unknownObjectField(entry, allowed, path)
    if (unknown) return unknown
  }

  if (Array.isArray(value.targets)) {
    for (const [index, entry] of value.targets.entries()) {
      if (!isRecord(entry)) continue
      const unknown = unknownObjectField(
        entry,
        ['id', 'role', 'semanticAnchor', 'ranges'],
        ['targets', index]
      )
      if (unknown) return unknown
      if (isRecord(entry.semanticAnchor)) {
        const anchorUnknown = unknownObjectField(
          entry.semanticAnchor,
          ['name'],
          ['targets', index, 'semanticAnchor']
        )
        if (anchorUnknown) return anchorUnknown
      }
      if (Array.isArray(entry.ranges)) {
        const ranges = decodeDenseDataArray(entry.ranges)
        if (ranges === undefined) continue
        for (const [rangeIndex, range] of ranges.entries()) {
          if (!isRecord(range)) continue
          const rangeUnknown = unknownObjectField(
            range,
            ['start', 'end', 'exactText'],
            ['targets', index, 'ranges', rangeIndex]
          )
          if (rangeUnknown) return rangeUnknown
        }
      }
    }
  }

  if (Array.isArray(value.labels)) {
    for (const [index, entry] of value.labels.entries()) {
      if (!isRecord(entry)) continue
      const unknown = unknownObjectField(entry, ['id', 'text'], ['labels', index])
      if (unknown) return unknown
    }
  }

  if (Array.isArray(value.relationships)) {
    for (const [index, entry] of value.relationships.entries()) {
      if (!isRecord(entry)) continue
      const allowed =
        entry.kind === 'relates'
          ? [
              'id',
              'kind',
              'relation',
              'labelId',
              'fromTargetIds',
              'toTargetIds',
              'detailKind',
              'legendText'
            ]
          : [
              'id',
              'kind',
              'labelId',
              'targetIds',
              'detailKind',
              'legendText'
            ]
      const unknown = unknownObjectField(entry, allowed, ['relationships', index])
      if (unknown) return unknown
    }
  }

  if (Array.isArray(value.gestures)) {
    for (const [index, entry] of value.gestures.entries()) {
      if (!isRecord(entry)) continue
      const allowed =
        entry.kind === 'emphasize'
          ? ['id', 'kind', 'targetIds', 'intent']
          : entry.kind === 'verdict'
            ? ['id', 'kind', 'relationshipId', 'intent']
            : ['id', 'kind', 'relationshipId']
      const unknown = unknownObjectField(entry, allowed, ['gestures', index])
      if (unknown) return unknown
    }
  }

  if (isRecord(value.provenance)) {
    const provenanceAllowed =
      value.provenance.kind === 'deterministic-recipe'
        ? ['kind', 'engine', 'appliedCorrections']
        : ['kind', 'engine', 'generator', 'review']
    const unknown = unknownObjectField(
      value.provenance,
      provenanceAllowed,
      ['provenance']
    )
    if (unknown) return unknown
    const provenanceChildren: Array<[
      unknown,
      readonly string[],
      readonly (string | number)[]
    ]> = [
      [value.provenance.engine, ['name', 'version'], ['provenance', 'engine']],
      [value.provenance.generator, ['id', 'version'], ['provenance', 'generator']],
      [value.provenance.review, ['status', 'id'], ['provenance', 'review']]
    ]
    for (const [entry, allowed, path] of provenanceChildren) {
      if (!isRecord(entry)) continue
      const childUnknown = unknownObjectField(entry, allowed, path)
      if (childUnknown) return childUnknown
    }
    if (Array.isArray(value.provenance.appliedCorrections)) {
      for (const [index, entry] of value.provenance.appliedCorrections.entries()) {
        if (!isRecord(entry)) continue
        const correctionUnknown = unknownObjectField(
          entry,
          ['kind', 'ref'],
          ['provenance', 'appliedCorrections', index]
        )
        if (correctionUnknown) return correctionUnknown
      }
    }
  }
  return undefined
}

function unknownObjectField(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: readonly (string | number)[]
): readonly (string | number)[] | undefined {
  const ownKeys = Reflect.ownKeys(value)
  if (ownKeys.some((key) => typeof key !== 'string')) {
    return [...path, '<symbol>']
  }
  const stringKeys = ownKeys as string[]
  const nonDataKey = stringKeys
    .filter((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      return (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, 'value')
      )
    })
    .sort()[0]
  if (nonDataKey !== undefined) return [...path, nonDataKey]
  const unknown = stringKeys.filter((key) => !allowed.includes(key)).sort()[0]
  return unknown === undefined ? undefined : [...path, unknown]
}

function sceneDiagnostic(
  code: SceneDiagnosticCodeV1,
  detail: Omit<SceneDiagnosticV1, 'code' | 'message'> = {}
): SceneDiagnosticV1 {
  return {code, message: sceneDiagnosticMessages[code], ...detail}
}

function sceneFailure(
  code: SceneDiagnosticCodeV1,
  detail: Omit<SceneDiagnosticV1, 'code' | 'message'> = {}
): ScenePlanResult {
  return {ok: false, plan: null, diagnostics: [sceneDiagnostic(code, detail)]}
}

function validateCanonicalSource(source: string): SceneDiagnosticV1 | undefined {
  if (hasUnpairedSurrogate(source)) {
    return sceneDiagnostic('scene-source-unpaired-surrogate')
  }
  if (source.length === 0) return sceneDiagnostic('scene-source-empty')
  if (source.length > scenePlanLimitsV1.sourceCodeUnits) {
    return sceneDiagnostic('scene-source-too-long', {
      limit: {
        name: 'sourceCodeUnits',
        maximum: scenePlanLimitsV1.sourceCodeUnits,
        actual: source.length
      }
    })
  }
  return undefined
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) return true
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true
    }
  }
  return false
}

function createSceneTargetsV1(
  source: string,
  task: ParsedTask
): AnnotationTargetV1[] {
  const targets: AnnotationTargetV1[] = [
    {
      id: 'state',
      role: 'state',
      ranges: [rangeWithText(source, task.state.range)]
    },
    {
      id: 'stable-id',
      role: 'stable-id',
      ranges: [rangeWithText(source, task.stableId.range)]
    },
    {
      id: 'description',
      role: 'description',
      ranges: task.descriptionRanges.map((range) =>
        rangeWithText(source, range)
      ) as unknown as NonEmpty<SourceRangeV1>
    }
  ]

  for (const metadata of task.metadata) {
    const key =
      metadata.role === 'tag'
        ? metadata.text.slice(1)
        : metadata.role === 'field'
          ? metadata.text.slice(1, metadata.text.indexOf(':'))
          : ''
    const id =
      metadata.role === 'tag'
        ? `tag:${key}`
        : metadata.role === 'field'
          ? `field:${key}`
          : 'priority'
    const existing = targets.find((target) => target.id === id)
    const range = rangeWithText(source, metadata)
    if (existing) {
      ;(existing.ranges as unknown as SourceRangeV1[]).push(range)
    } else {
      targets.push({id, role: metadata.role, ranges: [range]})
    }
  }

  return targets.sort(
    (left, right) =>
      left.ranges[0].start - right.ranges[0].start ||
      left.id.localeCompare(right.id)
  )
}

function rangeWithText(
  source: string,
  range: {start: number; end: number}
): SourceRangeV1 {
  return {
    start: range.start,
    end: range.end,
    exactText: source.slice(range.start, range.end)
  }
}

function createTaskSceneGraph(
  targets: readonly AnnotationTargetV1[],
  checked: boolean,
  locale: AnnotationSceneLocale
): Pick<ScenePlanV1, 'labels' | 'relationships' | 'gestures'> {
  const messages = localizedText[locale]
  const labelByRole: Record<AnnotationTargetRole, string> = {
    state: checked ? messages.stateChecked : messages.stateOpen,
    'stable-id': messages.stableId,
    description: messages.description,
    tag: messages.tag,
    priority: messages.priority,
    field: messages.field
  }
  const orderedRoles: readonly AnnotationTargetRole[] = [
    'state',
    'stable-id',
    'description',
    'tag',
    'priority',
    'field'
  ]
  const labels: AnnotationLabelV1[] = []
  const relationships: AnnotationRelationshipV1[] = []
  const gestures: AnnotationGestureV1[] = []

  for (const role of orderedRoles) {
    const roleTargets = targets.filter((target) => target.role === role)
    if (roleTargets.length === 0) continue
    const labelId = `${role}-label`
    const relationshipId = `${role}-annotation`
    const label = labelByRole[role]
    const values = roleTargets.map((target) =>
      target.ranges.map(({exactText}) => exactText).join('\n')
    )
    labels.push({id: labelId, text: label})
    relationships.push({
      id: relationshipId,
      kind: 'describes',
      labelId,
      targetIds: roleTargets.map(({id}) => id) as unknown as NonEmpty<string>,
      detailKind: 'short-description',
      legendText:
        locale === 'zh-CN'
          ? `${label}：${values.join('、')}`
          : `${label}: ${values.join(', ')}`
    })
    gestures.push({
      id: `${relationshipId}-gesture`,
      kind: 'annotate',
      relationshipId
    })
  }
  return {labels, relationships, gestures}
}

function sha256(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64
  const data = new Uint8Array(paddedLength)
  data.set(bytes)
  data[bytes.length] = 0x80
  const bitLength = bytes.length * 8
  const view = new DataView(data.buffer)
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false)
  view.setUint32(paddedLength - 4, bitLength >>> 0, false)

  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]
  const state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]
  const words = new Uint32Array(64)

  for (let offset = 0; offset < data.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false)
    }
    for (let index = 16; index < 64; index += 1) {
      const word15 = words[index - 15] ?? 0
      const word2 = words[index - 2] ?? 0
      const sigma0 =
        rotateRight(word15, 7) ^ rotateRight(word15, 18) ^ (word15 >>> 3)
      const sigma1 =
        rotateRight(word2, 17) ^ rotateRight(word2, 19) ^ (word2 >>> 10)
      words[index] =
        ((words[index - 16] ?? 0) + sigma0 + (words[index - 7] ?? 0) + sigma1) >>> 0
    }

    let a = state[0]!
    let b = state[1]!
    let c = state[2]!
    let d = state[3]!
    let e = state[4]!
    let f = state[5]!
    let g = state[6]!
    let h = state[7]!
    for (let index = 0; index < 64; index += 1) {
      const upper1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const choice = (e & f) ^ (~e & g)
      const temporary1 =
        (h + upper1 + choice + (constants[index] ?? 0) + (words[index] ?? 0)) >>> 0
      const upper0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temporary2 = (upper0 + majority) >>> 0
      h = g
      g = f
      f = e
      e = (d + temporary1) >>> 0
      d = c
      c = b
      b = a
      a = (temporary1 + temporary2) >>> 0
    }
    state[0] = ((state[0] ?? 0) + a) >>> 0
    state[1] = ((state[1] ?? 0) + b) >>> 0
    state[2] = ((state[2] ?? 0) + c) >>> 0
    state[3] = ((state[3] ?? 0) + d) >>> 0
    state[4] = ((state[4] ?? 0) + e) >>> 0
    state[5] = ((state[5] ?? 0) + f) >>> 0
    state[6] = ((state[6] ?? 0) + g) >>> 0
    state[7] = ((state[7] ?? 0) + h) >>> 0
  }

  return state.map((word) => word.toString(16).padStart(8, '0')).join('')
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits))
}

/**
 * Derive a deterministic, presentation-independent Scene plan.
 *
 * This is the Module's sole runtime Interface. Expected author errors are
 * returned as stable diagnostics and never thrown.
 */
export function deriveAnnotationScene(
  input: DeriveAnnotationSceneInput
): AnnotationSceneResult {
  const result = createScenePlan(input)
  if (!result.ok) {
    return {
      ok: false,
      plan: null,
      diagnostics: result.diagnostics.map(toLegacyDiagnostic)
    }
  }

  const locale = result.plan.localization.locale as AnnotationSceneLocale
  const targets = createLegacyTargets(result.plan)
  const state = targets.find(({role}) => role === 'state')
  return {
    ok: true,
    plan: {
      schemaVersion: 1,
      recipe: {name: 'task-explainer', version: 1},
      locale,
      title: result.plan.title,
      source: result.plan.source.text,
      targets,
      annotations: createAnnotations(
        targets,
        state?.exactText !== '[ ]',
        locale
      )
    },
    diagnostics: []
  }
}

function toLegacyDiagnostic(
  value: SceneDiagnosticV1
): AnnotationSceneDiagnostic {
  if (value.recipeCode === 'task-explainer@1/task-syntax-invalid') {
    return diagnostic('scene-task-syntax-invalid')
  }
  if (value.recipeCode === 'task-explainer@1/priority-ambiguous') {
    return diagnostic('scene-task-priority-ambiguous')
  }
  return {code: value.code, message: value.message}
}

function createLegacyTargets(plan: ScenePlanV1): AnnotationSceneTarget[] {
  const targets: AnnotationSceneTarget[] = []
  const roleOrdinals = new Map<AnnotationTargetRole, number>()
  const roles: readonly AnnotationTargetRole[] = [
    'state',
    'stable-id',
    'description',
    'tag',
    'priority',
    'field'
  ]

  for (const role of roles) {
    const matching = plan.targets.filter((target) => target.role === role)
    for (const target of matching) {
      if (role === 'state' || role === 'stable-id' || role === 'description') {
        targets.push({
          id: role,
          role,
          exactText: target.ranges.map(({exactText}) => exactText).join('\n'),
          ranges: target.ranges.map(({start, end}) => ({start, end})) as [
            AnnotationSourceRange,
            ...AnnotationSourceRange[]
          ]
        })
        continue
      }
      for (const range of target.ranges) {
        const ordinal = (roleOrdinals.get(role) ?? 0) + 1
        roleOrdinals.set(role, ordinal)
        targets.push({
          id: ordinal === 1 ? role : `${role}-${ordinal}`,
          role,
          exactText: range.exactText,
          ranges: [{start: range.start, end: range.end}]
        })
      }
    }
  }
  return targets
}

function normalizeSource(source: string): string {
  return source.replace(/\r\n?/gu, '\n').trim()
}

function diagnostic(
  code: LegacyAnnotationSceneDiagnosticCode
): AnnotationSceneDiagnostic {
  return {code, message: diagnosticMessages[code]}
}

function isRecipeName(value: string): value is AnnotationRecipeName {
  return (annotationRecipeNames as readonly string[]).includes(value)
}

function resolveLocale(value: unknown): AnnotationSceneLocale | null {
  if (typeof value !== 'string') return null
  const compared = value.toLowerCase()
  if (compared === 'en') return 'en'
  if (compared === 'zh-cn') return 'zh-CN'
  return null
}

function parseTask(
  source: string,
  corrections: readonly SemanticCorrectionV1[] = []
): ParsedTask | TaskParseFailure | TaskCorrectionFailure {
  const firstLineEnd = source.indexOf('\n') === -1 ? source.length : source.indexOf('\n')
  const firstLine = source.slice(0, firstLineEnd)
  const header = /^(?:-\s+)?(\[(?: |x|X)\])\s+([A-Z][A-Z0-9]*-\d+)(?=\s|$)/u.exec(
    firstLine
  )

  if (!header || header.index !== 0) {
    return taskFailure('task-syntax-invalid')
  }

  const stateText = header[1]
  const stableIdText = header[2]
  if (!stateText || !stableIdText) {
    return taskFailure('task-syntax-invalid')
  }

  const stateStart = firstLine.indexOf(stateText)
  const stableIdStart = firstLine.indexOf(stableIdText, stateStart + stateText.length)
  const remainderStart = stableIdStart + stableIdText.length
  const metadataResult = findMetadata(firstLine, remainderStart)
  if ('code' in metadataResult) return metadataResult
  let metadata = metadataResult.metadata

  const priorities = metadata.filter((item) => item.role === 'priority')
  if (priorities.length > 1) {
    const priorityCorrection = corrections.find(
      (
        correction
      ): correction is Extract<SemanticCorrectionV1, {kind: 'target'}> =>
        correction.kind === 'target' && correction.slot === 'priority'
    )
    if (priorityCorrection === undefined) {
      return taskFailure('priority-ambiguous', {
        candidates: priorities.map(({start, end}) => ({start, end}))
      })
    }
    const selected = priorities.find(
      ({start, end, text}) =>
        priorityCorrection.ranges.length === 1 &&
        priorityCorrection.ranges[0].start === start &&
        priorityCorrection.ranges[0].end === end &&
        priorityCorrection.ranges[0].exactText === text
    )
    if (selected === undefined) {
      return {
        diagnostic: sceneDiagnostic('scene-correction-invalid', {
          path: [
            'corrections',
            corrections.indexOf(priorityCorrection),
            'ranges'
          ]
        })
      }
    }
    metadata = metadata.filter(
      (item) => item.role !== 'priority' || item === selected
    )
  }

  const fieldValues = new Map<string, MetadataMatch>()
  for (const item of metadata.filter(({role}) => role === 'field')) {
    const colon = item.text.indexOf(':')
    const key = item.text.slice(1, colon)
    const previous = fieldValues.get(key)
    if (previous && previous.text.slice(previous.text.indexOf(':') + 1) !== item.text.slice(colon + 1)) {
      return taskFailure('structured-key-conflict', {
        sourceRange: {start: item.start, end: item.end},
        candidates: [previous, item].map(({start, end}) => ({start, end}))
      })
    }
    fieldValues.set(key, item)
  }

  const titleRanges = rangesOutsideMetadata(
    firstLine,
    remainderStart,
    firstLineEnd,
    metadata
  )
  const detailRanges = findDetailRanges(source, firstLineEnd)
  const allDescriptionRanges = [...titleRanges, ...detailRanges]
  if (allDescriptionRanges.length === 0) {
    return taskFailure('description-missing')
  }
  const descriptionRanges = allDescriptionRanges as [
    AnnotationSourceRange,
    ...AnnotationSourceRange[]
  ]

  return {
    state: {
      text: stateText,
      range: {start: stateStart, end: stateStart + stateText.length},
      checked: stateText !== '[ ]'
    },
    stableId: {
      text: stableIdText,
      range: {start: stableIdStart, end: stableIdStart + stableIdText.length}
    },
    descriptionRanges,
    metadata
  }
}

function findMetadata(
  firstLine: string,
  from: number
): {metadata: MetadataMatch[]} | TaskParseFailure {
  const metadata: MetadataMatch[] = []
  const pattern = /\S+/gu

  for (const match of firstLine.slice(from).matchAll(pattern)) {
    const text = match[0]
    if (!text || !['#', '!', '@'].includes(text[0] ?? '')) continue
    const start = from + (match.index ?? 0)
    const role = /^#[\p{L}\p{N}_-]+$/u.test(text)
      ? 'tag'
      : /^!(?:low|medium|high|urgent)$/iu.test(text)
        ? 'priority'
        : /^@[A-Za-z][A-Za-z0-9_-]*:\S+$/u.test(text)
          ? 'field'
          : undefined
    if (!role) {
      return taskFailure('metadata-invalid', {
        sourceRange: {start, end: start + text.length}
      })
    }
    metadata.push({
      role,
      text,
      start,
      end: start + text.length
    })
  }

  return {metadata}
}

function taskFailure(
  reason: TaskParseFailure['recipeCode'] extends `task-explainer@1/${infer Value}`
    ? Value
    : never,
  detail: Pick<TaskParseFailure, 'sourceRange' | 'candidates'> = {}
): TaskParseFailure {
  return {
    code: 'scene-recipe-rejected',
    recipeCode: `task-explainer@1/${reason}` as TaskParseFailure['recipeCode'],
    ...detail
  }
}

function rangesOutsideMetadata(
  source: string,
  start: number,
  end: number,
  metadata: readonly MetadataMatch[]
): AnnotationSourceRange[] {
  const ranges: AnnotationSourceRange[] = []
  let cursor = start

  for (const item of metadata) {
    const range = trimmedRange(source, cursor, item.start)
    if (range) ranges.push(range)
    cursor = item.end
  }

  const finalRange = trimmedRange(source, cursor, end)
  if (finalRange) ranges.push(finalRange)
  return ranges
}

function findDetailRanges(source: string, firstLineEnd: number): AnnotationSourceRange[] {
  const ranges: AnnotationSourceRange[] = []
  let lineStart = firstLineEnd < source.length ? firstLineEnd + 1 : source.length

  while (lineStart < source.length) {
    const nextBreak = source.indexOf('\n', lineStart)
    const lineEnd = nextBreak === -1 ? source.length : nextBreak
    const range = trimmedRange(source, lineStart, lineEnd)
    if (range) ranges.push(range)
    if (nextBreak === -1) break
    lineStart = nextBreak + 1
  }

  return ranges
}

function trimmedRange(
  source: string,
  start: number,
  end: number
): AnnotationSourceRange | undefined {
  while (start < end && /\s/u.test(source[start] ?? '')) start += 1
  while (end > start && /\s/u.test(source[end - 1] ?? '')) end -= 1
  return start < end ? {start, end} : undefined
}

function createTargets(
  source: string,
  task: ParsedTask
): AnnotationSceneTarget[] {
  const targets: AnnotationSceneTarget[] = [
    {
      id: 'state',
      role: 'state',
      exactText: task.state.text,
      ranges: [task.state.range]
    },
    {
      id: 'stable-id',
      role: 'stable-id',
      exactText: task.stableId.text,
      ranges: [task.stableId.range]
    },
    {
      id: 'description',
      role: 'description',
      exactText: task.descriptionRanges
        .map((range) => source.slice(range.start, range.end))
        .join('\n'),
      ranges: task.descriptionRanges
    }
  ]

  for (const role of ['tag', 'priority', 'field'] as const) {
    const matches = task.metadata.filter((item) => item.role === role)
    matches.forEach((item, index) => {
      targets.push({
        id: index === 0 ? role : `${role}-${index + 1}`,
        role,
        exactText: item.text,
        ranges: [{start: item.start, end: item.end}]
      })
    })
  }

  return targets
}

function createAnnotations(
  targets: readonly AnnotationSceneTarget[],
  checked: boolean,
  locale: AnnotationSceneLocale
): AnnotationSceneAnnotation[] {
  const text = localizedText[locale]
  const labels: Record<AnnotationTargetRole, string> = {
    state: checked ? text.stateChecked : text.stateOpen,
    'stable-id': text.stableId,
    description: text.description,
    tag: text.tag,
    priority: text.priority,
    field: text.field
  }
  const annotations: AnnotationSceneAnnotation[] = []

  for (const role of [
    'state',
    'stable-id',
    'description',
    'tag',
    'priority',
    'field'
  ] as const) {
    const matchingTargets = targets.filter((target) => target.role === role)
    const first = matchingTargets[0]
    if (!first) continue
    const targetIds = matchingTargets.map((target) => target.id) as [string, ...string[]]
    const values = matchingTargets.map((target) => target.exactText)
    const label = labels[role]
    annotations.push({
      id: `${role}-annotation`,
      label,
      targetIds,
      fallback:
        locale === 'zh-CN'
          ? `${label}：${values.join('、')}`
          : `${label}: ${values.join(', ')}`
    })
  }

  return annotations
}
