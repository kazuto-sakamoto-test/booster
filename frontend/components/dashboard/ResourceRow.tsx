"use client";

import NextLink from "next/link";
import { Box, HStack, VStack, Text, Badge } from "@yamada-ui/react";

export type ResourceView = {
  id: string;
  name?: string;
  jobType?: string;
  publish?: boolean;
  nearest?: string;
  rateNote?: string;
  startNote?: string;
  tags?: string[];
};

export default function ResourceRow({ resource }: { resource: ResourceView }) {
  const {
    id,
    name,
    jobType,
    publish,
    nearest,
    rateNote,
    startNote,
    tags = [],
  } = resource;

  return (
// 行コンテナ（リンク要素）
<Box
  as={NextLink}
  href={`/resources/${id}`}
  display="block"
  px={{ base: 3, md: 4 }}
  py={3}
  rounded="md"
  // ← ここを追加：リンク既定の青を打ち消して全体の文字色を濃いグレーに
  color="neutral.900"
  // ホバーはそのままグレー
  _hover={{ bg: "neutral.100" }}
  _focusVisible={{ outline: "2px solid", outlineColor: "primary.400" }}
  transition="background-color .15s ease"
>
  <VStack align="stretch" gap={1}>
    <HStack gap={2} wrap="wrap">
      {publish != null && (
        <Badge colorScheme={publish ? "peacock" : "neutral"}>
          {publish ? "公開" : "非公開"}
        </Badge>
      )}
      {/* ↓ ここを修正：colorSchemeを neutral に固定 */}
      {jobType && <Badge variant="subtle" colorScheme="neutral">{jobType}</Badge>}
      {nearest && <Badge variant="outline" colorScheme="neutral">{nearest}</Badge>}
    </HStack>

    <Text fontWeight="bold" fontSize="lg" lineClamp={1}>
      {name || "（無名の候補者）"}
    </Text>

    {(startNote || rateNote) && (
      <Text color="neutral.700" lineClamp={2}>
        {startNote && rateNote ? `${startNote} ・ ${rateNote}` : startNote || rateNote}
      </Text>
    )}

    {!!tags.length && (
      <HStack gap={2} wrap="wrap" mt={1}>
        {/* タグも青が出る場合は colorScheme を neutral に */}
        {tags.map((t) => (
          <Badge key={t} variant="outline" size="sm" colorScheme="neutral">
            {t.toUpperCase()}
          </Badge>
        ))}
      </HStack>
    )}
  </VStack>
  </Box>
  );
}
