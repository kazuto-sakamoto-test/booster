// 検索ボックス付きの単一選択の共通化
"use client"
import { useMemo, useState } from "react"
import {
    Box, Text, Button, Menu, MenuButton, MenuList, MenuItem,
    Input, Icon, VStack
} from "@yamada-ui/react"
import { ChevronDown } from "@yamada-ui/lucide"
import { required } from "zod/v4-mini"

type Props = {
    label: string
    value?: string
    onChange: (v: string) => void
    options: readonly string[]
    placeholder?: string
    searchable?: boolean
    width?: string | number
    required?: boolean
}

export default function SingleSelect({
    label, value, onChange, options,
    placeholder = "選択してください",
    searchable = true,
    width = "full",
    required = false,
}: Props) {
    const [q, setQ] = useState("")

    const filtered = useMemo(() => {
        if (!q) return options as string[]
        const k = q.toLowerCase()
        return (options as string[]).filter(o => o.toLowerCase().includes(k))
    }, [q, options])

    return (
        <Box w={width}>
            <Text as="label" fontWeight="semibold">
                {label}{required && <Text as="span" color="danger.600"> *</Text>}
            </Text>

            <Menu matchWidth>
                <MenuButton as={Button} variant="outline" mt={2} rightIcon={<Icon as={ChevronDown} />}>
                {value || placeholder}
                </MenuButton>

                <MenuList maxH="260px" overflowY="auto" p={2}>
                    {searchable && (
                        <Input size="sm" placeholder="検索…" value={q} onChange={(e)=>setQ(e.target.value)} mb={2} />
                    )}

                    <VStack align="stretch" gap={1}>
                        {(filtered.length ? filtered : options).map(opt => (
                            <MenuItem key={opt} onClick={() => onChange(opt)}>
                                {opt}
                            </MenuItem>
                        ))}
                    </VStack>
                </MenuList>
            </Menu>
        </Box>
    )
}