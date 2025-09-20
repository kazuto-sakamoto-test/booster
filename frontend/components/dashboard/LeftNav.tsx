// frontend/components/dashboard/LeftNav.tsx
"use client"

import { useEffect, useState } from "react"
import { Box, VStack, HStack, Text, Icon, Button, Tooltip } from "@yamada-ui/react"
import { House, Heart, Clock, FileText } from "@yamada-ui/lucide"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function LeftNav() {
  // ログイン中ユーザーのメールを表示（未ログイン時は "hitme up"）
  const [email, setEmail] = useState<string | null>(auth.currentUser?.email ?? null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setEmail(u?.email ?? null))
    return () => unsub()
  }, [])

  return (
    <Box
      w="280px"                    // 固定幅（レイアウト崩れ防止）
      flexShrink={0}
      borderRight="1px solid"
      borderColor="neutral.200"
      bg="white"
      minH="calc(100dvh - 120px)" // だいたいの残り高さ
    >
      {/* ヘッダー：家アイコン＋ログインメール（なければ既定文言） */}
      <HStack px={4} py={3} gap={2} borderBottom="1px solid" borderColor="neutral.200">
        <Icon as={House} color="neutral.900" fill="currentColor" stroke="none" />
        <Tooltip
          label={email ?? "hitme up"}
          isDisabled={!email}
          openDelay={400}
          placement="right"
        >
          <Text
            fontWeight="bold"
            fontSize="lg"
            color="neutral.900"
            maxW="180px"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {email ?? "hitme up"}
          </Text>
        </Tooltip>
      </HStack>

      {/* メニュー */}
      <VStack align="stretch" gap={0}>
        <Button
          leftIcon={<Icon as={Heart} />}
          variant="ghost"
          justifyContent="flex-start"
          rounded="none"
          px={4}
          py={3}
        >
          お気に入り
        </Button>
        <Button
          leftIcon={<Icon as={Clock} />}
          variant="ghost"
          justifyContent="flex-start"
          rounded="none"
          px={4}
          py={3}
        >
          閲覧履歴
        </Button>
        <Button
          leftIcon={<Icon as={FileText} />}
          variant="ghost"
          justifyContent="flex-start"
          rounded="none"
          px={4}
          py={3}
        >
          出力済み
        </Button>
      </VStack>
    </Box>
  )
}
