declare module 'react-day-picker' {
  export type CalendarDay = {
    date: Date
    displayMonth: Date
  }

  export type DayModifiers = {
    focused?: boolean
    selected?: boolean
    range_start?: boolean
    range_end?: boolean
    range_middle?: boolean
  }

  export type DayButtonProps = {
    day: CalendarDay
    modifiers: DayModifiers
  } & React.ButtonHTMLAttributes<HTMLButtonElement>

  export type DayPickerProps = {
    className?: string
    classNames?: Record<string, string | undefined>
    showOutsideDays?: boolean
    captionLayout?: string
    mode?: 'single' | 'multiple' | 'range' | undefined
    required?: boolean
    selected?: unknown
    onSelect?: (selected: unknown) => void
    onDayClick?: (day: Date, modifiers: DayModifiers) => void
    defaultMonth?: Date
    month?: Date
    onMonthChange?: (month: Date) => void
    numberOfMonths?: number
    pagedNavigation?: boolean
    reverseMonths?: boolean
    hideNavigation?: boolean
    disableNavigation?: boolean
    formatters?: {
      formatMonthDropdown?: (date: Date) => string
      [key: string]: unknown
    }
    components?: Record<string, React.ElementType | undefined>
    style?: React.CSSProperties
    footer?: React.ReactNode
    [key: string]: unknown
  }

  export const DayButton: React.FC<DayButtonProps>
  export const DayPicker: React.FC<DayPickerProps>
  export const getDefaultClassNames: () => Record<string, string>
  const _default: React.FC<DayPickerProps>
  export default _default
}
