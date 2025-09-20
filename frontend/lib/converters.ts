// converters.ts
import {
  FirestoreDataConverter,
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore"
import type { MatterDoc, MatterDocWithId } from "@/types/domain"
import type { MatterView } from "@/components/dashboard/MatterRow"

/* =========================
 * helpers
 * =======================*/
const toDate = (v: any): Date | undefined => {
  if (!v) return undefined
  if (typeof v?.toDate === "function") return v.toDate() as Date // Firestore Timestamp
  if (v instanceof Date) return v
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** 例: 2025年09月05日 16時25分 */
const ymdhmJa = (d?: Date) => {
  if (!d) return undefined
  return `${d.getFullYear()}年${pad2(d.getMonth() + 1)}月${pad2(d.getDate())}日 ${pad2(d.getHours())}時${pad2(
    d.getMinutes(),
  )}分`
}

/** 例: 2025/09/05（未使用なら削除可） */
const ymd = (d?: Date) =>
  d ? `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}` : undefined

/* =========================
 * Firestore converters
 * =======================*/
export const matterReadConverter: FirestoreDataConverter<MatterDocWithId> = {
  toFirestore() {
    throw new Error("read専用")
  },
  fromFirestore(snap: QueryDocumentSnapshot, opt: SnapshotOptions): MatterDocWithId {
    const d = snap.data(opt) as any
    return {
      id: snap.id,
      title: d.title,
      publish: d.publish,
      stage: d.stage ?? undefined,
      industry: d.industry ?? undefined,
      role: d.role ?? undefined,
      area: d.area ?? undefined,
      workStyle: d.workStyle ?? undefined,
      startText: d.startText ?? undefined,
      timeRange: d.timeRange ?? undefined,
      priceMin: typeof d.priceMin === "number" ? d.priceMin : undefined,
      priceMax: typeof d.priceMax === "number" ? d.priceMax : undefined,
      rateNote: d.rateNote ?? undefined,
      settlementMin: typeof d.settlementMin === "number" ? d.settlementMin : undefined,
      settlementMax: typeof d.settlementMax === "number" ? d.settlementMax : undefined,
      createdAt: toDate(d.createdAt),
      updatedAt: toDate(d.updatedAt),
    }
  },
}

export const matterWriteConverter: FirestoreDataConverter<MatterDoc> = {
  fromFirestore() {
    throw new Error("write専用")
  },
  toFirestore(m: MatterDoc) {
    return {
      ...m,
      createdAt:
        m.createdAt instanceof Date
          ? Timestamp.fromDate(m.createdAt)
          : (m.createdAt as any) ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  },
}

/* =========================
 * UI 変換（MatterView へ）
 * =======================*/
export const toMatterView = (src: MatterDocWithId): MatterView => {
  const badges = [
    src.publish,
    src.stage,
    src.industry,
    src.role,
    src.area,
    src.workStyle,
    src.startText,
  ].filter((v): v is string => typeof v === "string" && v.length > 0)

  const priceLabel =
    src.priceMin && src.priceMax
      ? `${src.priceMin}万～${src.priceMax}万`
      : src.priceMin
      ? `${src.priceMin}万～`
      : src.priceMax
      ? `～${src.priceMax}万`
      : undefined

  // 作成日と更新日を表示用に整形（更新日が無い場合は作成日で代用）
  const createdAtStr = ymdhmJa(src.createdAt)
  const updatedAtStr = ymdhmJa(src.updatedAt ?? src.createdAt)

  return {
    id: src.id,
    title: src.title,
    badges,
    timeRange: src.timeRange,
    settlementMin: src.settlementMin,
    settlementMax: src.settlementMax,
    rateNote: src.rateNote,
    priceLabel,
    createdAt: createdAtStr, // ← 追加
    updatedAt: updatedAtStr, // ← 既存を強化
    area: src.area,
    workStyle: src.workStyle,
    startText: src.startText,
    }
}
