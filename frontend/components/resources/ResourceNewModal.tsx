"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Modal, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Box, VStack, HStack, Text, Input, Textarea, Button, Divider,
  Switch, IconButton,
} from "@yamada-ui/react"
import { Plus, Trash2 } from "@yamada-ui/lucide"

import {
  useForm, useFieldArray, Controller,
  type DefaultValues, type SubmitHandler, type Resolver,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { db, storage } from "../../lib/firebase"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import SelectNative from "../SelectNative"

/* ====== スキーマ ====== */
const skillSchema = z.object({
  label: z.string().min(1, "スキル名を入力"),
  term: z.string().default(""),
})
const bizSchema = z.object({
  title: z.string().min(1, "業務名を入力"),
  term: z.string().default(""),
  desc: z.string().default(""),
  rating: z.coerce.number().min(0).max(5).default(0),
})
const wishSchema = z.object({
  enviroment: z.string().optional(),
  career: z.string().optional(),
  workStyle: z.string().optional(),
  others: z.string().optional(),
})
const fileMetaSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number(),
  uploadedAt: z.any().optional(),
})
const formSchema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  jobType: z.string().min(1, "職種は必須です"),
  stacks: z
    .object({ language: z.string().default(""), tool: z.string().default("") })
    .default({ language: "", tool: "" }),
  profile: z.object({
    affiliation: z.string().optional(),
    age: z.coerce.number().int().nonnegative().optional(),
    gender: z.string().optional(),
    nearest: z.string().optional(),
    /** 未選択は undefined ではなく null で保存する */
    parallel: z.string().nullable().default(null),
    startText: z.string().optional(),
    rateMinManYen: z.coerce.number().optional(),
    rateMaxManYen: z.coerce.number().optional(),
  }),
  skillsExperience: z.array(skillSchema).default([]),
  businessSkills: z.array(bizSchema).default([]),
  expertise: z.string().optional(),
  position: z.string().optional(),
  wish: wishSchema,
  publish: z.boolean().default(true),
  files: z.array(fileMetaSchema).default([]),
  pastedText: z.string().default(""),
})
export type ResourceFormValues = z.infer<typeof formSchema>

/* ===== ラベル / ヘルパー ===== */
const Label = ({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
}) => (
  <Text as="label" htmlFor={htmlFor} fontWeight="medium" display="block" mb={1}>
    {children}
    {required && <Text as="span" color="red.500"> *</Text>}
  </Text>
)
const Helper = ({ children }: { children: ReactNode }) => (
  <Text fontSize="sm" color="gray.500" mt={1}>
    {children}
  </Text>
)

/* ===== defaults と patch の安全マージ ===== */
function mergeWithDefaults(
  defaults: ResourceFormValues,
  patch?: Partial<ResourceFormValues>,
): ResourceFormValues {
  const stacks = {
    language: patch?.stacks?.language ?? defaults.stacks.language,
    tool: patch?.stacks?.tool ?? defaults.stacks.tool,
  }

  const skillsExperience =
    patch?.skillsExperience && patch.skillsExperience.length > 0
      ? patch.skillsExperience.map((s) => ({
          label: s?.label ?? "",
          term: s?.term ?? "",
        }))
      : defaults.skillsExperience

  const businessSkills =
    patch?.businessSkills && patch.businessSkills.length > 0
      ? patch.businessSkills.map((b) => ({
          title: b?.title ?? "",
          term: b?.term ?? "",
          desc: b?.desc ?? "",
          rating: b?.rating ?? 0,
        }))
      : defaults.businessSkills

  const files =
    patch?.files && patch.files.length > 0
      ? patch.files.map((f) => ({
          name: f?.name ?? "",
          url: f?.url ?? "",
          type: f?.type ?? "application/octet-stream",
          size: f?.size ?? 0,
          uploadedAt: (f as any)?.uploadedAt,
        }))
      : defaults.files

  return {
    ...defaults,
    ...patch,
    stacks,
    profile: { ...defaults.profile, ...(patch?.profile ?? {}) },
    wish: { ...defaults.wish, ...(patch?.wish ?? {}) },
    skillsExperience,
    businessSkills,
    files,
  }
}

/* ===== Firestore 書き込み前に undefined を除去（配列内も） ===== */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((v) => v !== undefined) as T
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T
  }
  return value
}

type Props = {
  isOpen: boolean
  onClose: () => void
  initialPatch?: Partial<ResourceFormValues>
  /** Paste で選んだファイルを受け取る */
  initialFiles?: File[]
}

export default function ResourceNewModal({
  isOpen,
  onClose,
  initialPatch,
  initialFiles = [],
}: Props) {
  const defaultValues: DefaultValues<ResourceFormValues> = useMemo(
    () => ({
      name: "",
      jobType: "",
      stacks: { language: "", tool: "" },
      profile: { parallel: null }, // ← 初期も null
      skillsExperience: [{ label: "", term: "" }],
      businessSkills: [{ title: "", term: "", desc: "", rating: 0 }],
      expertise: "",
      position: "",
      wish: {},
      publish: true,
      files: [],
      pastedText: "",
    }),
    [],
  )

  const resolver: Resolver<ResourceFormValues> =
    zodResolver(formSchema) as unknown as Resolver<ResourceFormValues>

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ResourceFormValues>({ resolver, defaultValues })

  const skillsFA = useFieldArray({ control, name: "skillsExperience" })
  const bizFA = useFieldArray({ control, name: "businessSkills" })

  // initialPatch を安全にマージ
  useEffect(() => {
    if (!initialPatch) {
      reset(defaultValues)
      return
    }
    const merged = mergeWithDefaults(
      defaultValues as ResourceFormValues,
      initialPatch,
    )
    reset(merged, { keepDirty: true })
  }, [initialPatch, reset, defaultValues])

  /* ---------- ファイル（Paste引き継ぎ） ---------- */
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  useEffect(() => {
    setPendingFiles(initialFiles ?? [])
  }, [initialFiles])

  /* ---------- 送信：Storage → Firestore ---------- */
  const onSubmit: SubmitHandler<ResourceFormValues> = async (values) => {
    const docRef = doc(collection(db, "resources"))
    const uploaded: z.infer<typeof fileMetaSchema>[] = []

    for (const f of pendingFiles) {
      const path = `resources/${docRef.id}/${Date.now()}_${f.name}`
      const sref = ref(storage, path)
      await uploadBytes(sref, f, { contentType: f.type || undefined })
      const url = await getDownloadURL(sref)
      uploaded.push({
        name: f.name,
        url,
        type: f.type || "application/octet-stream",
        size: f.size,
        uploadedAt: serverTimestamp(),
      })
    }

    const payload = {
      ...values,
      files: uploaded,
      skillsExperience: values.skillsExperience.filter((v) => v.label?.trim()),
      businessSkills: values.businessSkills.filter((v) => v.title?.trim()),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // ★ undefined を完全に除去してから保存
    await setDoc(docRef, stripUndefined(payload))

    setPendingFiles([])
    reset(defaultValues)
    onClose()
    alert("人材情報を登録しました")
  }

  const jobTypeOptions = ["バックエンド", "フロントエンド", "フルスタック", "インフラ", "データ"]
  const genderOptions = ["男性", "女性", "その他"]
  const parallelOptions = ["あり", "なし"]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalHeader>人材情報の新規登録</ModalHeader>
      <ModalCloseButton />

      <ModalBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <VStack align="stretch" gap={8}>
            {/* 基本情報 */}
            <Box border="1px" borderColor="gray.200" rounded="2xl" p={4}>
              <Text fontWeight="semibold" mb={2}>
                基本情報
              </Text>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Label htmlFor="name" required>
                    氏名
                  </Label>
                  <Input id="name" placeholder="山田 太郎" {...register("name")} />
                </Box>

                <HStack align="start" gap={4} flexWrap="wrap">
                  <Box minW="sm">
                    <Label htmlFor="jobType" required>
                      職種
                    </Label>
                    <Controller
                      name="jobType"
                      control={control}
                      render={({ field }) => (
                        <SelectNative
                          id="jobType"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        >
                          <option value="">選択してください</option>
                          {jobTypeOptions.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </SelectNative>
                      )}
                    />
                  </Box>

                  <Box minW="sm">
                    <Label htmlFor="publish">公開/非公開</Label>
                    <HStack>
                      <Controller
                        name="publish"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="publish"
                            isChecked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                      <Text>公開</Text>
                    </HStack>
                  </Box>
                </HStack>
              </VStack>
            </Box>

            {/* スタック */}
            <Box border="1px" borderColor="gray.200" rounded="2xl" p={4}>
              <Text fontWeight="semibold" mb={2}>
                スタック
              </Text>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Label htmlFor="stacks-language">言語・FW・ライブラリ</Label>
                  <Input
                    id="stacks-language"
                    placeholder="Java / Spring / React ..."
                    {...register("stacks.language")}
                  />
                  <Helper>複数ある場合は「 / 」や「,」区切りでOK</Helper>
                </Box>
                <Box>
                  <Label htmlFor="stacks-tool">ツール・その他</Label>
                  <Input
                    id="stacks-tool"
                    placeholder="Docker / AWS / GitHub ..."
                    {...register("stacks.tool")}
                  />
                </Box>
              </VStack>
            </Box>

            {/* プロフィール */}
            <Box border="1px" borderColor="gray.200" rounded="2xl" p={4}>
              <Text fontWeight="semibold" mb={2}>
                プロフィール
              </Text>
              <VStack align="stretch" gap={4}>
                <HStack gap={4} flexWrap="wrap">
                  <Box minW="xs">
                    <Label htmlFor="affiliation">所属</Label>
                    <Input id="affiliation" {...register("profile.affiliation")} />
                  </Box>
                  <Box minW="xs">
                    <Label htmlFor="age">年齢</Label>
                    <Input
                      id="age"
                      type="number"
                      {...register("profile.age", { valueAsNumber: true })}
                    />
                  </Box>

                  <Box minW="xs">
                    <Label htmlFor="gender">性別</Label>
                    <Controller
                      name="profile.gender"
                      control={control}
                      render={({ field }) => (
                        <SelectNative
                          id="gender"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        >
                          <option value=""></option>
                          {genderOptions.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </SelectNative>
                      )}
                    />
                  </Box>

                  <Box minW="xs">
                    <Label htmlFor="nearest">最寄り駅</Label>
                    <Input id="nearest" {...register("profile.nearest")} />
                  </Box>

                  <Box minW="xs">
                    <Label htmlFor="parallel">並行案件</Label>
                    <Controller
                      name="profile.parallel"
                      control={control}
                      render={({ field }) => (
                        <SelectNative
                          id="parallel"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        >
                          <option value=""></option>
                          {["あり", "なし"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </SelectNative>
                      )}
                    />
                  </Box>

                  <Box minW="xs">
                    <Label htmlFor="startText">開始時期</Label>
                    <Input
                      id="startText"
                      placeholder="即日 / 9月〜 など"
                      {...register("profile.startText")}
                    />
                  </Box>
                </HStack>

                <HStack gap={4} flexWrap="wrap">
                  <Box minW="xs">
                    <Label htmlFor="rateMin">最小単価（万円）</Label>
                    <Input
                      id="rateMin"
                      type="number"
                      step="1"
                      {...register("profile.rateMinManYen", { valueAsNumber: true })}
                    />
                  </Box>
                  <Box minW="xs">
                    <Label htmlFor="rateMax">最大単価（万円）</Label>
                    <Input
                      id="rateMax"
                      type="number"
                      step="1"
                      {...register("profile.rateMaxManYen", { valueAsNumber: true })}
                    />
                  </Box>
                </HStack>
              </VStack>
            </Box>

            {/* 技術スキル */}
            <Box border="1px" borderColor="gray.200" rounded="2xl" p={4}>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">技術スキル（年数）</Text>
                <Button
                  type="button"
                  leftIcon={<Plus />}
                  onClick={() => skillsFA.append({ label: "", term: "" })}
                >
                  行を追加
                </Button>
              </HStack>
              <VStack align="stretch" gap={3}>
                {skillsFA.fields.map((f, i) => (
                  <HStack key={f.id} gap={3}>
                    <Box flex="1">
                      <Label htmlFor={`skill-${i}-label`}>スキル</Label>
                      <Input
                        id={`skill-${i}-label`}
                        placeholder="Java"
                        {...register(`skillsExperience.${i}.label` as const)}
                      />
                    </Box>
                    <Box flex="1">
                      <Label htmlFor={`skill-${i}-term`}>年数</Label>
                      <Input
                        id={`skill-${i}-term`}
                        placeholder="3年6か月"
                        {...register(`skillsExperience.${i}.term` as const)}
                      />
                    </Box>
                    <IconButton
                      aria-label="remove"
                      variant="ghost"
                      onClick={() => skillsFA.remove(i)}
                    >
                      <Trash2 />
                    </IconButton>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* 業務スキル */}
            <Box border="1px" borderColor="gray.200" rounded="2xl" p={4}>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">業務スキル</Text>
                <Button
                  type="button"
                  leftIcon={<Plus />}
                  onClick={() =>
                    bizFA.append({ title: "", term: "", desc: "", rating: 0 })
                  }
                >
                  行を追加
                </Button>
              </HStack>
              <VStack align="stretch" gap={3}>
                {bizFA.fields.map((f, i) => (
                  <VStack key={f.id} gap={2} align="stretch">
                    <HStack gap={3}>
                      <Box flex="1">
                        <Label htmlFor={`biz-${i}-title`}>業務</Label>
                        <Input
                          id={`biz-${i}-title`}
                          placeholder="製造"
                          {...register(`businessSkills.${i}.title` as const)}
                        />
                      </Box>
                      <Box flex="1">
                        <Label htmlFor={`biz-${i}-term`}>年数</Label>
                        <Input
                          id={`biz-${i}-term`}
                          placeholder="3年6か月"
                          {...register(`businessSkills.${i}.term` as const)}
                        />
                      </Box>
                      <Box w="160px">
                        <Label htmlFor={`biz-${i}-rating`}>★数(0-5)</Label>
                        <Input
                          id={`biz-${i}-rating`}
                          type="number"
                          min={0}
                          max={5}
                          step={1}
                          {...register(`businessSkills.${i}.rating` as const, {
                            valueAsNumber: true,
                          })}
                        />
                      </Box>
                      <IconButton
                        aria-label="remove"
                        variant="ghost"
                        onClick={() => bizFA.remove(i)}
                      >
                        <Trash2 />
                      </IconButton>
                    </HStack>
                    <Box>
                      <Label htmlFor={`biz-${i}-desc`}>説明文</Label>
                      <Textarea
                        id={`biz-${i}-desc`}
                        rows={2}
                        placeholder="説明文"
                        {...register(`businessSkills.${i}.desc` as const)}
                      />
                    </Box>
                    <Divider />
                  </VStack>
                ))}
              </VStack>
            </Box>

            {/* 自己PR・希望 */}
            <Box border="1px" borderColor="gray.200" rounded="2xl" p={4}>
              <Text fontWeight="semibold" mb={2}>
                自己PR・希望
              </Text>
              <VStack align="stretch" gap={3}>
                <Box>
                  <Label htmlFor="expertise">得意領域・強み（自由記載）</Label>
                  <Textarea id="expertise" rows={3} {...register("expertise")} />
                </Box>
                <Box>
                  <Label htmlFor="position">適正な業務・ポジション（自由記載）</Label>
                  <Textarea id="position" rows={3} {...register("position")} />
                </Box>
                <HStack gap={4} flexWrap="wrap">
                  <Box minW="xs">
                    <Label htmlFor="wish-env">希望：技術環境</Label>
                    <Input id="wish-env" {...register("wish.enviroment")} />
                  </Box>
                  <Box minW="xs">
                    <Label htmlFor="wish-career">希望：キャリア</Label>
                    <Input id="wish-career" {...register("wish.career")} />
                  </Box>
                  <Box minW="xs">
                    <Label htmlFor="wish-work">希望：働きかた</Label>
                    <Input id="wish-work" {...register("wish.workStyle")} />
                  </Box>
                  <Box minW="xs">
                    <Label htmlFor="wish-others">希望：その他</Label>
                    <Input id="wish-others" {...register("wish.others")} />
                  </Box>
                </HStack>
              </VStack>
            </Box>

            {/* 送信 */}
            <HStack justify="flex-end">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button size="lg" type="submit" isLoading={isSubmitting}>
                登録する
              </Button>
            </HStack>
          </VStack>
        </form>
      </ModalBody>

      <ModalFooter />
    </Modal>
  )
}
