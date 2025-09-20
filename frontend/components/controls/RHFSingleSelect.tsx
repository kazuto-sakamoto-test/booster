"use client"
import { Controller, Control, FieldValues, Path } from "react-hook-form"
import { Box, Text } from "@yamada-ui/react"
import SingleSelect from "./SingleSelect"

type Props<T extends FieldValues> = {
    control: Control<T>
    name: Path<T>
    label: string
    options: readonly string[]
    placeholder?: string
    required?: boolean
}

export default function RHFSingleSelect<T extends FieldValues>({
    control, name, label, options, placeholder, required,
}: Props<T>) {
    return (
        <Controller
        control={control}
        name={name}
        rules={required ? { required: "必須項目です" } : undefined}
        render={({ field, fieldState }) => (
            <Box>
                <SingleSelect
                label={label}
                value={field.value}
                onChange={field.onChange}
                options={options}
                placeholder={placeholder}
                required={required}
                />
                {fieldState.error?.message && (
                    <Text mt={1} color="danger.600" fontSize="sm">
                        {fieldState.error.message}
                    </Text>
                )}
            </Box>
        )}
        />
    )
}