import {
  annotationRecipeLimitsV1,
  annotationRecipePackageProtocolV1,
} from '@madinah/mdx-handwritten-scene/recipes'

const packageName = '@mdx-handwritten-fixtures/recipe-package'
const recipeName = `${packageName}/change`

const limits = Object.freeze({
  ...annotationRecipeLimitsV1,
  sourceCodeUnits: 1_024,
  targets: 2,
  rangesPerTarget: 1,
  ranges: 2,
  labels: 1,
  relationships: 1,
  gestures: 1,
  targetReferencesPerRelationship: 2,
  localizedTextCodeUnits: 512,
  textCodeUnits: 160,
})

const messages = Object.freeze({
  en: Object.freeze({
    title: 'Change from before to after',
    changeLabel: 'changes to',
    changeLegend: 'Before changes to after.',
  }),
  'zh-CN': Object.freeze({
    title: '从修改前变为修改后',
    changeLabel: '变为',
    changeLegend: '修改前的内容变为修改后的内容。',
  }),
})

export const changeRecipe = Object.freeze({
  ref: Object.freeze({name: recipeName, version: 1}),
  roles: Object.freeze(['before', 'after']),
  correctionSlots: Object.freeze({
    targets: Object.freeze(['before', 'after']),
    labels: Object.freeze(['change-label']),
    relationships: Object.freeze(['change']),
  }),
  catalog: Object.freeze({
    id: 'fixture.change.catalog',
    version: 1,
    messages,
  }),
  limits,
  compile(context) {
    const isolationSentinel = 'MDX_HANDWRITTEN_PACKED_RECIPE_COMPILE_SENTINEL_v1'
    if (context.source === isolationSentinel) {
      return {
        ok: false,
        diagnostics: [{reason: 'sentinel-source', message: isolationSentinel}],
      }
    }

    const separator = ' -> '
    const separatorStart = context.source.indexOf(separator)
    if (
      separatorStart <= 0 ||
      separatorStart !== context.source.lastIndexOf(separator) ||
      separatorStart + separator.length >= context.source.length
    ) {
      return {
        ok: false,
        diagnostics: [{
          reason: 'change-syntax-invalid',
          message: 'The source must have exactly one "before -> after" separator.',
        }],
      }
    }

    const afterStart = separatorStart + separator.length
    const beforeText = context.source.slice(0, separatorStart)
    const afterText = context.source.slice(afterStart)
    return {
      ok: true,
      draft: {
        targets: [
          {
            id: 'before',
            role: 'before',
            semanticAnchor: {name: 'before'},
            ranges: [{start: 0, end: separatorStart, exactText: beforeText}],
          },
          {
            id: 'after',
            role: 'after',
            semanticAnchor: {name: 'after'},
            ranges: [{start: afterStart, end: context.source.length, exactText: afterText}],
          },
        ],
        labels: [{id: 'change-label', text: context.messages.changeLabel}],
        relationships: [{
          id: 'change',
          kind: 'relates',
          relation: 'changes-to',
          labelId: 'change-label',
          fromTargetIds: ['before'],
          toTargetIds: ['after'],
          detailKind: 'short-description',
          legendText: context.messages.changeLegend,
        }],
        gestures: [{id: 'connect-change', kind: 'connect', relationshipId: 'change'}],
      },
    }
  },
  validate(context) {
    const [before, after] = context.draft.targets
    if (
      context.draft.targets.length !== 2 ||
      before?.role !== 'before' ||
      after?.role !== 'after'
    ) {
      return {
        ok: false,
        diagnostics: [{
          reason: 'change-targets-invalid',
          message: 'The change recipe requires one before and one after target.',
        }],
      }
    }
    return {ok: true}
  },
})

export const recipePackage = Object.freeze({
  protocol: annotationRecipePackageProtocolV1,
  protocolVersion: 1,
  packageName,
  recipes: Object.freeze([changeRecipe]),
  activeVersions: Object.freeze({[recipeName]: 1}),
})

export default recipePackage
