/**
 * The chat itself is rendered by the dashboard shell, so it survives section changes
 * (and it brings its own heading). This page only gives Next a segment to render.
 */
export default function DashboardChatPage() {
  return <span hidden />;
}
