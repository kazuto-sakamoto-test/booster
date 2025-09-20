"use client"

import React from "react"
import { Box, type BoxProps } from "@yamada-ui/react"

/**
 * ネイティブ <select> の属性 + Box の見た目 props を受け取れる Select
 * - style / className / data-* などもそのまま渡せます
 * - isInvalid で赤枠にできます
 */
type SelectNativeProps =
  Omit<BoxProps, "onChange" | "value" | "children"> &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value" | "children"> & {
    id?: string
    value?: string
    onChange: (v: string) => void
    placeholder?: string
    children: React.ReactNode
    isInvalid?: boolean
  }

export default function SelectNative({
  id,
  value,
  onChange,
  placeholder,
  children,
  isInvalid,
  ...rest
}: SelectNativeProps) {
  return (
    <Box
      as="select"
      id={id}
      value={value ?? ""}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      data-invalid={isInvalid ? "" : undefined}
      w="full"
      h={10}
      px={3}
      border="1px"
      borderColor={isInvalid ? "red.500" : "gray.200"}
      rounded="md"
      bg="white"
      _focusVisible={{ outline: "2px solid", outlineColor: "primary.500" }}
      {...rest}
    >
      {placeholder != null && <option value="">{placeholder}</option>}
      {children}
    </Box>
  )
}
