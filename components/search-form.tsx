import * as React from 'react';
import { Search } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"

// Define props interface to include value and onChange for the input
interface SearchFormProps extends Omit<React.ComponentProps<"form">, 'onChange'> {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SearchForm({ value, onChange, ...props }: SearchFormProps) {
  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search history..."
            className="pl-8"
            value={value}
            onChange={onChange}
          />
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
