import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { Input } from "./input";

export interface NumberInputProps
  extends Omit<NumericFormatProps, "value" | "onValueChange"> {
  value: number;
  onValueChange: (value: number) => void;
  stepper?: number;
  min?: number;
  max?: number;
  thousandSeparator?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  fixedDecimalScale?: boolean;
  decimalScale?: number;
  className?: string;
}

export function NumberInput({
  value,
  onValueChange,
  stepper = 1,
  min = -Infinity,
  max = Infinity,
  thousandSeparator,
  placeholder,
  prefix,
  suffix,
  fixedDecimalScale = false,
  decimalScale = 0,
  className,
  ...props
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState<string>(() => String(value));
  const [isFocused, setIsFocused] = useState(false);

  const clamp = useCallback(
    (n: number) => Math.min(max, Math.max(min, n)),
    [min, max]
  );

  const increment = useCallback(() => {
    const next = clamp(value + stepper);
    setInputValue(String(next));
    onValueChange(next);
  }, [value, stepper, clamp, onValueChange]);

  const decrement = useCallback(() => {
    const next = clamp(value - stepper);
    setInputValue(String(next));
    onValueChange(next);
  }, [value, stepper, clamp, onValueChange]);

  const handleValueChange = useCallback(
    (values: { value: string; floatValue: number | undefined }) => {
      // Allow empty string while editing; do not force 0
      if (values.value === "") {
        setInputValue("");
        return;
      }
      // When valid number while editing, update both local display and parent
      if (typeof values.floatValue === "number") {
        setInputValue(values.value);
        onValueChange(values.floatValue);
      }
    },
    [onValueChange]
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (inputValue === "") {
      const fallback =
        Number.isFinite(min) && min !== Infinity && min !== -Infinity ? min : 0;
      const next = clamp(fallback);
      setInputValue(String(next));
      onValueChange(next);
      return;
    }
    const parsed = Number(inputValue);
    const next = Number.isFinite(parsed) ? clamp(parsed) : clamp(value);
    setInputValue(String(next));
    onValueChange(next);
  }, [inputValue, min, clamp, value, onValueChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        decrement();
      }
    },
    [increment, decrement]
  );

  // Sync internal display when parent value changes and input is not actively empty during focus
  useEffect(() => {
    if (!isFocused && inputValue !== String(value)) {
      setInputValue(String(value));
    }
  }, [value, isFocused, inputValue]);

  return (
    <div className="group relative inline-flex w-full items-stretch rounded-md border border-input bg-background transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
      <div className="inline-flex w-full items-stretch overflow-hidden rounded-[inherit]">
        <NumericFormat
          customInput={Input}
          value={inputValue}
          onValueChange={handleValueChange}
          thousandSeparator={thousandSeparator}
          decimalScale={decimalScale}
          fixedDecimalScale={fixedDecimalScale}
          allowNegative={min < 0}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          max={max}
          min={min}
          suffix={suffix}
          prefix={prefix}
          placeholder={placeholder}
          className={`
						border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:border-transparent
						[appearance:textfield]
						[&::-webkit-outer-spin-button]:appearance-none
						[&::-webkit-inner-spin-button]:appearance-none
						${className ?? ""}
					`}
          getInputRef={(el: HTMLInputElement | null) => {
            inputRef.current = el;
          }}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <div className="flex w-8 shrink-0 flex-col border-l border-input divide-y divide-input">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Increase value"
            onClick={increment}
            className="flex-1 w-full flex items-center justify-center pl-1 pr-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 transition-colors"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Decrease value"
            onClick={decrement}
            className="flex-1 w-full flex items-center justify-center pl-1 pr-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 transition-colors"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
