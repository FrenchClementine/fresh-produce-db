"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SearchableSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyMessage = "No option found.",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono",
            !selectedOption && "text-terminal-muted",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-terminal-panel border-terminal-border" align="start" style={{ maxHeight: 'min(500px, 80vh)' }}>
        <Command className="bg-terminal-panel">
          <CommandInput placeholder={searchPlaceholder} className="font-mono text-terminal-text" />
          <CommandList style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <CommandEmpty className="text-terminal-muted font-mono p-4">{emptyMessage}</CommandEmpty>
            <CommandGroup style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={(currentValue) => {
                    const selectedValue = currentValue === value ? "" : currentValue
                    onValueChange?.(selectedValue)
                    setOpen(false)
                  }}
                  className="font-mono text-terminal-text hover:bg-terminal-dark"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-terminal-accent",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Wrapper components for easier form integration
export interface FormSearchableSelectProps extends SearchableSelectProps {
  name?: string
  required?: boolean
}

export function FormSearchableSelect({
  name,
  required,
  ...props
}: FormSearchableSelectProps) {
  return <SearchableSelect {...props} />
}

// Higher-order component to convert option arrays to SearchableSelectOption format
export function withSearchableOptions<T extends { value: string; label: string }>(
  Component: React.ComponentType<SearchableSelectProps>
) {
  return React.forwardRef<
    HTMLButtonElement,
    Omit<SearchableSelectProps, 'options'> & { options: T[] }
  >(({ options, ...props }, ref) => (
    <Component
      {...props}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        disabled: false,
      }))}
    />
  ))
}

// Utility function to create options from simple arrays
export function createSearchableOptions(
  items: string[] | { value: string; label: string }[]
): SearchableSelectOption[] {
  if (typeof items[0] === 'string') {
    return (items as string[]).map((item) => ({
      value: item.toLowerCase().replace(/\s+/g, '_'),
      label: item,
    }))
  }
  return items as SearchableSelectOption[]
}

// For backward compatibility with existing Select usage patterns
export const SearchableSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & {
    placeholder?: string
    value?: string
    options?: SearchableSelectOption[]
  }
>(({ children, className, placeholder, value, options, ...props }, ref) => {
  const selectedOption = React.useMemo(
    () => options?.find((option) => option.value === value),
    [options, value]
  )
  
  return (
    <Button
      ref={ref}
      variant="outline"
      className={cn(
        "w-full justify-between text-left font-normal",
        !selectedOption && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {selectedOption ? selectedOption.label : placeholder || children}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  )
})

SearchableSelectTrigger.displayName = "SearchableSelectTrigger"