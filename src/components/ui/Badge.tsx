export function Badge({children,tone='default'}:{children:React.ReactNode;tone?:'default'|'green'|'amber'}){return <span className={`badge badge-${tone}`}>{children}</span>}
