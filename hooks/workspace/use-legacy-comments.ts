"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommentIdentity, CommentSnapshot } from "@/config/comments";
import { IndexedDbCommentRepository } from "@/lib/comments/repository";
import { createDisposalLease } from "@/lib/admin/runtime-lifetime";
export function useLegacyComments(identity: CommentIdentity, enabled: boolean) {
  const client = useQueryClient(),
    [repository] = useState(() => new IndexedDbCommentRepository()),
    key = [
      "workspace-legacy-comments",
      identity.scope.namespace,
      identity.actor.id,
    ] as const;
  const [lease] = useState(() =>
    createDisposalLease(() => {
      repository.close();
      void client
        .cancelQueries({ queryKey: key })
        .then(() => client.removeQueries({ queryKey: key }));
    }),
  );
  useEffect(lease, [lease]);
  return useQuery<CommentSnapshot | null, Error>({
    queryKey: key,
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      if (signal.aborted) throw new Error("조회가 취소되었습니다.");
      const value = await repository.readExisting(identity);
      if (signal.aborted) throw new Error("조회가 취소되었습니다.");
      return value;
    },
  });
}
