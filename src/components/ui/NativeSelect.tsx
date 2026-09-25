import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => (
    <div className="native-select">
      <select ref={ref} className={cn('native-select-input', className)} {...props}>
        {children}
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </div>
  ),
)
NativeSelect.displayName = 'NativeSelect'

export function NativeSelectOption(props: React.ComponentProps<'option'>) {
  return <option {...props} />
}
