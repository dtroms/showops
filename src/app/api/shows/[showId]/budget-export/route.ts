import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewBudget } from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'

type BudgetVersionRow = {
  id: string
  version_type: 'pre' | 'post'
  version_name: string
  is_current: boolean
  created_at: string
}

type BudgetLineRow = {
  id: string
  version_id: string
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  days: number | null
  hours: number | null
  unit_cost: number | null
  subtotal: number | null
  calculation_type: string | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  overtime_rate: number | null
  notes: string | null
}

type ShowRow = {
  id: string
  show_name: string | null
  show_number: string | null
  estimated_revenue: number | null
}

type ComparisonRow = {
  key: string
  sectionLabel: string
  lineName: string
  subgroupType: string | null
  preQuantity: number | null
  postQuantity: number | null
  preDays: number | null
  postDays: number | null
  preHours: number | null
  postHours: number | null
  preUnitCost: number | null
  postUnitCost: number | null
  preSubtotal: number
  postSubtotal: number
  variance: number
  variancePercent: number | null
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function getSectionLabel(sectionType: string) {
  const normalized = normalizeSectionType(sectionType)

  switch (normalized) {
    case 'gear':
      return 'Gear'
    case 'w2_labor':
      return 'W2 Labor'
    case 'freelance_labor':
      return 'Freelance Labor'
    case 'supply':
      return 'Supplies'
    case 'travel':
      return 'Travel'
    default:
      return normalized
  }
}

function getLineKey(line: BudgetLineRow) {
  return [
    normalizeSectionType(line.section_type),
    line.subgroup_type ?? '',
    line.line_name.trim().toLowerCase(),
  ].join('::')
}

function getVariancePercent(preValue: number, postValue: number) {
  if (!preValue) return null
  return Number((((postValue - preValue) / preValue) * 100).toFixed(2))
}

function sumBySection(lines: BudgetLineRow[], sectionType: string) {
  const normalizedRequestedSection = normalizeSectionType(sectionType)

  return lines.reduce((sum, line) => {
    return normalizeSectionType(line.section_type) === normalizedRequestedSection
      ? sum + Number(line.subtotal ?? 0)
      : sum
  }, 0)
}

function buildComparisonRows(
  preLines: BudgetLineRow[],
  postLines: BudgetLineRow[]
): ComparisonRow[] {
  const preMap = new Map<string, BudgetLineRow>()
  const postMap = new Map<string, BudgetLineRow>()

  for (const line of preLines) preMap.set(getLineKey(line), line)
  for (const line of postLines) postMap.set(getLineKey(line), line)

  const allKeys = Array.from(new Set([...preMap.keys(), ...postMap.keys()]))

  return allKeys
    .map((key) => {
      const preLine = preMap.get(key) ?? null
      const postLine = postMap.get(key) ?? null
      const sourceLine = preLine ?? postLine

      if (!sourceLine) return null

      const preSubtotal = Number(preLine?.subtotal ?? 0)
      const postSubtotal = Number(postLine?.subtotal ?? 0)

      return {
        key,
        sectionLabel: getSectionLabel(sourceLine.section_type),
        lineName: sourceLine.line_name,
        subgroupType: sourceLine.subgroup_type,
        preQuantity: preLine?.quantity ?? null,
        postQuantity: postLine?.quantity ?? null,
        preDays: preLine?.days ?? null,
        postDays: postLine?.days ?? null,
        preHours: preLine?.hours ?? null,
        postHours: postLine?.hours ?? null,
        preUnitCost: preLine?.unit_cost ?? null,
        postUnitCost: postLine?.unit_cost ?? null,
        preSubtotal,
        postSubtotal,
        variance: postSubtotal - preSubtotal,
        variancePercent: getVariancePercent(preSubtotal, postSubtotal),
      }
    })
    .filter((row): row is ComparisonRow => Boolean(row))
    .sort((a, b) => {
      if (a.sectionLabel !== b.sectionLabel) {
        return a.sectionLabel.localeCompare(b.sectionLabel)
      }
      return a.lineName.localeCompare(b.lineName)
    })
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  }
  row.alignment = { vertical: 'middle', horizontal: 'left' }
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns?.forEach((column) => {
    let maxLength = 12
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value
      const cellLength =
        typeof value === 'string'
          ? value.length
          : typeof value === 'number'
            ? value.toString().length
            : value && typeof value === 'object' && 'text' in value
              ? String(value.text).length
              : 0

      if (cellLength > maxLength) maxLength = cellLength
    })

    column.width = Math.min(maxLength + 2, 40)
  })
}

function addVersionSheet(params: {
  workbook: ExcelJS.Workbook
  sheetName: string
  show: ShowRow
  version: BudgetVersionRow
  lines: BudgetLineRow[]
}) {
  const { workbook, sheetName, show, version, lines } = params
  const worksheet = workbook.addWorksheet(sheetName)

  worksheet.addRow(['Show Name', show.show_name ?? ''])
  worksheet.addRow(['Show Number', show.show_number ?? ''])
  worksheet.addRow(['Budget Version', version.version_name])
  worksheet.addRow(['Version Type', version.version_type === 'pre' ? 'Pre-Show' : 'Post-Show'])
  worksheet.addRow(['Estimated Revenue', Number(show.estimated_revenue ?? 0)])
  worksheet.addRow([])

  const headerRow = worksheet.addRow([
    'Category',
    'Subgroup',
    'Line Item',
    'Quantity',
    'Days',
    'Hours',
    'Rate',
    'Calculation Type',
    'OT Enabled',
    'OT Hours',
    'OT Rate',
    'Subtotal',
    'Notes',
  ])
  applyHeaderStyle(headerRow)

  for (const line of lines) {
    worksheet.addRow([
      getSectionLabel(line.section_type),
      line.subgroup_type ?? '',
      line.line_name,
      line.quantity ?? '',
      line.days ?? '',
      line.hours ?? '',
      Number(line.unit_cost ?? 0),
      line.calculation_type ?? '',
      line.overtime_enabled ? 'Yes' : 'No',
      line.overtime_hours ?? '',
      line.overtime_rate ?? '',
      Number(line.subtotal ?? 0),
      line.notes ?? '',
    ])
  }

  worksheet.getColumn(5).numFmt = '$#,##0.00'
  worksheet.getColumn(11).numFmt = '$#,##0.00'
  worksheet.getColumn(12).numFmt = '$#,##0.00'

  autoFitColumns(worksheet)
}

function addVarianceSheet(params: {
  workbook: ExcelJS.Workbook
  comparisonRows: ComparisonRow[]
  preTotal: number
  postTotal: number
  revenue: number
}) {
  const { workbook, comparisonRows, preTotal, postTotal, revenue } = params
  const worksheet = workbook.addWorksheet('Variance')

  const totalVariance = postTotal - preTotal
  const preProfit = revenue - preTotal
  const postProfit = revenue - postTotal
  const variancePercent = getVariancePercent(preTotal, postTotal)

  worksheet.addRow(['Metric', 'Value'])
  applyHeaderStyle(worksheet.getRow(1))

  worksheet.addRow(['Pre-Show Total Cost', preTotal])
  worksheet.addRow(['Post-Show Total Cost', postTotal])
  worksheet.addRow(['Variance', totalVariance])
  worksheet.addRow(['Variance %', variancePercent !== null ? variancePercent / 100 : ''])
  worksheet.addRow(['Pre-Show Profit', preProfit])
  worksheet.addRow(['Post-Show Profit', postProfit])
  worksheet.addRow([])

  const headerRow = worksheet.addRow([
    'Category',
    'Subgroup',
    'Line Item',
    'Pre Qty',
    'Post Qty',
    'Pre Days',
    'Post Days',
    'Pre Hours',
    'Post Hours',
    'Pre Rate',
    'Post Rate',
    'Pre Total',
    'Post Total',
    'Variance',
    'Variance %',
  ])
  applyHeaderStyle(headerRow)

  for (const row of comparisonRows) {
    worksheet.addRow([
      row.sectionLabel,
      row.subgroupType ?? '',
      row.lineName,
      row.preQuantity ?? '',
      row.postQuantity ?? '',
      row.preDays ?? '',
      row.postDays ?? '',
      row.preHours ?? '',
      row.postHours ?? '',
      Number(row.preUnitCost ?? 0),
      Number(row.postUnitCost ?? 0),
      row.preSubtotal,
      row.postSubtotal,
      row.variance,
      row.variancePercent !== null ? row.variancePercent / 100 : '',
    ])
  }

  ;[2, 3, 5, 6].forEach((rowIndex) => {
    worksheet.getRow(rowIndex).getCell(2).numFmt = '$#,##0.00'
  })

  worksheet.getCell('B4').numFmt = '0.00%'
  worksheet.getColumn(10).numFmt = '$#,##0.00'
  worksheet.getColumn(11).numFmt = '$#,##0.00'
  worksheet.getColumn(12).numFmt = '$#,##0.00'
  worksheet.getColumn(13).numFmt = '$#,##0.00'
  worksheet.getColumn(14).numFmt = '$#,##0.00'
  worksheet.getColumn(15).numFmt = '0.00%'

  autoFitColumns(worksheet)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ showId: string }> }
) {
  const { showId } = await context.params
  const { searchParams } = new URL(request.url)

  const exportType = searchParams.get('type') === 'comparison' ? 'comparison' : 'single'
  const requestedVersionId = searchParams.get('version')

  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId: membership.id,
    orgRole,
  })

  if (!canViewBudget(access)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, show_name, show_number, estimated_revenue')
    .eq('id', showId)
    .eq('organization_id', organizationId)
    .maybeSingle<ShowRow>()

  if (showError || !show) {
    return NextResponse.json({ error: 'Show not found.' }, { status: 404 })
  }

  const { data: versions, error: versionsError } = await supabase
    .from('budget_versions')
    .select('id, version_type, version_name, is_current, created_at')
    .eq('show_id', showId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (versionsError) {
    return NextResponse.json({ error: versionsError.message }, { status: 500 })
  }

  const budgetVersions = (versions ?? []) as BudgetVersionRow[]
  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'ShowOps'
  workbook.company = 'ShowOps'
  workbook.created = new Date()
  workbook.modified = new Date()

  if (exportType === 'single') {
    const targetVersion =
      budgetVersions.find((version) => version.id === requestedVersionId) ??
      budgetVersions.find((version) => version.version_type === 'pre' && version.is_current) ??
      budgetVersions.find((version) => version.version_type === 'pre') ??
      budgetVersions[0] ??
      null

    if (!targetVersion) {
      return NextResponse.json(
        { error: 'No budget version found for export.' },
        { status: 404 }
      )
    }

    const { data: lines, error: linesError } = await supabase
      .from('show_budget_line_items')
      .select(`
        id,
        version_id,
        section_type,
        subgroup_type,
        line_name,
        quantity,
        days,
        hours,
        unit_cost,
        subtotal,
        calculation_type,
        overtime_enabled,
        overtime_hours,
        overtime_rate,
        notes
      `)
      .eq('show_id', showId)
      .eq('version_id', targetVersion.id)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (linesError) {
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }

    addVersionSheet({
      workbook,
      sheetName: targetVersion.version_type === 'pre' ? 'Pre-Show' : 'Post-Show',
      show,
      version: targetVersion,
      lines: (lines ?? []) as BudgetLineRow[],
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const filename = `${(show.show_name ?? 'budget')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')}_${targetVersion.version_type}_budget.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const preVersion =
    budgetVersions.find((version) => version.version_type === 'pre' && version.is_current) ??
    budgetVersions.find((version) => version.version_type === 'pre') ??
    null

  const postVersion =
    budgetVersions.find((version) => version.version_type === 'post' && version.is_current) ??
    budgetVersions.find((version) => version.version_type === 'post') ??
    null

  if (!preVersion || !postVersion) {
    return NextResponse.json(
      { error: 'Both pre-show and post-show budgets are required for comparison export.' },
      { status: 400 }
    )
  }

  const [
    { data: preLines, error: preLinesError },
    { data: postLines, error: postLinesError },
  ] = await Promise.all([
    supabase
      .from('show_budget_line_items')
      .select(`
        id,
        version_id,
        section_type,
        subgroup_type,
        line_name,
        quantity,
        days,
        hours,
        unit_cost,
        subtotal,
        calculation_type,
        overtime_enabled,
        overtime_hours,
        overtime_rate,
        notes
      `)
      .eq('show_id', showId)
      .eq('version_id', preVersion.id)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),

    supabase
      .from('show_budget_line_items')
      .select(`
        id,
        version_id,
        section_type,
        subgroup_type,
        line_name,
        quantity,
        days,
        hours,
        unit_cost,
        subtotal,
        calculation_type,
        overtime_enabled,
        overtime_hours,
        overtime_rate,
        notes
      `)
      .eq('show_id', showId)
      .eq('version_id', postVersion.id)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (preLinesError) {
    return NextResponse.json({ error: preLinesError.message }, { status: 500 })
  }

  if (postLinesError) {
    return NextResponse.json({ error: postLinesError.message }, { status: 500 })
  }

  const preBudgetLines = (preLines ?? []) as BudgetLineRow[]
  const postBudgetLines = (postLines ?? []) as BudgetLineRow[]

  addVersionSheet({
    workbook,
    sheetName: 'Pre-Show',
    show,
    version: preVersion,
    lines: preBudgetLines,
  })

  addVersionSheet({
    workbook,
    sheetName: 'Post-Show',
    show,
    version: postVersion,
    lines: postBudgetLines,
  })

  const preTotal =
    sumBySection(preBudgetLines, 'gear') +
    sumBySection(preBudgetLines, 'w2_labor') +
    sumBySection(preBudgetLines, 'freelance_labor') +
    sumBySection(preBudgetLines, 'supply') +
    sumBySection(preBudgetLines, 'travel')

  const postTotal =
    sumBySection(postBudgetLines, 'gear') +
    sumBySection(postBudgetLines, 'w2_labor') +
    sumBySection(postBudgetLines, 'freelance_labor') +
    sumBySection(postBudgetLines, 'supply') +
    sumBySection(postBudgetLines, 'travel')

  addVarianceSheet({
    workbook,
    comparisonRows: buildComparisonRows(preBudgetLines, postBudgetLines),
    preTotal,
    postTotal,
    revenue: Number(show.estimated_revenue ?? 0),
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `${(show.show_name ?? 'budget_comparison')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')}_budget_comparison.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}