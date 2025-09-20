"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Box, Text, VStack, HStack, Badge, Icon, Divider, Skeleton, Button,
} from "@yamada-ui/react"
import { MapPin, Clock3, JapaneseYen } from "@yamada-ui/lucide"
import Link from "next/link"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { matterReadConverter } from "@/lib/converters"

export type MatterSeed = {
  id?: string
  title?: string
  jobType?: string
  industry?: string
  timeRange?: string
  workStyle?: string
  area?: { state?: string }
  unitPrice?: { unitMin?: number | null; unitMax?: number | null }
  technologyStack?: { languages?: string[]; tools?: string[] }
  projectDetail?: string
  updatedAt?: any
}

type MatterLite = Required<Pick<MatterSeed, "id" | "title">> &
  Omit<MatterSeed, "id" | "title">

/* ---- ユーティリティ ---- */
const textSnippet = (s?: string, n = 140) =>
  (s ?? "").replace(/\s+/g, " ").slice(0, n) + ((s ?? "").length > n ? "…" : "")

const overlap = (a: string[] = [], b: string[] = []) => {
  const set = new Set(a)
  let c = 0
  for (const t of b) if (set.has(t)) c++
  return c
}

const tsToDate = (ts: any): Date | null =>
  ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null

/* ---- スコアリング ---- */
function score(seed: MatterSeed, other: MatterLite) {
  let s = 0
  if (seed.jobType && other.jobType && seed.jobType === other.jobType) s += 4
  if (seed.industry && other.industry && seed.industry === other.industry) s += 3
  if (seed.workStyle && other.workStyle && seed.workStyle === other.workStyle) s += 1
  if (seed.area?.state && other.area?.state && seed.area.state === other.area.state) s += 1

  const langs = overlap(seed.technologyStack?.languages, other.technologyStack?.languages) // *2
  const tools = overlap(seed.technologyStack?.tools, other.technologyStack?.tools) // *1
  s += langs * 2 + tools * 1

  // 直近ボーナス（30日以内を最大+2点）
  const d = tsToDate(other.updatedAt)
  if (d) {
    const days = (Date.now() - d.getTime()) / 86400000
    s += Math.max(0, 2 - days / 15)
  }
  return s
}

/* ---- Firestore から候補を集める（簡易MVP） ---- */
async function fetchCandidates(seed: MatterSeed, excludeId?: string) {
  const col = collection(db, "matters").withConverter(matterReadConverter)

  const qs = []
  if (seed.jobType) qs.push(query(col, where("jobType", "==", seed.jobType), orderBy("updatedAt","desc"), limit(20)))
  if (seed.industry) qs.push(query(col, where("industry", "==", seed.industry), orderBy("updatedAt","desc"), limit(20)))

  const langs = (seed.technologyStack?.languages ?? []).slice(0, 10)
  if (langs.length) qs.push(query(col, where("technologyStack.languages", "array-contains-any", langs), limit(20)))

  const tools = (seed.technologyStack?.tools ?? []).slice(0, 10)
  if (tools.length) qs.push(query(col, where("technologyStack.tools", "array-contains-any", tools), limit(20)))

  if (!qs.length) qs.push(query(col, orderBy("updatedAt", "desc"), limit(20)))

  const bag = new Map<string, MatterLite>()

  for (const qy of qs) {
    const snap = await getDocs(qy)
    for (const d of snap.docs) {
      const v: any = d.data()
      const id = (v.id ?? d.id) as string
      if (id === excludeId) continue
      if (!bag.has(id)) {
        bag.set(id, {
          id,
          title: v.title ?? "(無題)",
          jobType: v.jobType,
          industry: v.industry,
          timeRange: v.timeRange,
          workStyle: v.workStyle,
          area: v.area,
          unitPrice: v.unitPrice,
          technologyStack: v.technologyStack,
          projectDetail: v.projectDetail,
          updatedAt: v.updatedAt,
        })
      }
    }
  }
  return Array.from(bag.values())
}

/* ---- UI ---- */
export default function RecommendedMatters({
  currentId,
  seed,
  limitCount = 6,
}: {
  currentId: string
  seed: MatterSeed
  limitCount?: number
}) {
  const [items, setItems] = useState<MatterLite[] | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const cand = await fetchCandidates(seed, currentId)
      const sorted = cand
        .map((m) => ({ m, s: score(seed, m) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limitCount)
        .map((x) => x.m)
      if (alive) setItems(sorted)
    })()
    return () => {
      alive = false
    }
  }, [currentId, JSON.stringify(seed)])

  return (
    <Box>
      <Text fontWeight="bold" fontSize="xl" color="green.700" mb={3}>
        こんな案件もオススメ
      </Text>

      {!items ? (
        <VStack align="stretch" gap={3}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} h="120px" rounded="lg" />
          ))}
        </VStack>
      ) : items.length === 0 ? (
        <Text color="neutral.600">条件に近い案件が見つかりませんでした。</Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {items.map((it) => (
            <Box key={it.id} border="1px solid" borderColor="neutral.200" rounded="lg" p={3} bg="white">
              <HStack gap={2} wrap="wrap" mb={2}>
                {it.industry && <Badge>{it.industry}</Badge>}
                {it.jobType && <Badge variant="subtle">{it.jobType}</Badge>}
                {it.workStyle && <Badge colorScheme="neutral">{it.workStyle}</Badge>}
              </HStack>

              <Link href={`/matters/${it.id}`} style={{ textDecoration: "none" }}>
                <Text fontWeight="semibold" fontSize="lg" _hover={{ textDecoration: "underline" }}>
                  {it.title}
                </Text>
              </Link>

              <HStack gap={4} mt={1} color="neutral.700" fontSize="sm" wrap="wrap">
                {it.area?.state && (
                  <HStack gap={1}><Icon as={MapPin} /> <Text>{it.area.state}</Text></HStack>
                )}
                {it.timeRange && (
                  <HStack gap={1}><Icon as={Clock3} /> <Text>{it.timeRange}</Text></HStack>
                )}
                {(it.unitPrice?.unitMin ?? it.unitPrice?.unitMax) != null && (
                  <HStack gap={1}>
                    <Icon as={JapaneseYen} />
                    <Text>
                      {it.unitPrice?.unitMin ?? "?"}万～{it.unitPrice?.unitMax ?? "?"}万
                    </Text>
                  </HStack>
                )}
              </HStack>

              {it.projectDetail && (
                <Box mt={2} p={2} rounded="md" bg="neutral.25" border="1px solid" borderColor="neutral.100">
                  <Text fontSize="sm" color="neutral.800">{textSnippet(it.projectDetail)}</Text>
                </Box>
              )}

              <HStack mt={3} justify="flex-end">
                <Button as={Link} href={`/matters/${it.id}`} size="sm" variant="outline">
                  詳細を見る
                </Button>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  )
}
