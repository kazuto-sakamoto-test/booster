// frontend/components/dashboard/MatterRow.tsx
import Link from "next/link"
import { Box, HStack, Text, Grid, GridItem } from "@yamada-ui/react"

export type MatterView = {
  id: string
  title: string
  badges: string[]
  timeRange?: string
  settlementMin?: number
  settlementMax?: number
  rateNote?: string
  priceLabel?: string
  createdAt?: string
  updatedAt?: string
  area?: string
  workStyle?: string
  startText?: string
}

/** ラベル→配色トークン */
const badgeTheme = (label: string) => {
  if (label === "公開") return { bg: "cyan.50", dot: "cyan.500", border: "cyan.200", text: "cyan.800" }
  if (label === "非公開") return { bg: "neutral.50", dot: "neutral.400", border: "neutral.300", text: "neutral.700" }
  if (/新規|復活|継続/.test(label)) return { bg: "slate.50", dot: "slate.500", border: "slate.200", text: "slate.800" }
  if (/PM|PL|SE|PG|QA|Designer|Consultant/.test(label))
    return { bg: "indigo.50", dot: "indigo.500", border: "indigo.200", text: "indigo.800" }
  if (/SI・業界系|通信|ゲーム|WEB|EC|エンタメ|広告|メーカー|流通|公共|医療|その他/.test(label))
    return { bg: "teal.50", dot: "teal.500", border: "teal.200", text: "teal.800" }
  return { bg: "neutral.50", dot: "neutral.400", border: "neutral.200", text: "neutral.800" }
}

/** 左に小さなドットを持つ pill */
function DotPill({ label }: { label: string }) {
  const t = badgeTheme(label)
  return (
    <HStack
      as="span"
      px={2.5}
      py={0.5}
      gap={1}
      fontSize="xs"
      rounded="full"
      border="1px solid"
      bg={t.bg}
      borderColor={t.border}
      color={t.text}
      whiteSpace="nowrap"
    >
      <Box w="6px" h="6px" rounded="full" bg={t.dot} />
      <Box as="span">{label}</Box>
    </HStack>
  )
}

export default function MatterRow({ matter }: { matter: MatterView }) {
  // タイトル下の補足
  const underTitle = [matter.area, matter.workStyle, matter.startText].filter(Boolean).join("・")

  // 下段メタ
  const leftMeta = [
    matter.timeRange?.trim(),
    (matter.settlementMin ?? matter.settlementMax) !== undefined
      ? `${matter.settlementMin ?? "?"}h ～ ${matter.settlementMax ?? "?"}h`
      : undefined,
  ]
    .filter(Boolean)
    .join(" / ")

  return (
    <Link href={`/matters/${matter.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Box
        px={2}
        py={3}
        position="relative"
        cursor="pointer"
        _hover={{ bg: "neutral.50" }}
        transition="background-color 0.15s ease"
        role="group"
      >
        {/* 右上：作成／更新を絶対配置（常に見える） */}
        <Text
          position="absolute"
          top="8px"
          right="16px"
          fontSize="xs"
          color="neutral.500"
          whiteSpace="nowrap"
          zIndex={1}
        >
          作成：{matter.createdAt ?? "-"}　更新：{matter.updatedAt ?? "-"}
        </Text>

        <Grid templateColumns={{ base: "1fr", md: "1fr auto" }} columnGap={4} rowGap={1} alignItems="center">
          {/* 左：バッジ群 + タイトル + 補足 */}
          <GridItem>
            <HStack wrap="wrap" align="center" mb={1} gap={2}>
              {matter.badges
                .filter((b) => ![matter.area, matter.workStyle, matter.startText].includes(b))
                .map((b, i) => (
                  <DotPill key={`${b}-${i}`} label={b} />
                ))}
            </HStack>

            <HStack align="center" gap={3}>
              <Text
                fontWeight="bold"
                fontSize="md"
                lineHeight="1.4"
                _groupHover={{ textDecoration: "underline" }}
              >
                {matter.title}
              </Text>
            </HStack>

            {underTitle && (
              <Text mt={1} color="neutral.700" fontSize="sm">
                {underTitle}
              </Text>
            )}
          </GridItem>

          {/* 右：単価ピル（必要なら2列目に固定） */}
          <GridItem display={{ base: "none", md: "block" }} textAlign="right" colStart={{ md: 2 }}>
            {matter.priceLabel && (
              <Box
                px={3}
                py={1}
                rounded="md"
                bg="blue.500"
                color="white"
                fontSize="sm"
                fontWeight="bold"
                whiteSpace="nowrap"
              >
                {matter.priceLabel}
              </Box>
            )}
          </GridItem>

          {/* 下段：勤務時間/精算 */}
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Text color="neutral.700" fontSize="sm">
              {leftMeta}
            </Text>
          </GridItem>
        </Grid>
      </Box>
    </Link>
  )
}