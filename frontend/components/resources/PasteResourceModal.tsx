"use client"

import { useMemo, useState } from "react"
import {
  Modal, ModalHeader, ModalBody, ModalFooter, Textarea, Button, HStack, Text, Input, VStack,
} from "@yamada-ui/react"
import type { ResourceFormValues } from "./ResourceNewModal"

/* ---- 既存テキスト用パーサ ---- */
function parseFromPasted(text: string): Partial<ResourceFormValues> {
  const pick = (label: string) => {
    const re = new RegExp(`${label}[:：]\\s*(.+)`)
    const m = text.match(re)
    return m ? m[1].trim() : ""
  }

  const name = pick("氏名") || pick("お名前") || ""
  const jobType = pick("職種") || ""
  const gender = pick("性別") || ""
  const nearest = pick("最寄り駅") || ""
  const affiliation = pick("所属") || ""
  const startText = pick("開始時期") || pick("開始") || ""
  const language = pick("言語") || pick("言語・FW・ライブラリ") || ""
  const tool = pick("ツール") || pick("ツール・その他") || ""

  // 単価レンジ
  let rateMin: number | undefined, rateMax: number | undefined
  const rate = text.match(/(\d{2,3})\s*(?:-|〜|~|から|～)\s*(\d{2,3})\s*万?/i)
  if (rate) {
    rateMin = Number(rate[1])
    rateMax = Number(rate[2])
  }

  // 年齢
  let age: number | undefined
  const ageM = text.match(/(\d{2})\s*歳/)
  if (ageM) age = Number(ageM[1])

  // 並行（ざっくり抽出）
  const parallelRaw = pick("並行案件") || pick("並行") || pick("並行可否")
  const parallelStr =
    /あり|可/i.test(parallelRaw) ? "あり" :
    /なし|不可/i.test(parallelRaw) ? "なし" : ""

  return {
    name,
    jobType,
    stacks: { language, tool },
    profile: {
      gender,
      nearest,
      affiliation,
      startText,
      rateMinManYen: rateMin,
      rateMaxManYen: rateMax,
      age,
      /** 未取得の場合は undefined ではなく null に寄せる */
      parallel: parallelStr || null,
    },
  }
}

/* ---- Excel/CSV 解析（動的 import） ---- */
async function parseSpreadsheet(file: File): Promise<Partial<ResourceFormValues>> {
  const XLSX = await import("xlsx")
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false }) as any[][]
  if (!rows.length) return {}

  const headers: string[] = (rows[0] || []).map((h: any) => String(h ?? "").trim())
  const row: any[] = rows[1] || []

  const take = (...labels: string[]) => {
    for (const label of labels) {
      const i = headers.findIndex((h) => h === label || h.includes(label))
      if (i >= 0) return String(row[i] ?? "").trim()
    }
    return ""
  }
  const num = (...labels: string[]) => {
    const s = take(...labels)
    const m = String(s).match(/\d+(\.\d+)?/)
    return m ? Number(m[0]) : undefined
  }

  const parallelRaw = take("並行案件", "並行", "並行可否")
  const parallelStr =
    /あり|可/i.test(parallelRaw) ? "あり" :
    /なし|不可/i.test(parallelRaw) ? "なし" : ""

  return {
    name: take("氏名", "お名前", "名前"),
    jobType: take("職種", "ジョブタイプ"),
    stacks: {
      language: take("言語・FW・ライブラリ", "言語"),
      tool: take("ツール・その他", "ツール"),
    },
    profile: {
      affiliation: take("所属"),
      age: num("年齢"),
      gender: take("性別"),
      nearest: take("最寄り駅", "最寄駅"),
      /** 未取得時は null に統一 */
      parallel: parallelStr || null,
      startText: take("開始時期", "開始"),
      rateMinManYen: num("最小単価", "単価min", "最低単価"),
      rateMaxManYen: num("最大単価", "単価max", "最高単価"),
    },
  }
}

/* ---- patch をいい感じにマージ（右側優先） ---- */
function mergePatch(
  a: Partial<ResourceFormValues>,
  b: Partial<ResourceFormValues>,
): Partial<ResourceFormValues> {
  const hasStacks =
    (a.stacks && (a.stacks.language || a.stacks.tool)) ||
    (b.stacks && (b.stacks.language || b.stacks.tool))

  const mergedStacks = hasStacks
    ? {
        language: a.stacks?.language ?? b.stacks?.language ?? "",
        tool: a.stacks?.tool ?? b.stacks?.tool ?? "",
      }
    : undefined

  const mergedProfile = { ...(a.profile ?? {}), ...(b.profile ?? {}) } as any
  // parallel が undefined にならないように（省略時は null）
  if (mergedProfile.parallel === undefined) mergedProfile.parallel = null

  return {
    ...a,
    ...b,
    ...(mergedStacks ? { stacks: mergedStacks } : {}),
    ...(Object.keys(mergedProfile).length ? { profile: mergedProfile } : {}),
    wish: { ...(a.wish ?? {}), ...(b.wish ?? {}) },
  }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  /** ファイルも渡す */
  onLoaded: (patch: Partial<ResourceFormValues>, files: File[]) => void
}

const CAUTION_TEXT =
  "※ コピペまたは Excel/CSV を選択して取り込めます（Excel/CSV はその場で解析してフォームに反映）。\n" +
  "※ 生成された内容をご確認の上、不足情報は確認フォーム上で追記してください。"

export default function PasteResourceModal({ isOpen, onClose, onLoaded }: Props) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [filePatch, setFilePatch] = useState<Partial<ResourceFormValues>>({})

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? [])
    setFiles(fs)
    // Excel/CSV があれば解析（最初の1枚だけ採用）
    const xls = fs.find((f) => /\.(xlsx|xls|csv)$/i.test(f.name))
    if (xls) {
      try {
        const p = await parseSpreadsheet(xls)
        setFilePatch(p)
      } catch (err) {
        console.error("parseSpreadsheet error:", err)
        setFilePatch({})
      }
    } else {
      setFilePatch({})
    }
    e.target.value = ""
  }

  const patchToSend = useMemo(() => {
    const textPatch = text.trim() ? parseFromPasted(text) : {}
    return mergePatch(filePatch, textPatch) // テキストが書いてあればそれを優先上書き
  }, [text, filePatch])

  const handleLoad = () => {
    onLoaded(patchToSend, files) // ★ ファイルも渡す
    setText("")
    setFiles([])
    setFilePatch({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalHeader>人材情報を取り込む（コピペ / Excel/CSV）</ModalHeader>

      <ModalBody>
        <VStack align="stretch" gap={4}>
          <Text color="neutral.600">
            候補者情報をコピペするか、Excel/CSVファイルを選択してください。Excel/CSV は選択直後にブラウザ内で解析され、確認フォームに反映されます。
          </Text>

          {/* コピペ */}
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="氏名：山田 太郎 / 職種：バックエンド など…"
          />

          {/* ファイル選択 */}
          <Input
            type="file"
            onChange={handleFiles}
            multiple
            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg"
          />
        </VStack>
      </ModalBody>

      <ModalFooter>
        <HStack w="full" align="start" justify="space-between" gap={4}>
          <Text flex="1" minW={0} fontSize="xs" color="neutral.600" whiteSpace="pre-line">
            {CAUTION_TEXT}
          </Text>
          <HStack gap={3}>
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              colorScheme="peacock"
              onClick={handleLoad}
              isDisabled={!text.trim() && files.length === 0}
            >
              読み込む
            </Button>
          </HStack>
        </HStack>
      </ModalFooter>
    </Modal>
  )
}
