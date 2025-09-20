"use client";

import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Button,
  HStack,
  Text,
} from "@yamada-ui/react";
import type { FormValues } from "./MatterNewModal";

/* ---------- 数値パース ---------- */
const toNumOrNull = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ---------- ヘルパー ---------- */
const splitTags = (text?: string) =>
  (text ?? "")
    .split(/[\/,、\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

/** { value }[] に変換し、5〜10件に揃える */
const toRows = (items: string[], min = 5, max = 10) => {
  const clamped = items.slice(0, max).map((v) => ({ value: v }));
  while (clamped.length < min) clamped.push({ value: "" });
  return clamped;
};

/* ---------- パース（ラベルから抽出） ---------- */
function parseFromPasted(text: string): Partial<FormValues> {
  const t = text.replace(/\r\n?/g, "\n");
  const pick = (re: RegExp) => (t.match(re)?.[1] ?? "").trim();

  const title = pick(/^案件名[:：]\s*(.+)$/m);
  const jobType = pick(/^職種[:：]\s*(.+)$/m);
  const industry = pick(/^業界[:：]\s*(.+)$/m);
  const startText = pick(/^開始[:：]\s*(.+)$/m);
  const timeRange = pick(/^時間[:：]\s*(.+)$/m);
  const state = pick(/^場所[:：]\s*(.+)$/m);
  const workFreq = pick(/^出社頻度[:：]\s*(.+)$/m);
  const workStyle = pick(/^稼働形態[:：]\s*(.+)$/m);

  const unitMin = toNumOrNull(pick(/^最小単価[:：]\s*([0-9]+)$/m));
  const unitMax = toNumOrNull(pick(/^最大単価[:：]\s*([0-9]+)$/m));
  const rataOption = pick(/^精算[:：]\s*(.+)$/m);

  const interviewMethod = pick(/^面談[:：]\s*(.+)$/m);
  const interviewCount = toNumOrNull(pick(/^面談回数[:：]\s*([0-9]+)$/m) || "");
  const payment = pick(/^支払[:：]\s*(.+)$/m);

  // 言語/ツール（複数表記に多少強め）
  const languagesLine =
    pick(/^(?:言語|開発言語|言語・フレームワーク|技術スタック)[:：]\s*([\s\S]+?)(?:\n\n|$)/m);
  const toolsLine =
    pick(/^(?:ツール|DB\/クラウド\/インフラ\/ツール|インフラ|ミドル|環境)[:：]\s*([\s\S]+?)(?:\n\n|$)/m);

  const projectDetail = pick(/^案件詳細[:：]\s*([\s\S]+?)$/m);
  const techSkills = pick(/^技術要件[:：]\s*([\s\S]+?)$/m);
  const mustSkills = pick(/^必須スキル[:：]\s*([\s\S]+?)$/m);
  const desiredSkills = pick(/^歓迎スキル[:：]\s*([\s\S]+?)$/m);
  const workExperience = pick(/^業務経験[:：]\s*([\s\S]+?)$/m);
  const notes = pick(/^備考[:：]\s*([\s\S]+?)$/m);

  return {
    title,
    jobType,
    industry,
    startText,
    timeRange,
    area: { state, workFreq },
    workStyle,
    unitPrice: { unitMin, unitMax, rataOption },
    interview: { interviewMethod, interviewCount },
    payment,
    // ★ MatterNewModal 側の型（{ value: string }[]）に合わせる
    languages: toRows(splitTags(languagesLine)),
    tools: toRows(splitTags(toolsLine)),
    projectDetail,
    techSkills,
    requirements: { mustSkills, desiredSkills, workExperience },
    notes,
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** 解析結果を親へ返す（ここから確認用モーダルに進む） */
  onLoaded: (patch: Partial<FormValues>, raw: string) => void;
};

/** 注意書き（フッター左側に表示・元の位置） */
const CAUTION_TEXT =
  "※ 区切り線は、5文字以上の同一文字で入力してください。区切り線が正しくない場合、情報が正しく読み込まれない可能性があります。\n" +
  "※ AI可視化、辞書未整備の技術です。情報によっては、正しく文章の認識・生成が出来ない場合があります。\n" +
  "※ 生成された内容をご確認の上、不足情報は備考などに記載を行いご登録ください。";

/** プレースホルダー用の例文（表示はテキストエリア内のみ） */
const SAMPLE_TEXT =
  `案件名：モバイル注文プラットフォーム追加開発（フロントエンド）
職種：フロントエンド
業界：飲食・小売
開始：2025年10月〜（即日調整可）
時間：140h〜180h
場所：東京都 渋谷区
出社頻度：週1出社
稼働形態：ハイブリッド
最小単価：100
最大単価：120
精算：140h〜180h
面談：オンライン
面談回数：2
支払：月末締め

言語：TypeScript / React / Next.js / Tailwind CSS / Node.js
ツール：Firebase / Firestore / Cloud Functions / Cloud Storage / Docker / GitHub / Slack / Figma

案件詳細：
……`;

export default function PasteMatterModal({ isOpen, onClose, onLoaded }: Props) {
  const [text, setText] = useState("");

  const handleLoad = () => {
    const patch = parseFromPasted(text);
    onLoaded(patch, text);   // ← 反映方法は従来どおり
    setText("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalHeader></ModalHeader>

      <ModalBody>
        <Text color="neutral.600" mb={2}>
          案件情報をコピー＆ペーストしてください
        </Text>

        <Textarea
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE_TEXT}
        />
      </ModalBody>

      <ModalFooter>
        {/* 左：注意書き / 右：ボタン（元の配置） */}
        <HStack w="full" align="start" justify="space-between" gap={4}>
          <Text
            flex="1"
            minW={0}
            fontSize="xs"
            color="neutral.600"
            whiteSpace="pre-line"
          >
            {CAUTION_TEXT}
          </Text>

          <HStack gap={3}>
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button colorScheme="peacock" onClick={handleLoad} isDisabled={!text.trim()}>
              読み込む
            </Button>
          </HStack>
        </HStack>
      </ModalFooter>
    </Modal>
  );
}
