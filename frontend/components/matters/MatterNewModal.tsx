"use client"

import { useEffect, useMemo } from "react"
import {
  Box,
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Switch,
  Button,
  Divider,
  IconButton,
} from "@yamada-ui/react"
import { Plus, Minus } from "@yamada-ui/lucide"
import { useForm, Controller, useFieldArray, type SubmitHandler } from "react-hook-form"

import { db } from "../../lib/firebase"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import SelectNative from "../SelectNative"

/* ==================== 定数 ==================== */

const JOB_TYPES = [
  "フロントエンドエンジニア","バックエンドエンジニア","サーバーエンジニア","ブロックチェーンエンジニア",
  "インフラエンジニア","データベースエンジニア","クラウドエンジニア","ネットワークエンジニア",
  "セキュリティエンジニア","リードエンジニア","システムエンジニア","社内SE","アプリエンジニア",
  "IOSエンジニア","Androidエンジニア","機械学習エンジニア","AIエンジニア(人口知能)","汎用機エンジニア",
  "マークアップエンジニア","テストエンジニア","テスター・デバッカー・QA","組み込み・制御","データサイエンティスト",
  "PdM","PM/PL","PM","PMO","PMOサポート","VPoE","CRE","SRE","エンジニアリングマネージャー","SAP",
  "プロデューサー","コンサルタント","マーケター","Webディレクター","Webプランナー","Webデザイナー",
  "Webコーダー","UI・UXデザイナー","グラフィックデザイナー","3Dデザイナー","2Dデザイナー",
  "キャラクターデザイナー","イラストレーター","アートディレクター","ゲームプランナー","サポート",
  "キッティング","ヘルプデスク","IT事務","若手枠","未経験可","その他",
]
const WORK_STYLES = ["リモート", "ハイブリッド", "常駐"]
const STATUS_OPTIONS = ["新規","復活","現取引","交替","過去取引","見込み","ヒアリング","提案中","面談設定中","面談中","回答待ち","成約","再提案","保留中","フォロー中"]
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
]
const COMMERCE_OPTIONS = ["プライム","元請けアンダー","受託アンダー","2次請け","SIer案件","その他"]
const INTERVIEW_METHODS = ["オンライン","現地","その他"]

/* ==================== ユーティリティ ==================== */

const toNumOrNull = (v: unknown) => {
  if (v === "" || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// 配列を 5〜10 件に正規化（string[] / {value:string}[] どちらでもOK）
const ensureRows = (arr?: Array<{ value: string }> | string[], min = 5, max = 10) => {
  const src = Array.isArray(arr) ? arr : []
  const normalized = src.map((x: any) =>
    typeof x === "string" ? { value: x } : { value: x?.value ?? "" }
  )
  const clamped = normalized.slice(0, max)
  while (clamped.length < min) clamped.push({ value: "" })
  return clamped
}

/* ==================== 型 ==================== */

export type FormValues = {
  title: string
  jobType: string
  industry?: string
  startText: string
  timeRange: string
  area: { state: string; workFreq?: string }
  workStyle: string
  remoteFlag: boolean
  unitPrice: { unitMin: number | null; unitMax: number | null; rataOption: string }
  salesChannel?: string
  interview: { interviewMethod?: string; interviewCount: number | null }
  payment?: string
  // ← オブジェクト配列にする（useFieldArrayの型要件）
  languages: { value: string }[]
  tools: { value: string }[]
  projectDetail?: string
  techSkills?: string
  requirements: { mustSkills?: string; desiredSkills?: string; workExperience?: string }
  notes?: string
  publish: boolean
  status?: string
  rank: number | null
  pastedText?: string
}

/* ==================== Props ==================== */

type MatterNewModalProps = {
  isOpen: boolean
  onClose: () => void
  initialPatch?: Partial<FormValues>
}

/* ==================== 画面 ==================== */

export default function MatterNewModal({
  isOpen,
  onClose,
  initialPatch,
}: MatterNewModalProps) {
  const defaultValues = useMemo<FormValues>(
    () => ({
      title: "",
      jobType: "",
      industry: "",
      startText: "",
      timeRange: "",
      area: { state: "", workFreq: "" },
      workStyle: "",
      remoteFlag: false,
      unitPrice: { unitMin: null, unitMax: null, rataOption: "" },
      salesChannel: "",
      interview: { interviewMethod: "", interviewCount: null },
      payment: "",
      // 初期5枠
      languages: Array.from({ length: 5 }, () => ({ value: "" })),
      tools: Array.from({ length: 5 }, () => ({ value: "" })),
      projectDetail: "",
      techSkills: "",
      requirements: { mustSkills: "", desiredSkills: "", workExperience: "" },
      notes: "",
      publish: true,
      status: "",
      rank: null,
      pastedText: "",
    }),
    [],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ defaultValues, mode: "onSubmit" })

  // 動的配列（+ / −）
  const langFA = useFieldArray<FormValues, "languages">({ control, name: "languages" })
  const toolFA = useFieldArray<FormValues, "tools">({ control, name: "tools" })

  // パッチ適用
  useEffect(() => {
    if (!initialPatch) return
    const merged: FormValues = {
      ...defaultValues,
      ...initialPatch,
      area: { ...defaultValues.area, ...(initialPatch.area ?? {}) },
      unitPrice: { ...defaultValues.unitPrice, ...(initialPatch.unitPrice ?? {}) },
      interview: { ...defaultValues.interview, ...(initialPatch.interview ?? {}) },
      requirements: { ...defaultValues.requirements, ...(initialPatch.requirements ?? {}) },
      languages: ensureRows(initialPatch.languages ?? defaultValues.languages),
      tools: ensureRows(initialPatch.tools ?? defaultValues.tools),
    }
    reset(merged, { keepDirty: true })
  }, [initialPatch, reset, defaultValues])

  // 追加・削除（最大10、最小1）
  const addLang = () => langFA.fields.length < 10 && langFA.append({ value: "" })
  const subLang = () => langFA.fields.length > 1 && langFA.remove(langFA.fields.length - 1)
  const addTool = () => toolFA.fields.length < 10 && toolFA.append({ value: "" })
  const subTool = () => toolFA.fields.length > 1 && toolFA.remove(toolFA.fields.length - 1)

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload = {
      title: values.title,
      jobType: values.jobType,
      industry: values.industry ?? "",
      startText: values.startText,
      timeRange: values.timeRange,
      area: { state: values.area.state, workFreq: values.area.workFreq ?? "" },
      workStyle: values.workStyle,
      remoteFlag: values.remoteFlag,
      unitPrice: {
        unitMin: toNumOrNull(values.unitPrice.unitMin),
        unitMax: toNumOrNull(values.unitPrice.unitMax),
        rataOption: values.unitPrice.rataOption ?? "",
      },
      salesChannel: values.salesChannel ?? "",
      interview: {
        interviewMethod: values.interview.interviewMethod ?? "",
        interviewCount: toNumOrNull(values.interview.interviewCount),
      },
      payment: values.payment ?? "",
      technologyStack: {
        languages: values.languages.map(x => (x?.value ?? "").trim()).filter(Boolean),
        tools: values.tools.map(x => (x?.value ?? "").trim()).filter(Boolean),
      },
      projectDetail: values.projectDetail ?? "",
      techSkills: values.techSkills ?? "",
      requirements: {
        mustSkills: values.requirements.mustSkills ?? "",
        desiredSkills: values.requirements.desiredSkills ?? "",
        workExperience: values.requirements.workExperience ?? "",
      },
      notes: values.notes ?? "",
      publish: values.publish,
      status: values.status ?? "",
      rank: toNumOrNull(values.rank),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = doc(collection(db, "matters"))
    await setDoc(ref, payload)
    onClose()
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <Text mt={1} fontSize="sm" color="red.500">{msg}</Text> : null

  // グループ必須（全部空なら NG）：先頭だけ表示
  const validateGroupRequired = (name: "languages" | "tools") => () => {
    const arr = (getValues(name) ?? []) as { value?: string }[]
    const hasAny = arr.some(x => (x?.value ?? "").trim() !== "")
    return hasAny || "項目を入力してください"
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalHeader>案件の新規登録</ModalHeader>
      <ModalCloseButton />

      <ModalBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <VStack align="stretch" gap={6}>
            {/* ===== 基本情報 ===== */}
            <Box>
              <Text fontWeight="semibold" mb={3}>基本情報</Text>
              <VStack align="stretch" gap={3}>
                <Box>
                  <Input
                    placeholder="案件名（48文字以内）"
                    isInvalid={!!errors.title}
                    {...register("title", {
                      required: "案件名を入力してください",
                      maxLength: { value: 48, message: "48文字以内で入力してください" },
                    })}
                  />
                  <FieldError msg={errors.title?.message} />
                </Box>

                <HStack gap={3} wrap="wrap">
                  {/* 職種 */}
                  <Box minW="xs" flex="1">
                    <Controller
                      name="jobType"
                      control={control}
                      rules={{ required: "職種を選択してください" }}
                      render={({ field }) => (
                        <>
                          <SelectNative
                            id="jobType"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="職種"
                            isInvalid={!!errors.jobType}
                          >
                            <option value="">-</option>
                            {JOB_TYPES.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </SelectNative>
                          <FieldError msg={errors.jobType?.message} />
                        </>
                      )}
                    />
                  </Box>

                  <Box flex="1" minW="xs">
                    <Input placeholder="業界" {...register("industry")} />
                  </Box>
                </HStack>

                <HStack gap={3} wrap="wrap">
                  <Box flex="1" minW="xs">
                    <Input
                      placeholder="開始（例：即日 / 9月〜）"
                      isInvalid={!!errors.startText}
                      {...register("startText", { required: "開始時期を入力してください" })}
                    />
                    <FieldError msg={errors.startText?.message} />
                  </Box>
                  <Box flex="1" minW="xs">
                    <Input
                      placeholder="時間（例：140h〜180h）"
                      isInvalid={!!errors.timeRange}
                      {...register("timeRange", { required: "時間を入力してください" })}
                    />
                    <FieldError msg={errors.timeRange?.message} />
                  </Box>
                </HStack>

                <HStack gap={3} wrap="wrap">
                  {/* 都道府県 */}
                  <Box minW="xs" flex="1">
                    <Controller
                      name="area.state"
                      control={control}
                      rules={{ required: "場所（都道府県）を選択してください" }}
                      render={({ field }) => (
                        <>
                          <SelectNative
                            id="state"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="場所（都道府県）"
                            isInvalid={!!errors.area?.state}
                          >
                            <option value="">-</option>
                            {PREFECTURES.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </SelectNative>
                          <FieldError msg={errors.area?.state?.message} />
                        </>
                      )}
                    />
                  </Box>

                  <Box flex="1" minW="xs">
                    <Input placeholder="出社頻度（例：週一出社）" {...register("area.workFreq")} />
                  </Box>
                </HStack>

                <HStack gap={3} wrap="wrap" align="center">
                  {/* 稼働形態 */}
                  <Box minW="xs" flex="1">
                    <Controller
                      name="workStyle"
                      control={control}
                      rules={{ required: "稼働形態を選択してください" }}
                      render={({ field }) => (
                        <>
                          <SelectNative
                            id="workStyle"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="稼働形態"
                            isInvalid={!!errors.workStyle}
                          >
                            <option value="">-</option>
                            {WORK_STYLES.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </SelectNative>
                          <FieldError msg={errors.workStyle?.message} />
                        </>
                      )}
                    />
                  </Box>

                  <HStack gap={2} align="center">
                    <Text>リモート可</Text>
                    <Switch {...register("remoteFlag")} />
                  </HStack>
                </HStack>
              </VStack>
            </Box>

            {/* ===== 単価・面談・支払 ===== */}
            <Box>
              <Text fontWeight="semibold" mb={3}>単価 / 面談 / 支払</Text>

              <HStack gap={3} wrap="wrap">
                <Box minW="xs" flex="1">
                  <Input
                    type="number"
                    placeholder="最小単価（万円）"
                    isInvalid={!!errors.unitPrice?.unitMin}
                    {...register("unitPrice.unitMin", {
                      valueAsNumber: true,
                      validate: (v) =>
                        v !== null && !Number.isNaN(v) && v >= 0 || "最小単価を正しく入力してください",
                    })}
                  />
                  <FieldError msg={errors.unitPrice?.unitMin?.message} />
                </Box>

                <Box minW="xs" flex="1">
                  <Input
                    type="number"
                    placeholder="最大単価（万円）"
                    isInvalid={!!errors.unitPrice?.unitMax}
                    {...register("unitPrice.unitMax", {
                      valueAsNumber: true,
                      validate: (v) => {
                        if (v === null || Number.isNaN(v) || v < 0) return "最大単価を正しく入力してください"
                        const min = getValues("unitPrice.unitMin")
                        if (min != null && !Number.isNaN(min) && v < (min as number)) {
                          return "最大単価は最小単価以上にしてください"
                        }
                        return true
                      },
                    })}
                  />
                  <FieldError msg={errors.unitPrice?.unitMax?.message} />
                </Box>

                <Box minW="xs" flex="1">
                  <Input
                    placeholder="精算（例：140h〜180h）"
                    isInvalid={!!errors.unitPrice?.rataOption}
                    {...register("unitPrice.rataOption", { required: "精算を入力してください" })}
                  />
                  <FieldError msg={errors.unitPrice?.rataOption?.message} />
                </Box>
              </HStack>

              <HStack gap={3} mt={3} wrap="wrap">
                {/* 面談方法（任意） */}
                <Box minW="xs" flex="1">
                  <Controller
                    name="interview.interviewMethod"
                    control={control}
                    render={({ field }) => (
                      <SelectNative
                        id="interviewMethod"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="面談（オンライン/現地/その他）"
                      >
                        <option value="">-</option>
                        {INTERVIEW_METHODS.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </SelectNative>
                    )}
                  />
                </Box>

                <Box minW="xs" flex="1">
                  <Input
                    type="number"
                    placeholder="面談回数"
                    {...register("interview.interviewCount", { valueAsNumber: true })}
                  />
                </Box>

                <Box minW="xs" flex="1">
                  <Input placeholder="支払（例：月末締め）" {...register("payment")} />
                </Box>
              </HStack>

              {/* 商流（任意） */}
              <Box mt={3} minW="xs" maxW="sm">
                <Controller
                  name="salesChannel"
                  control={control}
                  render={({ field }) => (
                    <SelectNative
                      id="salesChannel"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="商流"
                    >
                      <option value="">-</option>
                      {COMMERCE_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </SelectNative>
                  )}
                />
              </Box>
            </Box>

            {/* ===== 開発環境（+ / −） ===== */}
            <Box>
              <Text fontWeight="semibold" mb={3}>開発環境</Text>

              {/* 言語・フレームワーク */}
              <HStack gap={3} wrap="wrap" align="center">
                {langFA.fields.map((f, idx) => (
                  <Box key={f.id} minW="xs" flex="1">
                    <Controller
                      name={`languages.${idx}.value` as const}
                      control={control}
                      rules={idx === 0 ? { validate: validateGroupRequired("languages") } : undefined}
                      render={({ field }) => (
                        <Input
                          placeholder="言語・フレームワーク"
                          isInvalid={!!(idx === 0 && (errors as any)?.languages?.[0]?.value)}
                          {...field}
                        />
                      )}
                    />
                    {idx === 0 && (
                      <FieldError msg={(errors as any)?.languages?.[0]?.value?.message as string | undefined} />
                    )}
                  </Box>
                ))}

                <HStack>
                  <IconButton
                    aria-label="remove language input"
                    variant="solid"
                    rounded="full"
                    size="sm"
                    onClick={subLang}
                    isDisabled={langFA.fields.length <= 1}
                  >
                    <Minus size={16} />
                  </IconButton>
                  <IconButton
                    aria-label="add language input"
                    variant="solid"
                    colorScheme="primary"
                    rounded="full"
                    size="sm"
                    onClick={addLang}
                    isDisabled={langFA.fields.length >= 10}
                  >
                    <Plus size={16} />
                  </IconButton>
                </HStack>
              </HStack>

              {/* ツール */}
              <HStack gap={3} mt={3} wrap="wrap" align="center">
                {toolFA.fields.map((f, idx) => (
                  <Box key={f.id} minW="xs" flex="1">
                    <Controller
                      name={`tools.${idx}.value` as const}
                      control={control}
                      rules={idx === 0 ? { validate: validateGroupRequired("tools") } : undefined}
                      render={({ field }) => (
                        <Input
                          placeholder="ツール"
                          isInvalid={!!(idx === 0 && (errors as any)?.tools?.[0]?.value)}
                          {...field}
                        />
                      )}
                    />
                    {idx === 0 && (
                      <FieldError msg={(errors as any)?.tools?.[0]?.value?.message as string | undefined} />
                    )}
                  </Box>
                ))}

                <HStack>
                  <IconButton
                    aria-label="remove tool input"
                    variant="solid"
                    rounded="full"
                    size="sm"
                    onClick={subTool}
                    isDisabled={toolFA.fields.length <= 1}
                  >
                    <Minus size={16} />
                  </IconButton>
                  <IconButton
                    aria-label="add tool input"
                    variant="solid"
                    colorScheme="primary"
                    rounded="full"
                    size="sm"
                    onClick={addTool}
                    isDisabled={toolFA.fields.length >= 10}
                  >
                    <Plus size={16} />
                  </IconButton>
                </HStack>
              </HStack>

              <Text mt={2} color="gray.500" fontSize="sm">
                ※ 言語・フレームワーク・ツールが該当しない場合は、下記「備考」欄にご記載ください
              </Text>
            </Box>

            {/* ===== 詳細・要件 ===== */}
            <Box>
              <Text fontWeight="semibold" mb={3}>詳細・要件</Text>
              <Textarea rows={4} placeholder="案件詳細" {...register("projectDetail")} />
              <Textarea rows={3} placeholder="技術要件" mt={3} {...register("techSkills")} />
              <Divider my={4} />
              <Textarea rows={3} placeholder="必須スキル" {...register("requirements.mustSkills")} />
              <Textarea rows={3} placeholder="歓迎スキル" mt={3} {...register("requirements.desiredSkills")} />
              <Textarea rows={3} placeholder="業務経験" mt={3} {...register("requirements.workExperience")} />
            </Box>

            {/* ===== その他 ===== */}
            <Box>
              <Text fontWeight="semibold" mb={3}>その他</Text>
              <Textarea rows={3} placeholder="備考" {...register("notes")} />
              <HStack gap={3} mt={3} wrap="wrap" align="center">
                <HStack gap={2} align="center">
                  <Text>公開</Text>
                  <Switch {...register("publish")} />
                </HStack>
                <Box minW="xs">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <SelectNative id="status" value={field.value ?? ""} onChange={field.onChange} placeholder="ステータス">
                        <option value="">-</option>
                        {STATUS_OPTIONS.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </SelectNative>
                    )}
                  />
                </Box>
                <Box minW="xs">
                  <Input type="number" placeholder="優先度" {...register("rank", { valueAsNumber: true })} />
                </Box>
              </HStack>
            </Box>

            {/* ===== 送信ボタン（フォーム内） ===== */}
            <HStack justify="flex-end" gap={3} pt={2}>
              <Button variant="ghost" type="button" onClick={onClose}>キャンセル</Button>
              <Button colorScheme="primary" type="submit" isLoading={isSubmitting}>登録する</Button>
            </HStack>
          </VStack>
        </form>
      </ModalBody>
    </Modal>
  )
}
