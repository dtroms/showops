import { listIssueReports } from '@/app/actions/issue-reports'
import { IssueReportsPageShell } from '@/components/settings/issue-reports-page-shell'

export default async function IssuesPage() {
  const issues = await listIssueReports()

  return <IssueReportsPageShell issues={issues} />
}