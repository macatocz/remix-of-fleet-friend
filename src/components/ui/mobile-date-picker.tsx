import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MobileDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  min?: string; // "YYYY-MM-DD"
  max?: string; // "YYYY-MM-DD"
  className?: string;
  disabled?: boolean;
}

const toDate = (v: string): Date | undefined => {
  if (!v) return undefined;
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
};

const toStr = (d: Date): string => format(d, "yyyy-MM-dd");

export function MobileDatePicker({
  value,
  onChange,
  placeholder = "Vyberte datum",
  min,
  max,
  className,
  disabled,
}: MobileDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);
  const minDate = toDate(min || "");
  const maxDate = toDate(max || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-start text-left font-normal text-base",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, "d. M. yyyy", { locale: cs }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected || minDate}
          onSelect={(d) => {
            if (d) {
              onChange(toStr(d));
              setOpen(false);
            }
          }}
          disabled={
            minDate || maxDate
              ? (date) => (!!minDate && date < minDate) || (!!maxDate && date > maxDate)
              : undefined
          }
          locale={cs}
          weekStartsOn={1}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}