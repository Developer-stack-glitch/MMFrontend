import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

export function DataTableSingleFilter({
  title,
  options,
  selectedValue,
  onFilterChange,
  icon: Icon,
  footer,
}) {
  const selectedOption = options.find(o => o.value === selectedValue)
  const displayLabel = selectedOption ? selectedOption.label : title

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 border-dashed border-[#e5e7eb] bg-[#f9fafb] hover:bg-white hover:border-[#d4af37] transition-all">
          {Icon && <Icon className="mr-2 h-4 w-4" />}
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValue === option.value
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onFilterChange(option.value)
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-slate-900 dark:border-slate-50",
                        isSelected
                          ? "bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    )}
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {footer && (
              <div className="p-2 border-t border-slate-100">
                {footer}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
